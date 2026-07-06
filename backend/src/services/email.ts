export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<boolean> => {
  try {
    console.log('\n======================================================');
    console.log(`[EMAIL SENT] To: ${to}`);
    console.log(`[EMAIL SENT] Subject: ${subject}`);
    console.log(`[EMAIL SENT] Body:\n${text}`);
    console.log('======================================================\n');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${token}&email=${email}`;
  const subject = 'Verify your email address - Finance Platform';
  const text = `Welcome! Please verify your email by clicking the following link: ${url}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
      <h2 style="color: #2563EB;">Welcome to the Finance Management Platform!</h2>
      <p>Thank you for signing up. Please click the button below to verify your email address and activate your account:</p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0;">Verify Email</a>
      <p style="font-size: 12px; color: #64748B;">If the button above does not work, copy and paste this link in your browser: ${url}</p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}&email=${email}`;
  const subject = 'Reset your password - Finance Platform';
  const text = `You requested a password reset. Please use the following link: ${url}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
      <h2 style="color: #2563EB;">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0;">Reset Password</a>
      <p style="font-size: 12px; color: #64748B;">If you did not request this, you can ignore this email. The link will expire in 1 hour.</p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
};
