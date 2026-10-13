import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Outgoing mail, through the SMTP account in EMAIL_HOST / EMAIL_PORT /
 * EMAIL_USER / EMAIL_PASS (a Gmail app password in .env.local).
 *
 * The transporter is cached on globalThis for the same reason the database
 * connection is: serverless and dev hot-reload would otherwise open a new
 * SMTP connection pool on every request.
 */

const cache = globalThis as unknown as { __mailer?: Transporter };

export function mailConfigured(): boolean {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function transporter(): Transporter {
  if (cache.__mailer) return cache.__mailer;
  const port = Number(process.env.EMAIL_PORT || 587);
  cache.__mailer = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return cache.__mailer;
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!mailConfigured()) throw new Error('Email is not configured');
  await transporter().sendMail({
    from: `"FoodBox" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });
}
