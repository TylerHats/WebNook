import nodemailer from 'nodemailer';
import { query, queryOne } from '../db/connection';

interface EmailOptions {
  to: string;
  subject: string;
  title: string;
  bodyHtml: string;
  actionUrl?: string;
  actionText?: string;
}

export async function getSmtpSettings() {
  const rows = await query<any>('SELECT key, value FROM system_settings WHERE key LIKE "smtp_%" OR key = "app_name"');
  const settings: Record<string, string> = {
    app_name: 'WebNook',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_secure: 'false'
  };
  rows.forEach(r => settings[r.key] = r.value);
  return settings;
}

export async function sendStyledEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = await getSmtpSettings();
    if (!config.smtp_host) {
      console.log(`[Email Service] SMTP not configured. Suppressing email to ${options.to}: ${options.subject}`);
      return false;
    }

    const port = parseInt(config.smtp_port, 10) || 587;
    const isSecure = config.smtp_secure === 'true' || port === 465;

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: port,
      secure: isSecure,
      auth: config.smtp_user ? {
        user: config.smtp_user,
        pass: config.smtp_pass
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    const appName = config.app_name || 'WebNook';
    const fromAddress = config.smtp_from || config.smtp_user || `noreply@webnook.local`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0c10; color: #e0e0e0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #12131c; border-radius: 12px; border: 1px solid #2a2b3d; overflow: hidden; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .content { padding: 32px 24px; font-size: 15px; line-height: 1.6; color: #d1d5db; }
        .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; }
        .reason-box { background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; color: #fca5a5; margin: 16px 0; }
        .btn { display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; text-align: center; }
        .footer { background-color: #0a0b10; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f202e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="content">
          <div class="title">${options.title}</div>
          ${options.bodyHtml}
          ${options.actionUrl && options.actionText ? `<div style="text-align: center;"><a href="${options.actionUrl}" class="btn">${options.actionText}</a></div>` : ''}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${appName} Platform. Automated System Notification.
        </div>
      </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
      from: `"${appName}" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      html: htmlContent
    });

    console.log(`[Email Service] Email sent successfully to ${options.to}`);
    return true;
  } catch (err: any) {
    console.error(`[Email Service Error] Failed to send email to ${options.to}:`, err.message);
    return false;
  }
}

export async function sendAccountDisabledEmail(email: string, username: string, reason: string): Promise<boolean> {
  return sendStyledEmail({
    to: email,
    subject: `Account Status Notice - ${username}`,
    title: `Your Account Has Been Disabled`,
    bodyHtml: `
      <p>Hello @<strong>${username}</strong>,</p>
      <p>We are writing to notify you that your account on our platform has been temporarily or permanently disabled by an administrator.</p>
      <div class="reason-box">
        <strong>Reason Specified:</strong><br>
        ${reason ? reason : 'Violation of platform community standards or security policy.'}
      </div>
      <p>While your account is disabled, you will be unable to log in, customize your Nook, or interact with other members.</p>
      <p>If you believe this was done in error, please contact your server administrator.</p>
    `
  });
}

export async function sendPasswordResetEmail(email: string, username: string, resetToken: string, baseUrl?: string): Promise<boolean> {
  const resetUrl = baseUrl ? `${baseUrl}/reset-password?token=${resetToken}` : `/reset-password?token=${resetToken}`;

  return sendStyledEmail({
    to: email,
    subject: `Password Reset Request - ${username}`,
    title: `Reset Your Account Password`,
    bodyHtml: `
      <p>Hello @<strong>${username}</strong>,</p>
      <p>A password reset request was initiated for your account. You can reset your password by clicking the button below or using the reset token provided:</p>
      <p style="background: rgba(255,255,255,0.05); padding: 12px; font-family: monospace; border-radius: 6px; font-size: 14px; text-align: center; letter-spacing: 1px;">
        ${resetToken}
      </p>
      <p>This reset link and token will expire in 1 hour.</p>
    `,
    actionUrl: resetUrl,
    actionText: 'Reset Account Password'
  });
}

export async function sendEmailVerificationEmail(email: string, username: string, token: string, baseUrl?: string): Promise<boolean> {
  const verifyUrl = baseUrl ? `${baseUrl}/verify-email?token=${token}` : `/verify-email?token=${token}`;

  return sendStyledEmail({
    to: email,
    subject: `Verify Your Email Address - ${username}`,
    title: `Welcome to WebNook! Verify Your Email`,
    bodyHtml: `
      <p>Hello @<strong>${username}</strong>,</p>
      <p>Thank you for joining our platform! Please confirm your email address to unlock full access to customize and launch your Nook.</p>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 12px; color: #9ca3af; margin: 0; word-break: break-all;">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color: #6366f1; text-decoration: underline;">${verifyUrl}</a>
        </p>
      </div>
    `,
    actionUrl: verifyUrl,
    actionText: 'Verify Email Address'
  });
}
