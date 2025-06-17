import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  APP_URI: process.env.APP_URI || "http://localhost",
  MONGO_URI: process.env.MONGODB_URI!,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
};
