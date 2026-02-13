# Docker 部署（蓝绿容器 + 宿主机端口）

## 目标

- 一个域名下固定路径：
  - `www.jiguanghuyu.top/qiangchewei` -> 前端
  - `www.jiguanghuyu.top/qiangchewei_server` -> 后端
- MySQL/Redis 使用远程服务（容器里不启动）
- Docker 只跑前后端蓝绿容器

## 配置

```bash
cd deploy
cp .env.example .env
cp backend.env.example backend.env
```

## 首次启动

```bash
cd deploy
./scripts/bootstrap.sh
```

默认端口：
- 前端蓝：`18080`，前端绿：`18081`
- 后端蓝：`13001`，后端绿：`13002`

## 发布

```bash
cd deploy
./scripts/deploy.sh
```

## 回滚

```bash
cd deploy
./scripts/rollback.sh
```

## Nginx 配置

直接使用：`deploy/nginx.proxy.example.conf`

发布切流时，只需要把 `proxy_pass` 从蓝端口改到绿端口（或反向），然后 reload nginx。
