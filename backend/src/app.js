import express from "express";
import cors from "cors";
import { fail, ok } from "./utils/response.js";
import { onlyPost } from "./middleware/onlyPost.js";
import { authRequired } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { sendCode, login, refresh, logout } from "./controllers/authController.js";
import { action, friendAdd, friendList, nicknameSet, rankingGlobal, stateGet, sync } from "./controllers/gameController.js";
import { initStore } from "./services/store.js";
import { pool } from "./services/db.js";
import { env } from "./config/env.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit);
app.use(onlyPost);

app.get("/health", (_, res) => res.json(ok({ service: "qiangchewei-backend" })));
app.post("/health", (_, res) => res.json(ok({ service: "qiangchewei-backend" })));

app.post("/api/auth/send-code", sendCode);
app.post("/api/auth/login", login);
app.post("/api/auth/refresh", refresh);
app.post("/api/auth/logout", authRequired, logout);

app.post("/api/game/state/get", authRequired, stateGet);
app.post("/api/game/sync", authRequired, sync);
app.post("/api/game/action", authRequired, action);

app.post("/api/social/friend/add", authRequired, friendAdd);
app.post("/api/social/friend/list", authRequired, friendList);
app.post("/api/social/ranking/global", authRequired, rankingGlobal);
app.post("/api/player/nickname/set", authRequired, nicknameSet);

app.use((_, res) => res.status(404).json(fail(404, "not found")));

async function bootstrap() {
  await initStore();
  await pool.query("SELECT 1");
  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("[bootstrap] failed:", err);
  process.exit(1);
});
