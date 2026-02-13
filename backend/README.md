# Backend（Express + MySQL + Redis）

## 约定

- 协议：HTTP + JSON
- 业务接口：统一使用 `POST`
- 响应结构：`{"code":0,"msg":"ok","data":{}}`
- 游戏状态：服务端权威（前端仅上报行为）

## 启动

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## 初始化数据库

执行：`sql/init.sql`

## 登录方式（邮箱验证码）

已启用邮箱验证码登录（QQ邮箱SMTP发信），前端不再展示手机号登录。

## 认证接口

### 发送验证码
- `POST /api/auth/send-code`
- body: `{ "email": "user@example.com" }`

### 登录
- `POST /api/auth/login`
- body: `{ "email": "user@example.com", "code": "123456" }`

### 刷新令牌
- `POST /api/auth/refresh`
- body: `{ "refreshToken": "..." }`

### 退出
- `POST /api/auth/logout`
- header: `Authorization: Bearer <accessToken>`

## 游戏接口（服务端权威）

### 获取状态
- `POST /api/game/state/get`

### 同步结算
- `POST /api/game/sync`

### 上报行为
- `POST /api/game/action`

## 安全机制

- refresh token 轮换
- 路由限流（IP + 路径）
- 行为风控（用户频率/异常行为封禁）
- 操作审计表：`operation_audit`

## QQ邮箱 SMTP 配置

在 `.env` 中填写：

- `EMAIL_ENABLED=true`
- `EMAIL_HOST=smtp.qq.com`
- `EMAIL_PORT=465`
- `EMAIL_SECURE=true`
- `EMAIL_USER=你的QQ邮箱`
- `EMAIL_PASS=QQ邮箱SMTP授权码`
- `EMAIL_FROM=你的QQ邮箱`

若 `EMAIL_ENABLED=false`，会走本地 mock（验证码打印在后端日志）。
