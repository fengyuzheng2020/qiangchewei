import { z } from "zod";
import { fail, ok } from "../utils/response.js";
import { addFriendByEmail, applyGameAction, getGameBundle, getGlobalRanking, listFriends, setPlayerNickname, writeAuditLog } from "../services/playerService.js";
import { checkActionRisk, markInvalidAction } from "../services/riskService.js";

const actionSchema = z.object({
  action: z.string().trim(),
  payload: z.record(z.any()).optional(),
});

const addFriendSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确"),
});
const renameSchema = z.object({
  nickname: z.string().trim().min(1, "昵称不能为空").max(30, "昵称最多30个字符"),
});

function getIp(req) {
  return req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

export async function stateGet(req, res) {
  const userId = req.user.uid;
  const ip = getIp(req);
  try {
    const bundle = await getGameBundle(userId);
    await writeAuditLog({ userId, action: "stateGet", payload: {}, code: 0, msg: "ok", ip });
    return res.json(ok(bundle));
  } catch (err) {
    await writeAuditLog({ userId, action: "stateGet", payload: {}, code: 500, msg: err.message || "error", ip, riskFlag: 1 });
    return res.status(500).json(fail(500, err.message || "server error"));
  }
}

export async function sync(req, res) {
  const userId = req.user.uid;
  const ip = getIp(req);
  try {
    const bundle = await applyGameAction(userId, "sync", {});
    await writeAuditLog({ userId, action: "sync", payload: {}, code: 0, msg: "ok", ip });
    return res.json(ok(bundle));
  } catch (err) {
    await writeAuditLog({ userId, action: "sync", payload: {}, code: 500, msg: err.message || "error", ip, riskFlag: 1 });
    return res.status(500).json(fail(500, err.message || "server error"));
  }
}

export async function action(req, res) {
  const userId = req.user.uid;
  const ip = getIp(req);
  try {
    const parsed = actionSchema.parse(req.body || {});
    await checkActionRisk(userId);
    const bundle = await applyGameAction(userId, parsed.action, parsed.payload || {});
    await writeAuditLog({ userId, action: parsed.action, payload: parsed.payload, code: 0, msg: "ok", ip });
    return res.json(ok(bundle));
  } catch (err) {
    await markInvalidAction(userId);
    await writeAuditLog({ userId, action: "gameAction", payload: req.body || {}, code: 400, msg: err.message || "error", ip, riskFlag: 1 });
    return res.status(400).json(fail(400, err.message || "bad request"));
  }
}

export async function friendAdd(req, res) {
  const userId = req.user.uid;
  const ip = getIp(req);
  try {
    const { email } = addFriendSchema.parse(req.body || {});
    const added = await addFriendByEmail(userId, email);
    const friends = await listFriends(userId);
    await writeAuditLog({ userId, action: "friendAdd", payload: { email }, code: 0, msg: "ok", ip });
    return res.json(ok({ added, friends }));
  } catch (err) {
    await writeAuditLog({ userId, action: "friendAdd", payload: req.body || {}, code: 400, msg: err.message || "error", ip, riskFlag: 1 });
    return res.status(400).json(fail(400, err.message || "add friend failed"));
  }
}

export async function friendList(req, res) {
  const userId = req.user.uid;
  try {
    const friends = await listFriends(userId);
    return res.json(ok({ friends }));
  } catch (err) {
    return res.status(500).json(fail(500, err.message || "server error"));
  }
}

export async function rankingGlobal(req, res) {
  try {
    const ranking = await getGlobalRanking(100);
    return res.json(ok({ ranking }));
  } catch (err) {
    return res.status(500).json(fail(500, err.message || "server error"));
  }
}

export async function nicknameSet(req, res) {
  const userId = req.user.uid;
  const ip = getIp(req);
  try {
    const { nickname } = renameSchema.parse(req.body || {});
    await setPlayerNickname(userId, nickname);
    const bundle = await getGameBundle(userId);
    await writeAuditLog({ userId, action: "nicknameSet", payload: { nickname }, code: 0, msg: "ok", ip });
    return res.json(ok(bundle));
  } catch (err) {
    await writeAuditLog({ userId, action: "nicknameSet", payload: req.body || {}, code: 400, msg: err.message || "error", ip, riskFlag: 1 });
    return res.status(400).json(fail(400, err.message || "昵称修改失败"));
  }
}
