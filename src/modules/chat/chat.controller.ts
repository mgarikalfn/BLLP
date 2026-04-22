import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Conversation, Message } from "./chat.models";
import { StudyStats } from "../study/study.statts.models";
import { User, LearningDirection } from "../user/user.model";
import mongoose from "mongoose";

// Endpoint to find a match or return existing open conversations
export const findChatMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const currentUserStats = await StudyStats.findOne({ userId: currentUserId }).populate('userId');
    if (!currentUserStats) {
      res.status(404).json({ message: "Current user stats not found" });
      return;
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({ message: "Current user not found" });
      return;
    }

    const currentUserLevel = currentUserStats.level;
    const currentDirection = currentUser.learningDirection;
    const oppositeDirection =
      currentDirection === LearningDirection.AM_TO_OR
        ? LearningDirection.OR_TO_AM
        : LearningDirection.AM_TO_OR;

    // First, try to find a strict match (opposite direction, similar level)
    let matches = await StudyStats.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $match: {
          "user._id": { $ne: new mongoose.Types.ObjectId(currentUserId) }, // Don't match self
          "user.userStatus": "ACTIVE", // NEVER match banned users
          "user.learningDirection": oppositeDirection, // Opposite direction
          level: { $gte: Math.max(1, currentUserLevel - 2), $lte: currentUserLevel + 2 } // +/- 2 levels
        }
      },
      { $sample: { size: 1 } } // Pick a random match
    ]);

    // FALLBACK: If no strict match exists (especially common in development), just find ANY active user
    if (!matches || matches.length === 0) {
      matches = await StudyStats.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: "$user" },
        {
          $match: {
            "user._id": { $ne: new mongoose.Types.ObjectId(currentUserId) }, // Don't match self
            "user.userStatus": "ACTIVE" // Still only match active users
          }
        },
        { $sample: { size: 1 } }
      ]);
    }

    if (!matches || matches.length === 0) {
      res.status(404).json({ message: "No match found at this time. Try again later." });
      return;
    }

    const matchUser = matches[0].user;
    const matchUserId = matchUser._id;

    // Check if conversation already exists between these two
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, matchUserId] }
    }).populate("participants", "username avatarUrl level bio");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, matchUserId],
      });
      conversation = await conversation.populate("participants", "username avatarUrl level bio");

      // Send a notification to the matched user
      const { Notification } = await import("../notifications/notification.model");
      await Notification.create({
        userId: matchUserId,
        type: "CHAT_REQUEST",
        title: "New Chat Request!",
        message: `${currentUser.username} wants to practice with you. Say hi!`,
        metadata: { conversationId: conversation._id }
      });
    }

    res.json({ conversation });
  } catch (error) {
    console.error("Match error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const conversations = await Conversation.find({
      participants: { $in: [currentUserId] }
    })
      .populate("participants", "username avatarUrl level bio")
      .sort({ lastMessageAt: -1 });

    res.json({ conversations });
  } catch (error) {
    console.error("Fetch conversations error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};

export const getConversationMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const { conversationId } = req.params;

    if (!currentUserId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [currentUserId] }
    });

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found or unauthorized" });
      return;
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 }); // Oldest first for chat history

    res.json({ messages });
  } catch (error) {
    console.error("Fetch messages error:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
};
