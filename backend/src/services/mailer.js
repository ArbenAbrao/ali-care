const nodemailer = require("nodemailer");
const env = require("../config/env");
async function sendOtp(to, otp) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD)
    throw Object.assign(new Error("SMTP is not configured"), { status: 503 });
  const t = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: String(env.SMTP_SECURE) === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  await t.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject: "ALI-CARE sign-in verification code",
    text: `Your ALI-CARE verification code is ${otp}. It expires in ${env.SUPERADMIN_OTP_MINUTES || 5} minutes. If you did not request this, ignore this email.`,
  });
}
module.exports = { sendOtp };
