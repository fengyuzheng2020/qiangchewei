import dotenv from "dotenv";

dotenv.config();

function must(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (value === "") throw new Error(`Missing required env: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: must("JWT_SECRET", "dev-local-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2h",
  refreshJwtSecret: must("REFRESH_JWT_SECRET", "dev-local-refresh-secret-change-me"),
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || "14d",

  mysql: {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "qiangchewei",
  },

  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || "",
  },

  mail: {
    enabled: (process.env.EMAIL_ENABLED || "false") === "true",
    host: process.env.EMAIL_HOST || "smtp.qq.com",
    port: Number(process.env.EMAIL_PORT || 465),
    secure: (process.env.EMAIL_SECURE || "true") === "true",
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
  },
};
