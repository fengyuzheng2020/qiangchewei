import { fail } from "../utils/response.js";
import { verifyAccessToken } from "../services/authService.js";

export async function authRequired(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || req.body?.accessToken;
  if (!token) return res.status(401).json(fail(401, "missing access token"));

  try {
    const payload = await verifyAccessToken(token);
    req.user = payload;
    req.accessToken = token;
    return next();
  } catch {
    return res.status(401).json(fail(401, "invalid access token"));
  }
}
