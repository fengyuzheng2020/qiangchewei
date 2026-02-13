import { fail } from "../utils/response.js";

export function onlyPost(req, res, next) {
  if (req.path === "/health") return next();
  if (req.method !== "POST") {
    return res.status(405).json(fail(405, "only POST is allowed"));
  }
  return next();
}
