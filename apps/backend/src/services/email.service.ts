import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../config/logger';

// ─── Transporter Singleton ────────────────────────────────────────────────────

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

// ─── Email Helpers ────────────────────────────────────────────────────────────

const FROM_ADDRESS = `"GETIDFIX" <${process.env.SMTP_USER || 'noreply@getidfix.com'}>`;

// ─── Password Reset Email ─────────────────────────────────────────────────────

/**
 * Sends a password reset email with a time-limited reset link.
 *
 * @param to         - Recipient email address
 * @param firstName  - Recipient's first name for personalisation
 * @param resetUrl   - Full reset URL to embed in the email
 */
export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string
): Promise<void> {
  const resetLink = resetUrl;

  try {
    await getTransporter().sendMail({
      from: FROM_ADDRESS,
      to,
      subject: 'Reset your GETIDFIX password',
      html: `
        <div style="font-family: Inter, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0F4C81;">Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset the password for your GETIDFIX account.</p>
          <p>Click the button below to set a new password. This link is valid for <strong>60 minutes</strong>.</p>
          <a
            href="${resetLink}"
            style="
              display: inline-block;
              background-color: #0F4C81;
              color: #ffffff;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin: 16px 0;
            "
          >
            Reset Password
          </a>
          <p style="color: #718096; font-size: 14px;">
            If you did not request a password reset, you can safely ignore this email.
            Your password will not be changed.
          </p>
          <p style="color: #718096; font-size: 14px;">
            If the button above doesn't work, copy and paste this link into your browser:<br />
            <a href="${resetLink}" style="color: #0F4C81;">${resetLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
          <p style="color: #718096; font-size: 12px;">
            &copy; ${new Date().getFullYear()} GETIDFIX. All rights reserved.
          </p>
        </div>
      `,
      text: `Hi ${firstName},\n\nWe received a request to reset your GETIDFIX password.\n\nReset your password here (valid for 60 minutes):\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\n© ${new Date().getFullYear()} GETIDFIX`,
    });

    logger.info('[Email] Password reset email sent', { to });
  } catch (err) {
    logger.error('[Email] Failed to send password reset email', {
      to,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Account Lockout Email ────────────────────────────────────────────────────

/**
 * Sends an account lockout notification email.
 *
 * @param to          - Recipient email address
 * @param firstName   - Recipient's first name for personalisation
 * @param lockedUntil - Date when the lockout expires
 */
export async function sendAccountLockoutEmail(
  to: string,
  firstName: string,
  lockedUntil: Date
): Promise<void> {
  const unlockTime = lockedUntil.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  });

  try {
    await getTransporter().sendMail({
      from: FROM_ADDRESS,
      to,
      subject: 'Your GETIDFIX account has been temporarily locked',
      html: `
        <div style="font-family: Inter, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #E53E3E;">Account Temporarily Locked</h2>
          <p>Hi ${firstName},</p>
          <p>
            Your GETIDFIX account has been temporarily locked due to
            <strong>5 consecutive failed login attempts</strong>.
          </p>
          <p>
            Your account will be automatically unlocked at <strong>${unlockTime}</strong> (WAT).
          </p>
          <p>
            If you did not attempt to log in, your account may be under attack.
            Please contact our support team immediately.
          </p>
          <p style="color: #718096; font-size: 14px;">
            You can also reset your password to regain access sooner.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
          <p style="color: #718096; font-size: 12px;">
            &copy; ${new Date().getFullYear()} GETIDFIX. All rights reserved.
          </p>
        </div>
      `,
      text: `Hi ${firstName},\n\nYour GETIDFIX account has been temporarily locked due to 5 consecutive failed login attempts.\n\nYour account will be automatically unlocked at ${unlockTime} (WAT).\n\nIf you did not attempt to log in, please contact support immediately.\n\n© ${new Date().getFullYear()} GETIDFIX`,
    });

    logger.info('[Email] Account lockout email sent', { to });
  } catch (err) {
    logger.error('[Email] Failed to send account lockout email', {
      to,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
