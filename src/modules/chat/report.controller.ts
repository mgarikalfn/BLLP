import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Report, Message, ReportType, ReportStatus } from "./chat.models";
import { User, UserStatus } from "../user/user.model";
import { Types } from "mongoose";
import { Notification } from "../notifications/notification.model";
import { sendModerationEmail } from "../../utils/mailer";

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
      updatedMessage.isAutoHidden = true;
      await updatedMessage.save();
    }

    const report = await Report.create({
      messageId: messageId,
      reporterId,
      reportedUserId,
      reason,
      type: type || ReportType.SPAM,
      context: message.text,
      status: ReportStatus.PENDING
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
    const reports = await Report.find({ status: { $in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW] } })
      .populate("reporterId", "username")
      .populate("reportedUserId", "username email userStatus")
      .populate({
        path: "messageId",
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
    const { actionTaken, notes } = req.body;

    if (!actionTaken) {
      res.status(400).json({ message: "actionTaken is required" });
      return;
    }

    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }

    let updatedUser: { email?: string; username?: string; moderationFlags?: { warningCount?: number } } | null = null;

    // Apply action
    switch (actionTaken) {
      case "MESSAGE_DELETED":
        await Message.findByIdAndUpdate(report.messageId, { 
          isDeleted: true,
          deletedBy: new Types.ObjectId(expertId),
          deletedAt: new Date(),
          text: "This message was removed by a moderator."
        });
        break;
      case "USER_FLAGGED":
        await User.findByIdAndUpdate(report.reportedUserId, { 
          isFlagged: true,
          flaggedBy: new Types.ObjectId(expertId),
          flaggedAt: new Date(),
          flagReason: report.reason
        });
        break;
      case "WARNING":
        updatedUser = await User.findByIdAndUpdate(
          report.reportedUserId,
          {
            $inc: { "moderationFlags.warningCount": 1 },
            "moderationFlags.lastModeratedAt": new Date(),
          },
          { new: true, select: "email username moderationFlags.warningCount" }
        ).lean();
        break;
      case "DISMISSED":
        // No structural changes, just resolve the report
        break;
    }

    report.status = actionTaken === "DISMISSED" ? ReportStatus.REJECTED : ReportStatus.RESOLVED;
    report.resolutionDetails = {
      actionTaken: actionTaken as "DISMISSED" | "WARNING" | "MESSAGE_DELETED" | "USER_FLAGGED",
      resolvedBy: new Types.ObjectId(expertId),
      resolvedAt: new Date(),
      notes
    };

    await report.save();

    if (actionTaken === "WARNING" || actionTaken === "USER_FLAGGED") {
      const reportedUserId = report.reportedUserId;
      const reason = report.reason || notes;
      const moderationAction = actionTaken === "USER_FLAGGED" ? "FLAG_USER" : "WARN";
      const notificationType = actionTaken === "USER_FLAGGED" ? "SYSTEM_ALERT" : "MODERATION";
      const notificationTitle = actionTaken === "USER_FLAGGED" ? "Security Alert" : "Account Notice";
      const baseMessage =
        actionTaken === "USER_FLAGGED"
          ? "Your account has been flagged for review due to violations of community guidelines."
          : "Your account received a formal warning for violating community guidelines.";
      const message = reason ? `${baseMessage} Reason: ${reason}` : baseMessage;

      void (async () => {
        try {
          await Notification.create({
            userId: reportedUserId,
            type: notificationType,
            title: notificationTitle,
            message,
            metadata: {
              reportId: report._id,
              actionTaken,
              reason,
            },
          });

          const userInfo =
            updatedUser ||
            (await User.findById(reportedUserId)
              .select("email username moderationFlags.warningCount")
              .lean());

          if (userInfo?.email && userInfo?.username) {
            await sendModerationEmail({
              to: userInfo.email,
              username: userInfo.username,
              action: moderationAction,
              reason: reason || undefined,
              warningCount: userInfo.moderationFlags?.warningCount,
            });
          }
        } catch (notifyError) {
          console.error("Moderation notify error:", notifyError);
        }
      })();
    }

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
      status: ReportStatus.RESOLVED,
      resolutionDetails: {
        actionTaken: "USER_FLAGGED",
        resolvedBy: new Types.ObjectId(req.user?.id),
        resolvedAt: new Date(),
        notes: "Manually flagged via legacy endpoint"
      }
    });

    res.json({ success: true, message: "User permanently banned." });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

/**
 * GET /api/reports/conversations/:conversationId/messages
 * Allows Admins/Experts to view chat history for moderation context
 */
export const getModerationChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(50) // Show last 50 messages for context
      .populate("senderId", "username")
      .lean();

    res.json(messages);
  } catch (error) {
    console.error("Moderation history error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};
