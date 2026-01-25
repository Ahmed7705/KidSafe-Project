import nodemailer from "nodemailer";

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }
  const host = process.env.SMTP_HOST;
  if (!host) {
    return null;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  });
  return cachedTransporter;
}

export async function sendAlertEmail({ to, subject, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    return false;
  }
  const from = process.env.ALERT_EMAIL_FROM || "alerts@kidsafe.local";
  await transporter.sendMail({ from, to, subject, text });
  return true;
}
