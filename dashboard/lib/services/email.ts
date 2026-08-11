import nodemailer from 'nodemailer';
import { safeWarn, safeError } from '@/lib/logger';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host || process.env.NODE_ENV === 'development' && !host) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

/**
 *
 * @param input
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    safeWarn('[Email] SMTP no configurado, email no enviado:', input.to);
    return false;
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@aicoremed.com';
    await transporter.sendMail({
      from: `"AicoreMed" <${from}>`,
      to: input.to,
      subject: input.subject,
      text: input.text || input.html.replace(/<[^>]*>/g, ''),
      html: input.html,
    });
    return true;
  } catch (e) {
    safeError('[Email] Error enviando email:', e instanceof Error ? e.message : e);
    return false;
  }
}
