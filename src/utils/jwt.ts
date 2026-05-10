import jwt from "jsonwebtoken";
import { ENV } from "../config/env";

export const generateAccessToken = (payload: object) => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (payload: object) => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: "7d",
  });
};
