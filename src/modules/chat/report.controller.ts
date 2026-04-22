import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Report } from "./chat.models";
import { User, UserStatus } from "../user/user.model";

export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reporterId = req.user?.id;
    if (!reporterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { reportedUserId, messageId, reason } = req.body;

    if (!reportedUserId || !reason) {
      res.status(400).json({ message: "reportedUserId and reason are required" });
      return;
    }

    const report = await Report.create({
      reporterId,
      reportedUserId,
      messageId,
      reason
    });

    res.status(201).json({ success: true, message: "Report submitted successfully.", report });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const getPendingReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Already checked role === ADMIN in middleware
    const reports = await Report.find({ status: "PENDING" })
      .populate("reporterId", "username")
      .populate("reportedUserId", "username email userStatus")
      .populate("messageId", "text createdAt")
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error) {
    console.error("Fetch pending reports error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const banUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Already checked role === ADMIN in middleware
    const { userIdToBan, reportId } = req.body;

    if (!userIdToBan || !reportId) {
      res.status(400).json({ message: "userIdToBan and reportId are required" });
      return;
    }

    await User.findByIdAndUpdate(userIdToBan, { userStatus: UserStatus.BANNED });
    await Report.findByIdAndUpdate(reportId, { status: "REVIEWED" });

    res.json({ success: true, message: "User permanently banned." });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const dismissReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      res.status(400).json({ message: "reportId is required" });
      return;
    }

    await Report.findByIdAndUpdate(reportId, { status: "DISMISSED" });

    res.json({ success: true, message: "Report dismissed." });
  } catch (error) {
    console.error("Dismiss report error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};
