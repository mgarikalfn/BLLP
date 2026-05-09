import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { User, Role, UserStatus } from "../user/user.model";
import { Topic } from "../content/topic.model";
import { Lesson } from "../content/lesson.model";
import { Question } from "../content/question.model";
import { StudyStats } from "../study/study.statts.models";
import { Progress } from "../study/progress.model";
import { SystemConfig } from "./systemConfig.model";

const DEFAULT_PAGE_SIZE = 10;

/**
 * GET /api/admin/users
 * Fetch paginated list of users with optional search filter
 */
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, parseInt(req.query.pageSize as string) || DEFAULT_PAGE_SIZE);
    const search = (req.query.search as string)?.trim() || "";

    const skip = (page - 1) * pageSize;

    // Build filter
    let filter: any = {};
    if (search) {
      filter = {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Fetch users and total count
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash") // Exclude passwords
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

/**
 * PUT /api/admin/users/:userId/role
 * Update user role with validation
 */
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({
        message: "Invalid role. Must be one of: " + Object.values(Role).join(", "),
      });
      return;
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select(
      "-passwordHash"
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      message: "User role updated successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating user role", error: error.message });
  }
};

/**
 * PUT /api/admin/users/:userId/status
 * Toggle user status between ACTIVE and BANNED
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Toggle status
    const newStatus = user.userStatus === UserStatus.ACTIVE ? UserStatus.BANNED : UserStatus.ACTIVE;
    user.userStatus = newStatus;
    await user.save();

    res.status(200).json({
      message: `User status toggled to ${newStatus}`,
      data: user.toObject({ getters: true }),
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error toggling user status", error: error.message });
  }
};

/**
 * GET /api/admin/content-stats
 * Return dashboard statistics with concurrent queries
 */
export const getContentStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Run all count queries concurrently
    const [totalUsers, totalExperts, totalTopics, totalLessons, totalQuestions, lessonsPendingReview] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: Role.EXPERT }),
        Topic.countDocuments({}),
        Lesson.countDocuments({}),
        Question.countDocuments({}),
        Lesson.countDocuments({
          $or: [{ status: "NEEDS_REVIEW" }, { isVerified: false }],
        }),
      ]);

    res.status(200).json({
      stats: {
        totalUsers,
        totalExperts,
        totalTopics,
        totalLessons,
        totalQuestions,
        lessonsPendingReview,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching content stats", error: error.message });
  }
};

/**
 * GET /api/admin/analytics
 * Return daily active users, daily signups, and weak content metrics
 */
export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [dailyActiveUsers, usersJoinedToday, weakContentRaw] = await Promise.all([
      // Count DAU: active today
      StudyStats.countDocuments({
        lastStudyDate: { $gte: startOfToday },
      }),

      // Count new users today
      User.countDocuments({
        createdAt: { $gte: startOfToday },
      }),

      // Weak content computation
      Progress.aggregate([
        {
          $group: {
            _id: { contentId: "$contentId", contentType: "$contentType" },
            averageEaseFactor: { $avg: "$easeFactor" },
            numberOfReviews: { $sum: 1 },
          },
        },
        {
          $match: {
            averageEaseFactor: { $lt: 2.0 },
            numberOfReviews: { $gt: 2 },
          },
        },
        { $sort: { averageEaseFactor: 1 } },
        { $limit: 10 },
      ]),
    ]);

    // Manual population to keep it simple and handle polymorphic cross-collection references
    const weakContent = await Promise.all(
      weakContentRaw.map(async (item) => {
        const { contentId, contentType } = item._id;
        let previewText = "Unknown Content";

        if (contentType === "LESSON") {
          const lesson = await Lesson.findById(contentId).select("title").lean();
          if (lesson?.title) {
            previewText = typeof lesson.title === 'string' ? lesson.title : (lesson.title.am || lesson.title.ao || "Lesson");
          }
        } else {
          // Fallback to searching Question collection for other types
          const question = await Question.findById(contentId).select("content").lean();
          if (question?.content?.prompt) {
             previewText = typeof question.content.prompt === 'string' 
                ? question.content.prompt 
                : (question.content.prompt.am || question.content.prompt.ao || "Question");
          }
        }

        return {
          contentId,
          contentType,
          averageEaseFactor: Number(item.averageEaseFactor.toFixed(2)),
          numberOfReviews: item.numberOfReviews,
          preview: previewText,
        };
      })
    );

    res.status(200).json({
      analytics: {
        dailyActiveUsers,
        usersJoinedToday,
        weakContent,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching analytics", error: error.message });
  }
};

/**
 * GET /api/admin/config
 * Fetch the single system configuration document.
 * If it doesn't exist, it will be automatically created.
 */
export const getSystemConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await SystemConfig.getSingleton();
    res.status(200).json({ data: config });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching system config", error: error.message });
  }
};

/**
 * PUT /api/admin/config
 * Update the system configuration document.
 */
export const updateSystemConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isAIGenerationEnabled, activeSeasonId, maintenanceMode, dailyXpCap } = req.body;
    
    // Get or create the singleton
    const config = await SystemConfig.getSingleton();

    // Update only the provided fields
    if (isAIGenerationEnabled !== undefined) config.isAIGenerationEnabled = isAIGenerationEnabled;
    if (activeSeasonId !== undefined) config.activeSeasonId = activeSeasonId;
    if (maintenanceMode !== undefined) config.maintenanceMode = maintenanceMode;
    if (dailyXpCap !== undefined) config.dailyXpCap = dailyXpCap;

    await config.save();
    
    res.status(200).json({ 
      message: "Configuration updated successfully", 
      data: config 
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating system config", error: error.message });
  }
};
