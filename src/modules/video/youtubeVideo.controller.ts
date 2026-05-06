import { Request, Response } from "express";
import axios from "axios";
import mongoose from "mongoose";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Topic } from "../content/topic.model";
import { User } from "../user/user.model";
import {
  AIService,
  AIServiceError,
  RankedVideoCandidate,
  VideoCandidate,
} from "../../services/ai.service";
import {
  YoutubeVideo,
  VideoLevel,
  YoutubeVideoStatus,
} from "./youtubeVideo.model";

const VIDEO_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

type VideoLevelValue = (typeof VIDEO_LEVELS)[number];

type DiscoverVideosBody = {
  topicId?: string;
  level?: string;
  targetLanguage?: string;
};

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
};

const isValidVideoLevel = (value: unknown): value is VideoLevelValue => {
  return typeof value === "string" && VIDEO_LEVELS.includes(value as VideoLevelValue);
};

const normalizeTargetLanguage = (value?: string | null) => {
  if (!value) return null;

  const cleaned = value.trim().replace(/\s+/g, " ");
  const upper = cleaned.toUpperCase();

  if (upper === "AMHARIC" || upper === "AM") return "Amharic";
  if (upper === "OROMO" || upper === "AFAN OROMO" || upper === "AFANOROMO" || upper === "AO") {
    return "Afan Oromo";
  }

  return cleaned;
};

const resolveTargetLanguage = async (
  req: AuthRequest,
  provided?: string,
): Promise<string> => {
  const fromRequest = normalizeTargetLanguage(provided);
  if (fromRequest) return fromRequest;

  const userId = req.user?.id;
  if (!userId) return "Amharic and Afan Oromo";

  const user = await User.findById(userId).select("targetLanguage").lean();
  const userLang = normalizeTargetLanguage(String(user?.targetLanguage || ""));

  return userLang || "Amharic and Afan Oromo";
};

const mapYouTubeItems = (items: YouTubeSearchItem[]): VideoCandidate[] => {
  return items
    .map((item) => {
      const youtubeId = String(item.id?.videoId || "").trim();
      const title = String(item.snippet?.title || "").trim();
      const description = String(item.snippet?.description || "").trim();
      const thumbnailUrl =
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "";
      const channelTitle = String(item.snippet?.channelTitle || "").trim();

      return {
        youtubeId,
        title,
        description,
        thumbnailUrl,
        channelTitle,
      };
    })
    .filter((item) => item.youtubeId && item.title);
};

const buildMockYouTubeResults = (
  topicTitle: string,
  targetLanguage: string,
  level: string,
): YouTubeSearchItem[] => {
  const baseTitle = `${targetLanguage} ${topicTitle} ${level.toLowerCase()}`;

  return [
    {
      id: { videoId: "mock-video-1" },
      snippet: {
        title: `${baseTitle} lesson and vocabulary`,
        description: `Mock lesson covering ${topicTitle} for ${level} learners in ${targetLanguage}.`,
        channelTitle: "Mock Language Academy",
        thumbnails: { high: { url: "https://example.com/mock-video-1.jpg" } },
      },
    },
    {
      id: { videoId: "mock-video-2" },
      snippet: {
        title: `${targetLanguage} pronunciation practice for ${topicTitle}`,
        description: `Mock pronunciation video for ${topicTitle} targeted at ${level} level.`,
        channelTitle: "Mock Pronunciation Lab",
        thumbnails: { high: { url: "https://example.com/mock-video-2.jpg" } },
      },
    },
    {
      id: { videoId: "mock-video-3" },
      snippet: {
        title: `${topicTitle} dialogue practice in ${targetLanguage}`,
        description: `Mock dialogue practice video with explanations for ${level} learners.`,
        channelTitle: "Mock Dialogue Studio",
        thumbnails: { high: { url: "https://example.com/mock-video-3.jpg" } },
      },
    },
  ];
};

