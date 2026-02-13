import { z } from "zod";
import { fail, ok } from "../utils/response.js";
import { loginWithCode, logoutWithAccessToken, refreshWithToken, sendLoginCode } from "../services/authService.js";

const sendSchema = z.object({ email: z.string().trim() });
const loginSchema = z.object({ email: z.string().trim(), code: z.string().trim() });
const refreshSchema = z.object({ refreshToken: z.string().trim() });

export async function sendCode(req, res) {
  try {
    const { email } = sendSchema.parse(req.body || {});
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const data = await sendLoginCode(email, ip);
    return res.json(ok(data));
  } catch (err) {
    return res.status(400).json(fail(400, err.message || "bad request"));
  }
}

export async function login(req, res) {
  try {
    const { email, code } = loginSchema.parse(req.body || {});
    const data = await loginWithCode(email, code);
    return res.json(ok(data));
  } catch (err) {
    return res.status(400).json(fail(400, err.message || "login failed"));
  }
}

export async function refresh(req, res) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body || {});
    const data = await refreshWithToken(refreshToken);
    return res.json(ok(data));
  } catch (err) {
    return res.status(401).json(fail(401, err.message || "refresh failed"));
  }
}

export async function logout(req, res) {
  try {
    await logoutWithAccessToken(req.accessToken);
    return res.json(ok({}));
  } catch (err) {
    return res.status(400).json(fail(400, err.message || "logout failed"));
  }
}
