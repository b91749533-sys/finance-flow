import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../database';
import { AppError } from './error';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      sessionToken?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication token missing or invalid', 401));
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || '9a2f1c8d3e6b4f7a5c8e9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c') as JwtPayload;
    } catch (err) {
      return next(new AppError('Invalid or expired authentication token', 401));
    }

    // Verify session in database (Session Management)
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      // Invalidate if active in memory/browser but dead in DB
      if (session && session.isActive) {
        await prisma.session.update({
          where: { token },
          data: { isActive: false },
        });
      }
      return next(new AppError('Session expired or deactivated. Please login again.', 401));
    }

    // Attach user information to request
    req.user = {
      id: session.userId,
      email: session.user.email,
      role: session.user.role,
    };
    req.sessionToken = token;

    // Update last active device info
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
    
    // Attempt to match device
    await prisma.device.updateMany({
      where: {
        userId: session.userId,
        deviceName: userAgent.substring(0, 100), // Simple matching
      },
      data: {
        lastActiveAt: new Date(),
      },
    });

    next();
  } catch (err) {
    next(err);
  }
};

export const authorizeAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Access denied. Administrator permissions required.', 403));
  }
  next();
};