const fetchYouTubeVideos = async (
  query: string,
  topicTitle: string,
  targetLanguage: string,
  level: string,
): Promise<YouTubeSearchItem[]> => {
  const apiKey = (process.env.YOUTUBE_API_KEY || "").trim();

  if (!apiKey) {
    return buildMockYouTubeResults(topicTitle, targetLanguage, level);
  }

  const response = await axios.get<YouTubeSearchResponse>(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        key: apiKey,
        part: "snippet",
        q: query,
        type: "video",
        maxResults: 12,
        safeSearch: "moderate",
      },
    },
  );

  return response.data.items || [];
};

export const searchVideos = async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!q) {
      return res.status(400).json({ message: "Search query (q) is required" });
    }

    const videos = await YoutubeVideo.find({
      $text: { $search: q },
      isVerified: true,
      status: YoutubeVideoStatus.PUBLISHED,
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(50);

    return res.json({ count: videos.length, videos });
  } catch (error: any) {
    console.error("Search videos error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const discoverVideosWithAI = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    const { topicId, level, targetLanguage } = req.body as DiscoverVideosBody;

    if (!topicId || !mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Valid topicId is required" });
    }

    if (!level || !isValidVideoLevel(level)) {
      return res.status(400).json({ message: "Valid level is required" });
    }

    const topic = await Topic.findById(topicId).select("title").lean();

    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const resolvedTargetLanguage = await resolveTargetLanguage(authReq, targetLanguage);
    const topicTitle = `${topic.title.am} / ${topic.title.ao}`;

    const searchQuery = await AIService.generateVideoSearchQuery(
      topicTitle,
      resolvedTargetLanguage,
      level,
    );

    const youtubeItems = await fetchYouTubeVideos(
      searchQuery,
      topicTitle,
      resolvedTargetLanguage,
      level,
    );

    const candidates = mapYouTubeItems(youtubeItems);

    if (candidates.length === 0) {
      return res.status(200).json({
        query: searchQuery,
        count: 0,
        videos: [],
      });
    }

    const topicContext = `${topicTitle} | ${resolvedTargetLanguage} | ${level}`;
    const ranked = await AIService.rankVideoCandidates(candidates, topicContext);

    const rankedById = new Map(
      ranked.map((item: RankedVideoCandidate) => [item.youtubeId, item.relevanceScore]),
    );

    const docs = candidates
      .map((candidate) => {
        const relevanceScore = rankedById.get(candidate.youtubeId);
        if (relevanceScore === undefined) {
          return null;
        }

        return {
          youtubeId: candidate.youtubeId,
          title: candidate.title,
          description: candidate.description || "",
          thumbnailUrl: candidate.thumbnailUrl || "",
          topicId,
          level: level as VideoLevel,
          tags: [topicTitle, resolvedTargetLanguage, level],
          relevanceScore,
          isVerified: false,
          status: YoutubeVideoStatus.NEEDS_REVIEW,
          generatedByAI: true,
          authorId: authReq.user?.id,
        };
      })
      .filter(Boolean) as Array<
      {
        youtubeId: string;
        title: string;
        description: string;
        thumbnailUrl: string;
        topicId: string;
        level: VideoLevel;
        tags: string[];
        relevanceScore: number;
        isVerified: boolean;
        status: YoutubeVideoStatus;
        generatedByAI: boolean;
        authorId?: string;
      }
    >;

    if (docs.length === 0) {
      return res.status(200).json({
        query: searchQuery,
        count: 0,
        videos: [],
      });
    }

    const bulkOps = docs.map((doc) => ({
      updateOne: {
        filter: { youtubeId: doc.youtubeId },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }));

    await YoutubeVideo.bulkWrite(bulkOps, { ordered: false });

    const savedVideos = await YoutubeVideo.find({
      youtubeId: { $in: docs.map((doc) => doc.youtubeId) },
    }).sort({ relevanceScore: -1 });

    return res.status(200).json({
      query: searchQuery,
      count: savedVideos.length,
      videos: savedVideos,
    });
  } catch (error: any) {
    if (error instanceof AIServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        details: error.details,
      });
    }

    console.error("Discover videos error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifyYoutubeVideo = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid video id" });
    }

    const video = await YoutubeVideo.findById(id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    video.isVerified = true;
    video.status = YoutubeVideoStatus.PUBLISHED;
    await video.save();

    return res.json(video);
  } catch (error: any) {
    console.error("Verify video error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
