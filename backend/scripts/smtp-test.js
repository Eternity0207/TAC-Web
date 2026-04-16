/* eslint-disable no-console */
require("dotenv").config();
const nodemailer = require("nodemailer");

function parseBooleanEnv(value) {
  if (value == null || String(value).trim() === "") return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npm run smtp:test -- <recipient@email.com>");
    process.exit(1);
  }

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = parseBooleanEnv(process.env.SMTP_SECURE) ?? port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    requireTLS: !secure,
    tls: {
      rejectUnauthorized: false,
    },
  });

  const smtpSummary = `${process.env.SMTP_HOST}:${port} secure=${secure}`;
  console.log(`Checking SMTP connectivity: ${smtpSummary}`);
  await transporter.verify();
  console.log("SMTP verify passed.");

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || "orders@theawlacompany.com",
    to,
    subject: "TAC SMTP test",
    text: "SMTP test email from TAC backend.",
  });

  console.log("Mail sent.");
  console.log(`Message ID: ${info.messageId}`);
  console.log(`Response: ${info.response}`);
}

main().catch((error) => {
  console.error("SMTP test failed.");
  console.error(error?.message || error);
  process.exit(1);
});
