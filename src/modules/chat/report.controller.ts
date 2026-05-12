import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Report, Message } from "./chat.models";
import { User, UserStatus } from "../user/user.model";
import { Types } from "mongoose";

export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reporterId = req.user?.id;
    if (!reporterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { reportedUserId, messageId, reason, type } = req.body;

    if (!reportedUserId || !reason || !messageId) {
      res.status(400).json({ message: "reportedUserId, messageId and reason are required" });
      return;
    }

    // Capture context
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    // Auto-hiding logic: increment count and hide if threshold reached
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { $inc: { reportCount: 1 } },
      { new: true }
    );

    if (updatedMessage && updatedMessage.reportCount >= 3) {
      updatedMessage.isDeleted = true;
      await updatedMessage.save();
    }

    const report = await Report.create({
      targetId: messageId,
      reporterId,
      reportedUserId,
      reason,
      type: type || "OTHER",
      context: message.text,
      status: "PENDING"
    });

    res.status(201).json({ 
      success: true, 
      message: updatedMessage && updatedMessage.reportCount >= 3 
        ? "Report submitted. Message has been hidden for review." 
        : "Thank you. An expert will review this.", 
      report 
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const getPendingReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Both Experts and Admins can see this
    const reports = await Report.find({ status: { $in: ["PENDING", "UNDER_REVIEW"] } })
      .populate("reporterId", "username")
      .populate("reportedUserId", "username email userStatus")
      .populate({
        path: "targetId",
        select: "text createdAt reportCount senderId conversationId"
      })
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error) {
    console.error("Fetch pending reports error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const resolveReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expertId = req.user?.id;
    const { reportId } = req.params;
    const { actionTaken, note } = req.body;

    if (!actionTaken) {
      res.status(400).json({ message: "actionTaken is required" });
      return;
    }

    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }

    // Apply action
    switch (actionTaken) {
      case "DELETE_MESSAGE":
        await Message.findByIdAndUpdate(report.targetId, { isDeleted: true });
        break;
      case "FLAG_USER":
        await User.findByIdAndUpdate(report.reportedUserId, { 
          "moderationFlags.isFlagged": true,
          "moderationFlags.lastModeratedAt": new Date()
        });
        break;
      case "WARN":
        await User.findByIdAndUpdate(report.reportedUserId, { 
          $inc: { "moderationFlags.warningCount": 1 },
          "moderationFlags.lastModeratedAt": new Date()
        });
        break;
      case "BAN_USER" as any:
        await User.findByIdAndUpdate(report.reportedUserId, { 
          userStatus: UserStatus.BANNED,
          "moderationFlags.lastModeratedAt": new Date()
        });
        break;
      case "DISMISS":
        // No structural changes, just resolve the report
        break;
    }

    report.status = actionTaken === "DISMISS" ? "REJECTED" : "RESOLVED";
    report.resolutionDetails = {
      actionTaken,
      resolvedBy: new Types.ObjectId(expertId),
      resolvedAt: new Date(),
      note
    };

    await report.save();

    res.json({ success: true, message: `Report resolved with action: ${actionTaken}` });
  } catch (error) {
    console.error("Resolve report error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const banUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userIdToBan, reportId } = req.body;
    if (!userIdToBan || !reportId) {
      res.status(400).json({ message: "userIdToBan and reportId are required" });
      return;
    }

    await User.findByIdAndUpdate(userIdToBan, { userStatus: UserStatus.BANNED });
    await Report.findByIdAndUpdate(reportId, { 
      status: "RESOLVED",
      resolutionDetails: {
        actionTaken: "FLAG_USER",
        resolvedBy: new Types.ObjectId(req.user?.id),
        resolvedAt: new Date(),
        note: "Manually banned via legacy endpoint"
      }
    });

    res.json({ success: true, message: "User permanently banned." });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};
