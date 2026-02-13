import { incrCache, setCache, getCache } from "./store.js";

export async function hitRouteRate(ip, route) {
  const count = await incrCache(`rl:ip:${ip}:${route}`, 10);
  if (count > 80) {
    throw new Error("请求频率过高，请稍后再试");
  }
}

export async function checkActionRisk(userId) {
  const blocked = await getCache(`risk:block:${userId}`);
  if (blocked) {
    throw new Error("账号操作异常，已临时限制，请稍后再试");
  }
  const freq = await incrCache(`risk:action:${userId}`, 10);
  if (freq > 40) {
    await setCache(`risk:block:${userId}`, "1", 60);
    throw new Error("操作过于频繁，已触发风控");
  }
}

export async function markInvalidAction(userId) {
  const bad = await incrCache(`risk:invalid:${userId}`, 60);
  if (bad > 12) {
    await setCache(`risk:block:${userId}`, "1", 180);
  }
}
