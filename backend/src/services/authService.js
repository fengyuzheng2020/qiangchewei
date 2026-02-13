import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { pool } from "./db.js";
import { delCache, getCache, incrCache, setCache } from "./store.js";
import { generateCode, sendVerifyCodeEmail } from "./mailService.js";

const emailSchema = z.string().trim().email("邮箱格式不正确");

function accessTokenFor(userId, email, sid) {
  return jwt.sign({ uid: userId, email, sid, type: "access" }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function refreshTokenFor(userId, email, sid) {
  return jwt.sign({ uid: userId, email, sid, type: "refresh" }, env.refreshJwtSecret, { expiresIn: env.refreshExpiresIn });
}

export async function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);
  if (payload.type !== "access") throw new Error("invalid token type");

  const [rows] = await pool.query(
    "SELECT id FROM user_sessions WHERE id = ? AND user_id = ? AND access_token = ? AND revoked = 0 AND expired_at > NOW() LIMIT 1",
    [payload.sid, payload.uid, token]
  );
  if (rows.length === 0) throw new Error("session invalid");
  return payload;
}

export async function sendLoginCode(email, ip) {
  const normalizedEmail = emailSchema.parse(email).toLowerCase();

  const ipCount = await incrCache(`email:ip:${ip}`, 60);
  if (ipCount > 30) throw new Error("请求过于频繁，请稍后再试");

  const emailCount = await incrCache(`email:target:${normalizedEmail}`, 60);
  if (emailCount > 6) throw new Error("该邮箱请求过于频繁，请稍后再试");

  const code = generateCode();
  const result = await sendVerifyCodeEmail(normalizedEmail, code);
  if (!result.ok) throw new Error("邮件发送失败");

  await setCache(`email:code:${normalizedEmail}`, code, 300);
  return { expireSeconds: 300 };
}

async function getOrCreateUser(email) {
  const [rows] = await pool.query("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);
  if (rows.length > 0) return rows[0];

  const [res] = await pool.query("INSERT INTO users(email) VALUES(?)", [email]);
  return { id: res.insertId, email };
}

export async function loginWithCode(email, code) {
  const normalizedEmail = emailSchema.parse(email).toLowerCase();
  const stored = await getCache(`email:code:${normalizedEmail}`);
  if (!stored) throw new Error("验证码已过期，请重新获取");
  if (String(stored) !== String(code)) throw new Error("验证码错误");
  await delCache(`email:code:${normalizedEmail}`);

  const user = await getOrCreateUser(normalizedEmail);
  const [insertRes] = await pool.query(
    `INSERT INTO user_sessions(user_id, access_token, refresh_token, expired_at, refresh_expired_at, revoked)
     VALUES(?, '', '', DATE_ADD(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 14 DAY), 0)`,
    [user.id]
  );

  const sid = insertRes.insertId;
  const accessToken = accessTokenFor(user.id, user.email, sid);
  const refreshToken = refreshTokenFor(user.id, user.email, sid);

  await pool.query(
    `UPDATE user_sessions
       SET access_token = ?, refresh_token = ?, expired_at = DATE_ADD(NOW(), INTERVAL 2 HOUR), refresh_expired_at = DATE_ADD(NOW(), INTERVAL 14 DAY)
     WHERE id = ?`,
    [accessToken, refreshToken, sid]
  );

  return { userId: user.id, email: user.email, accessToken, refreshToken };
}

export async function refreshWithToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.refreshJwtSecret);
  } catch {
    throw new Error("refresh token 无效");
  }
  if (payload.type !== "refresh") throw new Error("refresh token 无效");

  const [rows] = await pool.query(
    "SELECT id, user_id AS userId FROM user_sessions WHERE id = ? AND user_id = ? AND refresh_token = ? AND revoked = 0 AND refresh_expired_at > NOW() LIMIT 1",
    [payload.sid, payload.uid, refreshToken]
  );
  if (rows.length === 0) throw new Error("refresh token 已失效");

  const sid = rows[0].id;
  const accessToken = accessTokenFor(payload.uid, payload.email, sid);
  const nextRefreshToken = refreshTokenFor(payload.uid, payload.email, sid);

  await pool.query(
    `UPDATE user_sessions
       SET access_token = ?, refresh_token = ?, expired_at = DATE_ADD(NOW(), INTERVAL 2 HOUR), refresh_expired_at = DATE_ADD(NOW(), INTERVAL 14 DAY)
     WHERE id = ?`,
    [accessToken, nextRefreshToken, sid]
  );

  return { accessToken, refreshToken: nextRefreshToken };
}

export async function logoutWithAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    await pool.query("UPDATE user_sessions SET revoked = 1 WHERE id = ? AND user_id = ?", [payload.sid, payload.uid]);
  } catch {
    return;
  }
}
