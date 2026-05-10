import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import { User, UserStatus } from "../modules/user/user.model";

export interface AuthUser {
  id: string;
  role: string;
  tokenType?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "No token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET as string) as AuthUser;

    if (decoded.tokenType && decoded.tokenType !== "access") {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    
    // Check if user is BANNED
    const user = await User.findById(decoded.id);
    if (!user || user.userStatus === UserStatus.BANNED) {
      res.status(403).json({ message: "Forbidden - User is banned" });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({ message: "Email not verified" });
      return;
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: "No user attached to request" });
    return;
  }
  if (req.user.role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden - Admin access required" });
    return;
  }
  next();
};

export const checkRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "No user attached to request" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
