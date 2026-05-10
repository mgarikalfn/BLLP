import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { generateSlug } from "../../utils/slugify";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { Role, ProficiencyLevel, User } from "../user/user.model";
import { StudyStats } from "../study/study.statts.models";

const getGoogleClientId = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID");
  }

  return clientId;
};

const resolveUsername = async (raw: string) => {
  const base = generateSlug(raw) || "user";
  let candidate = base;
  let suffix = 1;

  while (await User.exists({ username: candidate })) {
    candidate = `${base}${suffix}`;
    suffix += 1;

    if (suffix > 50) {
      candidate = `${base}${Date.now().toString().slice(-6)}`;
      break;
    }
  }

  return candidate;
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token: idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ message: "token is required" });
    }

    const clientId = getGoogleClientId();
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name || payload.given_name || email.split("@")[0];
    const avatarUrl = payload.picture;
    const isEmailVerified = payload.email_verified === true;

    if (!isEmailVerified) {
      return res.status(403).json({ message: "Google email not verified" });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (user.userStatus === "BANNED") {
        return res.status(403).json({ message: "User banned" });
      }

      let shouldSave = false;

      if (!user.googleId) {
        user.googleId = googleId;
        shouldSave = true;
      }

      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
        shouldSave = true;
      }

      if (!user.isEmailVerified && isEmailVerified) {
        user.isEmailVerified = true;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    } else {
      const username = await resolveUsername(name);

      user = await User.create({
        email,
        username,
        googleId,
        avatarUrl,
        isEmailVerified,
        ProficiencyLevel: ProficiencyLevel.BEGINNER,
        role: Role.LEARNER,
      });

      await StudyStats.findOneAndUpdate(
        { userId: user._id },
        { $setOnInsert: { userId: user._id } },
        { upsert: true, new: false },
      );
    }

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      role: user.role,
      tokenType: "access",
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      tokenType: "refresh",
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken,
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      learningDirection: user.learningDirection,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("Google login error:", error);
    return res.status(500).json({ message: "Server error", error: message });
  }
};
