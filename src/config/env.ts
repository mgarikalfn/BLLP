import dotenv from "dotenv";

dotenv.config();

const getRequiredEnv = (key: "DATABASE_URL" | "JWT_SECRET") => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: getRequiredEnv("DATABASE_URL"),
  JWT_SECRET: getRequiredEnv("JWT_SECRET")
};
