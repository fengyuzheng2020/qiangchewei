# 抢车位 Monorepo

## 目录结构

- `frontend/`：前端（React + Vite）
- `backend/`：后端（Express + MySQL + Redis）
- `docs/`：设计与美术提示词文档

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

## 后端启动

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## 接口规范

- 通信：HTTP JSON
- 方法：业务接口统一 `POST`
- 返回：`{"code":0,"msg":"ok","data":{}}`
