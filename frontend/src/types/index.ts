// Quest Types
export type QuestType = "social" | "paid" | "challenge" | "chain";
export type QuestCategory = "memories" | "hidden_gem" | "nature" | "food" | "art" | "social" | "adventure" | "practical";
export type QuestVisibility = "public" | "friends" | "private";
export type QuestStatus = "draft" | "active" | "completed" | "expired";

export interface Quest {
  id: string;
  creatorId: string;
  creator?: User;
  title: string;
  description: string;
  hint?: string;
  location: {
    lat: number;
    lng: number;
  };
  radiusMeters: number;
  type: QuestType;
  category: QuestCategory;
  categoryIcon: string;
  visibility: QuestVisibility;
  status: QuestStatus;
  priceCents?: number;
  completionCount: number;
  avgRating?: number;
  hasJoined?: boolean | null;
  countryCode: string;
  createdAt: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  xp: number;
  questsCreated: number;
  questsCompleted: number;
}

// Quest Ideas for Carousel
export interface QuestIdea {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "emotional" | "practical";
  tips?: string[];
}

// Location
export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

// Filter State
export interface QuestFilters {
  country?: string;
  nearby?: boolean;
  category?: QuestCategory;
  sortBy?: "distance" | "rating" | "newest";
}
