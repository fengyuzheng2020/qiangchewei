import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function ensureTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: {
      user: env.mail.user,
      pass: env.mail.pass,
    },
  });
  return transporter;
}

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerifyCodeEmail(email, code) {
  if (!env.mail.enabled) {
    console.log(`[mail-mock] email=${email}, code=${code}`);
    return { ok: true, provider: "mock" };
  }

  const mailer = ensureTransporter();
  await mailer.sendMail({
    from: env.mail.from,
    to: email,
    subject: "抢车位 登录验证码",
    text: `你的登录验证码是：${code}，5分钟内有效。`,
    html: `<div style=\"font-family:Arial,sans-serif;line-height:1.6\"><h3>抢车位 登录验证码</h3><p>你的验证码是：<b style=\"font-size:22px\">${code}</b></p><p>5分钟内有效，请勿泄露给他人。</p></div>`,
  });

  return { ok: true, provider: "qq-mail" };
}
