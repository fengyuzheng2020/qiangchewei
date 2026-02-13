const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const ACCESS_KEY = "qcw_access_token";
const REFRESH_KEY = "qcw_refresh_token";

let accessToken = localStorage.getItem(ACCESS_KEY) || "";
let refreshToken = localStorage.getItem(REFRESH_KEY) || "";
let refreshing = null;

function saveTokens(access, refresh) {
  accessToken = access || "";
  refreshToken = refresh || "";
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  else localStorage.removeItem(ACCESS_KEY);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

async function rawPost(path, body = {}, token = "") {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const json = await resp.json();
  return { status: resp.status, json };
}

async function tryRefresh() {
  if (!refreshToken) throw new Error("未登录");
  if (!refreshing) {
    refreshing = (async () => {
      const { json } = await rawPost("/api/auth/refresh", { refreshToken });
      if (json.code !== 0) throw new Error(json.msg || "刷新登录失败");
      saveTokens(json.data.accessToken, json.data.refreshToken);
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function apiPost(path, body = {}, auth = true) {
  const { status, json } = await rawPost(path, body, auth ? accessToken : "");
  if (auth && status === 401) {
    await tryRefresh();
    const retry = await rawPost(path, body, accessToken);
    if (retry.json.code !== 0) throw new Error(retry.json.msg || "请求失败");
    return retry.json.data;
  }
  if (json.code !== 0) throw new Error(json.msg || "请求失败");
  return json.data;
}

export function hasAuth() {
  return Boolean(accessToken && refreshToken);
}

export async function sendCode(email) {
  return apiPost("/api/auth/send-code", { email }, false);
}

export async function login(email, code) {
  const data = await apiPost("/api/auth/login", { email, code }, false);
  saveTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout() {
  try {
    if (accessToken) await apiPost("/api/auth/logout", {}, true);
  } finally {
    saveTokens("", "");
  }
}

export async function getGameState() {
  return apiPost("/api/game/state/get", {}, true);
}

export async function syncGame() {
  return apiPost("/api/game/sync", {}, true);
}

export async function actionGame(action, payload = {}) {
  return apiPost("/api/game/action", { action, payload }, true);
}

export async function addFriend(email) {
  return apiPost("/api/social/friend/add", { email }, true);
}

export async function listFriends() {
  return apiPost("/api/social/friend/list", {}, true);
}

export async function getGlobalRanking() {
  return apiPost("/api/social/ranking/global", {}, true);
}

export async function setNickname(nickname) {
  return apiPost("/api/player/nickname/set", { nickname }, true);
}
