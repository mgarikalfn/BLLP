import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../user/user.model";
import { Role } from "../user/user.model";
import { generateToken } from "../../utils/jwt";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username, nativeLanguage } = req.body;

    // 1️⃣ Validation
    if (!email || !password || !username || !nativeLanguage) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 2️⃣ Double Collision Check (Email & Username)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already exists" });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: "Username already taken" });

    // 3️⃣ Security
    const hashed = await bcrypt.hash(password, 10);

    // 4️⃣ Creation
    const user = await User.create({
      email,
      username, // 👈 Identity saved
      passwordHash: hashed,
      nativeLanguage,
      role: Role.LEARNER,
    });

    res.status(201).json({ id: user._id, username: user.username });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    if (user.userStatus === "BANNED")
      return res.status(403).json({ message: "User banned" });

    const token = generateToken({
      id: user._id,
      role: user.role,
    });

    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
