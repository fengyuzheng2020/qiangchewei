import { z } from "zod";
import { fail, ok } from "../utils/response.js";
import { getPlayerProfile, savePlayerProfile } from "../services/playerService.js";

const saveSchema = z.object({
  nickname: z.string().trim().min(1).max(30).optional(),
  gameData: z.record(z.any()),
});

export async function profileGet(req, res) {
  try {
    const userId = req.user.uid;
    const data = await getPlayerProfile(userId);
    return res.json(ok(data));
  } catch (err) {
    return res.status(500).json(fail(500, err.message || "server error"));
  }
}

export async function profileSave(req, res) {
  try {
    const userId = req.user.uid;
    const payload = saveSchema.parse(req.body || {});
    const data = await savePlayerProfile(userId, payload);
    return res.json(ok(data));
  } catch (err) {
    return res.status(400).json(fail(400, err.message || "bad request"));
  }
}
