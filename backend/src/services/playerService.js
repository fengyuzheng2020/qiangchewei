import { pool } from "./db.js";
import { applyAction, defaultGameState, settleState } from "./gameEngine.js";

function parseGameData(v) {
  if (!v) return defaultGameState();
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return defaultGameState();
  }
}

export async function getPlayerProfile(userId) {
  const [rows] = await pool.query(
    "SELECT user_id AS userId, nickname, game_data AS gameData, updated_at AS updatedAt FROM player_profiles WHERE user_id = ? LIMIT 1",
    [userId]
  );

  if (rows.length === 0) {
    const initial = defaultGameState();
    await pool.query("INSERT INTO player_profiles(user_id, nickname, game_data) VALUES(?, ?, ?)", [userId, `玩家${userId}`, JSON.stringify(initial)]);
    return { userId, nickname: `玩家${userId}`, gameData: initial, updatedAt: new Date() };
  }

  return {
    userId: rows[0].userId,
    nickname: rows[0].nickname,
    gameData: parseGameData(rows[0].gameData),
    updatedAt: rows[0].updatedAt,
  };
}

export async function savePlayerProfile(userId, payload) {
  const nickname = payload.nickname || null;
  const gameData = payload.gameData || defaultGameState();
  await pool.query(
    `INSERT INTO player_profiles(user_id, nickname, game_data)
     VALUES(?, COALESCE(?, CONCAT('玩家', ?)), ?)
     ON DUPLICATE KEY UPDATE
      nickname = COALESCE(VALUES(nickname), nickname),
      game_data = VALUES(game_data),
      updated_at = NOW()`,
    [userId, nickname, userId, JSON.stringify(gameData)]
  );
  return getPlayerProfile(userId);
}

export async function listFriends(userId) {
  const [rows] = await pool.query(
    `SELECT u.id AS userId, u.email, COALESCE(pp.nickname, CONCAT('玩家', u.id)) AS nickname,
            CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pp.game_data, '$.slots')), '2') AS UNSIGNED) AS slots
       FROM friendships f
       JOIN users u ON u.id = f.friend_user_id
  LEFT JOIN player_profiles pp ON pp.user_id = u.id
      WHERE f.user_id = ?
      ORDER BY u.id ASC`,
    [userId]
  );
  return rows;
}

export async function addFriendByEmail(userId, email) {
  const normalized = String(email || "").trim().toLowerCase();
  const [rows] = await pool.query("SELECT id, email FROM users WHERE email = ? LIMIT 1", [normalized]);
  if (rows.length === 0) throw new Error("该邮箱用户不存在");
  const friend = rows[0];
  if (Number(friend.id) === Number(userId)) throw new Error("不能添加自己为好友");

  await pool.query(
    `INSERT INTO friendships(user_id, friend_user_id)
     VALUES(?, ?)
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [userId, friend.id]
  );

  await pool.query(
    `INSERT INTO friendships(user_id, friend_user_id)
     VALUES(?, ?)
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [friend.id, userId]
  );

  return friend;
}

