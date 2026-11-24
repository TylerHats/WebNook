import nodemailer from 'nodemailer';
import { query } from '../db/connection';
import { escapeHtml, getEffectiveBaseUrl, isSafeUrl } from '../utils/security';

interface EmailOptions {
  to: string;
  subject: string;
  title: string;
  bodyHtml: string;
  actionUrl?: string;
  actionText?: string;
  safetyUrl?: string;
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
    smtp_secure: 'false',
    smtp_allow_self_signed: 'false'
  };
  rows.forEach(r => (settings[r.key] = r.value));
  return settings;
}

async function resolveEmailUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/')) {
    const baseUrl = await getEffectiveBaseUrl();
    return `${baseUrl}${trimmed}`;
  }
  return isSafeUrl(trimmed, false, false) ? trimmed : undefined;
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
      auth: config.smtp_user
        ? {
            user: config.smtp_user,
            pass: config.smtp_pass
          }
        : undefined,
      tls: {
        rejectUnauthorized: config.smtp_allow_self_signed !== 'true'
      }
    });

    const appName = escapeHtml(config.app_name || 'WebNook');
    const safeTitle = escapeHtml(options.title);
    const safeActionText = options.actionText ? escapeHtml(options.actionText) : '';
    const resolvedActionUrl = await resolveEmailUrl(options.actionUrl);
    const resolvedSafetyUrl = await resolveEmailUrl(options.safetyUrl);
    const fromAddress = config.smtp_from || config.smtp_user || `noreply@webnook.local`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safeTitle}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #0b0c10; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        a { color: #818cf8; text-decoration: underline; }
      </style>
    </head>
    <body style="margin: 0; padding: 20px 0; background-color: #0b0c10; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0c10; width: 100%;">
        <tr>
          <td align="center" style="padding: 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #151728; border-radius: 12px; border: 1px solid #2d314e; overflow: hidden;">
              <!-- Header Banner -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 28px 20px; color: #ffffff;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">${appName}</h1>
                </td>
              </tr>
              <!-- Content Body -->
              <tr>
                <td style="padding: 32px 28px; background-color: #151728; color: #f8fafc; font-size: 15px; line-height: 1.6;">
                  <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">${safeTitle}</h2>
                  <div style="color: #e2e8f0; font-size: 15px; line-height: 1.6;">
                    ${options.bodyHtml}
                  </div>
                  
                  ${resolvedActionUrl && safeActionText ? `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 20px 0;">
                      <tr>
                        <td align="center">
                          <a href="${escapeHtml(resolvedActionUrl)}" target="_blank" rel="noopener noreferrer" style="background-color: #6366f1; color: #ffffff !important; display: inline-block; padding: 14px 30px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; text-align: center; border: 1px solid #4f46e5; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                            <span style="color: #ffffff !important; text-decoration: none; font-weight: 700;">${safeActionText}</span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  ` : ''}

                  ${resolvedSafetyUrl ? `
                    <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #2d314e;">
                      <p style="font-size: 13px; color: #94a3b8; margin: 0; word-break: break-all; line-height: 1.5;">
                        If the button above does not work, copy and paste this link into your browser:<br>
                        <a href="${escapeHtml(resolvedSafetyUrl)}" target="_blank" rel="noopener noreferrer" style="color: #818cf8 !important; text-decoration: underline; font-weight: 600;"><span style="color: #818cf8 !important;">${escapeHtml(resolvedSafetyUrl)}</span></a>
                      </p>
                    </div>
                  ` : ''}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="background-color: #0d0e17; padding: 18px; font-size: 12px; color: #94a3b8; border-top: 1px solid #2d314e;">
                  &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await transporter.sendMail({
      from: `"${config.app_name || 'WebNook'}" <${fromAddress}>`,
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
  const safeUsername = escapeHtml(username);
  const safeReason = escapeHtml(reason || 'Violation of platform community standards or security policy.');
  return sendStyledEmail({
    to: email,
    subject: `Account Status Notice - ${username}`,
    title: `Your Account Has Been Disabled`,
    bodyHtml: `
      <p>Hello @<strong>${safeUsername}</strong>,</p>
      <p>We are writing to notify you that your account on our platform has been temporarily or permanently disabled by an administrator.</p>
      <div class="reason-box">
        <strong>Reason Specified:</strong><br>
        ${safeReason}
      </div>
      <p>While your account is disabled, you will be unable to log in, customize your Nook, or interact with other members.</p>
      <p>If you believe this was done in error, please contact your server administrator.</p>
    `
  });
}

export async function sendPasswordResetEmail(email: string, username: string, resetToken: string, baseUrl?: string): Promise<boolean> {
  const resolvedBase = baseUrl || (await getEffectiveBaseUrl());
  const cleanBase = resolvedBase.replace(/\/+$/, '');
  const resetUrl = `${cleanBase}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const safeUsername = escapeHtml(username);

  return sendStyledEmail({
    to: email,
    subject: `Password Reset Request - ${username}`,
    title: `Reset Your Account Password`,
    bodyHtml: `
      <p>Hello @<strong>${safeUsername}</strong>,</p>
      <p>A password reset request was initiated for your account. Click the button below to choose a new password:</p>
      <p>This reset link will expire in 1 hour. If you did not request a password reset, you may safely ignore this email.</p>
    `,
    actionUrl: resetUrl,
    actionText: 'Reset Account Password',
    safetyUrl: resetUrl
  });
}

export async function sendEmailVerificationEmail(email: string, username: string, token: string, baseUrl?: string): Promise<boolean> {
  const resolvedBase = baseUrl || (await getEffectiveBaseUrl());
  const cleanBase = resolvedBase.replace(/\/+$/, '');
  const verifyUrl = `${cleanBase}/verify-email?token=${encodeURIComponent(token)}`;
  const safeUsername = escapeHtml(username);
  const config = await getSmtpSettings();
  const safeAppName = escapeHtml(config.app_name || 'WebNook');

  return sendStyledEmail({
    to: email,
    subject: `Verify Your Email Address - ${username}`,
    title: `Welcome to ${safeAppName}! Verify Your Email`,
    bodyHtml: `
      <p>Hello @<strong>${safeUsername}</strong>,</p>
      <p>Thank you for joining! Please confirm your email address to unlock full access to customize and launch your Nook.</p>
    `,
    actionUrl: verifyUrl,
    actionText: 'Verify Email Address',
    safetyUrl: verifyUrl
  });
}

export async function sendIntegrationErrorEmail(integrationName: string, errorDetails: string): Promise<boolean> {
  try {
    const adminRows = await query<any>('SELECT email, username FROM users WHERE role = "admin" AND is_disabled = 0');
    if (!adminRows || adminRows.length === 0) return false;

    const safeIntegration = escapeHtml(integrationName);
    const safeDetails = escapeHtml(errorDetails || 'API Key failed authentication or encountered repeated network/rate-limit errors.');

    let allSent = true;
    for (const admin of adminRows) {
      const sent = await sendStyledEmail({
        to: admin.email,
        subject: `[SYSTEM ALERT] Integration API Error - ${integrationName}`,
        title: `Integration Health Alert: ${integrationName} API Error`,
        bodyHtml: `
          <p>Hello Administrator @<strong>${escapeHtml(admin.username)}</strong>,</p>
          <p>Automated health monitoring detected multiple consecutive failures for the <strong>${safeIntegration}</strong> integration.</p>
          <div class="reason-box">
            <strong>Error Details:</strong><br>
            ${safeDetails}
          </div>
          <p>The status of this integration has automatically been set to <span style="color: #ef4444; font-weight: bold;">Broken / Error</span>.</p>
          <p>Please log in to your Admin Dashboard → <strong>Integrations & API Keys</strong> tab to re-test or update your credentials.</p>
        `
      });
      if (!sent) allSent = false;
    }

    return allSent;
  } catch (err) {
    console.error('[Email Service Error] Failed to send integration alert emails:', err);
    return false;
  }
}
