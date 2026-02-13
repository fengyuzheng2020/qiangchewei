import { fail } from "../utils/response.js";
import { hitRouteRate } from "../services/riskService.js";

export async function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const route = req.path;

  try {
    await hitRouteRate(ip, route);
    return next();
  } catch (err) {
    return res.status(429).json(fail(429, err.message || "too many requests"));
  }
}
