import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { prisma } from '../database';
import { AppError } from '../middlewares/error';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { logAuditAction } from '../middlewares/audit';

const JWT_SECRET = process.env.JWT_SECRET || '9a2f1c8d3e6b4f7a5c8e9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c9a2f1c8d3e6b4f7a5c8e9d0a1b2c3d4e';

// Helper to generate access and refresh tokens
const generateTokens = async (userId: string, email: string, role: string, req: Request) => {
  const accessToken = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Store session in DB
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId,
      token: accessToken,
      expiresAt,
      userAgent,
      ipAddress,
      isActive: true,
    },
  });

  // Track device
  const deviceName = userAgent.substring(0, 100);
  const deviceType = userAgent.includes('Mobile') ? 'mobile' : userAgent.includes('Tablet') ? 'tablet' : 'desktop';
  
  await prisma.device.upsert({
    where: {
      userId_deviceId: {
        userId,
        deviceId: deviceName, // Simple fingerprint
      },
    },
    update: {
      lastActiveAt: new Date(),
    },
    create: {
      userId,
      deviceId: deviceName,
      deviceName,
      type: deviceType,
      isTrusted: true,
    },
  });

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return next(new AppError('Please provide email, password, and name', 400));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2, 15);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        verificationToken,
        isVerified: true, // Auto-verify in development mode for seamless testing
        settings: {
          create: {
            theme: 'light',
            currency: 'MAD',
          },
        },
      },
    });

    // Send email (mock)
    await sendVerificationEmail(email, verificationToken);
    await logAuditAction(user.id, 'USER_REGISTER', req, { email });

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Please check your email to verify your account.',
      verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${verificationToken}&email=${email}`,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, code } = req.body;
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { settings: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await logAuditAction(null, 'USER_LOGIN_FAILED', req, { email, reason: 'Invalid credentials' });
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isVerified) {
      return next(new AppError('Please verify your email before logging in', 403));
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!code) {
        return res.status(200).json({
          status: 'success',
          requires2FA: true,
          message: 'Two-factor authentication code required.',
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret || '',
        encoding: 'base32',
        token: code,
      });

      if (!verified) {
        await logAuditAction(user.id, 'USER_LOGIN_2FA_FAILED', req);
        return next(new AppError('Invalid 2FA code', 401));
      }
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.email, user.role, req);
    await logAuditAction(user.id, 'USER_LOGIN', req);

    // Set refresh token in secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.status(200).json({
      status: 'success',
      data: {
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          twoFactorEnabled: user.twoFactorEnabled,
          settings: user.settings,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return next(new AppError('Invalid verification link', 400));
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email as string,
        verificationToken: token as string,
      },
    });

    if (!user) {
      return next(new AppError('Invalid or expired verification token', 400));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    await logAuditAction(user.id, 'USER_EMAIL_VERIFIED', req);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (err) {
    next(err);
  }
};

export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new AppError('Please provide email address', 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return 200 to prevent user enumeration attacks
      return res.status(200).json({
        status: 'success',
        message: 'If the email exists, a password reset link has been sent.',
      });
    }

    const resetToken = Math.random().toString(36).substring(2, 15);
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    await sendPasswordResetEmail(email, resetToken);
    await logAuditAction(user.id, 'USER_RESET_PASSWORD_REQUEST', req);

    res.status(200).json({
      status: 'success',
      message: 'If the email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return next(new AppError('Email, token, and password are required', 400));
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    await logAuditAction(user.id, 'USER_RESET_PASSWORD_SUCCESS', req);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};

export const setup2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    // Generate TOTP Secret
    const secret = speakeasy.generateSecret({
      name: `FinancePlatform:${req.user!.email}`,
    });

    // Save temporary secret to user database
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    // Generate QR code data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    res.status(200).json({
      status: 'success',
      data: {
        secret: secret.base32,
        qrCodeUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { token, enable } = req.body; // enable is boolean

    if (!token) {
      return next(new AppError('Verification token is required', 400));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return next(new AppError('2FA has not been set up yet', 400));
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      return next(new AppError('Invalid verification token', 400));
    }

    // Toggle 2FA status in DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: enable,
      },
    });

    await logAuditAction(userId, enable ? 'USER_2FA_ENABLED' : 'USER_2FA_DISABLED', req);

    res.status(200).json({
      status: 'success',
      message: enable ? 'Two-factor authentication enabled successfully.' : 'Two-factor authentication disabled successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { sessions, devices },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.sessionToken!;
    
    await prisma.session.update({
      where: { token },
      data: { isActive: false },
    });

    await logAuditAction(req.user!.id, 'USER_LOGOUT', req);

    res.clearCookie('refreshToken');
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const logoutAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    await prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    });


    await logAuditAction(userId, 'USER_LOGOUT_ALL', req);

    res.clearCookie('refreshToken');
    res.status(200).json({
      status: 'success',
      message: 'Logged out from all sessions and devices successfully.',
    });
  } catch (err) {
    next(err);
  }
};
