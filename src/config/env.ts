export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string
};