async function buildFriendLots(userId, friends) {
  if (!friends.length) return {};

  const friendIds = friends.map((f) => f.userId);
  const placeholders = friendIds.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT fp.friend_user_id AS friendUserId, fp.owner_user_id AS ownerUserId, fp.car_uid AS carUid,
            COALESCE(pp.nickname, CONCAT('玩家', fp.owner_user_id)) AS ownerNickname
       FROM friend_parking fp
  LEFT JOIN player_profiles pp ON pp.user_id = fp.owner_user_id
      WHERE fp.friend_user_id IN (${placeholders})
      ORDER BY fp.started_at ASC`,
    friendIds
  );

  const group = new Map();
  for (const row of rows) {
    if (!group.has(row.friendUserId)) group.set(row.friendUserId, []);
    group.get(row.friendUserId).push(row);
  }

  const lots = {};
  for (const friend of friends) {
    const slots = Array.from({ length: friend.slots || 2 }).map((_, i) => ({
      type: "empty",
      slotId: `${friend.userId}-${i}`,
    }));

    const occupied = group.get(friend.userId) || [];
    occupied.slice(0, slots.length).forEach((r, i) => {
      slots[i] = {
        type: r.ownerUserId === userId ? "player" : "friendCar",
        slotId: `${friend.userId}-${i}`,
        ownerUserId: r.ownerUserId,
        ownerNickname: r.ownerNickname,
        carUid: r.carUid,
      };
    });

    lots[String(friend.userId)] = slots;
  }

  return lots;
}

export async function getGlobalRanking(limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit || 50)));
  const [rows] = await pool.query(
    `SELECT u.id AS userId, u.email, COALESCE(pp.nickname, CONCAT('玩家', u.id)) AS nickname, pp.game_data AS gameData
       FROM users u
  LEFT JOIN player_profiles pp ON pp.user_id = u.id
      ORDER BY u.id ASC
      LIMIT ${safeLimit}`
  );

  const items = rows.map((row) => {
    const game = parseGameData(row.gameData);
    const score = Math.floor((game.totalEarned || 0) + (game.cash || 0) + (game.level || 1) * 100000);
    return {
      userId: row.userId,
      nickname: row.nickname,
      email: row.email,
      level: game.level || 1,
      totalEarned: Math.floor(game.totalEarned || 0),
      cash: Math.floor(game.cash || 0),
      score,
    };
  });

  items.sort((a, b) => b.score - a.score);
  return items;
}

export async function getGameBundle(userId) {
  const profile = await getPlayerProfile(userId);
  const settled = settleState(profile.gameData || defaultGameState());

  if (JSON.stringify(settled) !== JSON.stringify(profile.gameData || {})) {
    await savePlayerProfile(userId, { gameData: settled });
  }

  const friends = await listFriends(userId);
  const friendLots = await buildFriendLots(userId, friends);
  const globalRanking = await getGlobalRanking(50);

  return { state: settled, me: { userId: profile.userId, nickname: profile.nickname }, friends, friendLots, globalRanking };
}

export async function setPlayerNickname(userId, nickname) {
  const clean = String(nickname || "").trim();
  if (!clean) throw new Error("昵称不能为空");

  const [rows] = await pool.query("SELECT user_id AS userId, game_data AS gameData FROM player_profiles WHERE user_id = ? LIMIT 1", [userId]);
  if (rows.length === 0) {
    await pool.query("INSERT INTO player_profiles(user_id, nickname, game_data) VALUES(?, ?, ?)", [userId, clean, JSON.stringify(defaultGameState())]);
    return { userId, nickname: clean };
  }

  await pool.query("UPDATE player_profiles SET nickname = ?, updated_at = NOW() WHERE user_id = ?", [clean, userId]);
  return { userId, nickname: clean };
}

async function handleParkFriendAction(userId, state, payload) {
  const friendUserId = Number(payload.friendUserId || 0);
  const carUid = String(payload.carUid || "");

  if (!friendUserId || !carUid) throw new Error("参数错误");

  const [friendRows] = await pool.query(
    "SELECT 1 FROM friendships WHERE user_id = ? AND friend_user_id = ? LIMIT 1",
    [userId, friendUserId]
  );
  if (friendRows.length === 0) throw new Error("该用户不是你的好友");

  const [friendProfileRows] = await pool.query(
    "SELECT game_data FROM player_profiles WHERE user_id = ? LIMIT 1",
    [friendUserId]
  );
  const friendState = friendProfileRows.length ? parseGameData(friendProfileRows[0].game_data) : defaultGameState();
  const friendSlots = Number(friendState.slots || 2);

  const [countRows] = await pool.query(
    "SELECT COUNT(*) AS c FROM friend_parking WHERE friend_user_id = ?",
    [friendUserId]
  );
  if (Number(countRows[0].c) >= friendSlots) throw new Error("好友车位已满");

  await pool.query(
    `INSERT INTO friend_parking(friend_user_id, owner_user_id, car_uid)
     VALUES(?, ?, ?)
     ON DUPLICATE KEY UPDATE friend_user_id = VALUES(friend_user_id), started_at = NOW()`,
    [friendUserId, userId, carUid]
  );

  return applyAction(state, "parkFriend", { carUid, friendUserId });
}

async function handlePullOutAction(userId, state, payload) {
  const carUid = String(payload.carUid || "");
  if (!carUid) throw new Error("参数错误");

  await pool.query("DELETE FROM friend_parking WHERE owner_user_id = ? AND car_uid = ?", [userId, carUid]);
  return applyAction(state, "pullOut", { carUid });
}

export async function applyGameAction(userId, action, payload) {
  const profile = await getPlayerProfile(userId);
  const base = settleState(profile.gameData || defaultGameState());

  let next;
  if (action === "parkFriend") next = await handleParkFriendAction(userId, base, payload || {});
  else if (action === "pullOut") next = await handlePullOutAction(userId, base, payload || {});
  else next = applyAction(base, action, payload || {});

  await savePlayerProfile(userId, { gameData: next });
  return getGameBundle(userId);
}

export async function writeAuditLog({ userId, action, payload, code, msg, ip, riskFlag = 0 }) {
  await pool.query(
    `INSERT INTO operation_audit(user_id, action, req_payload, resp_code, resp_msg, ip, risk_flag)
     VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, action || "", JSON.stringify(payload || {}), code, msg || "", ip || "", riskFlag]
  );
}
