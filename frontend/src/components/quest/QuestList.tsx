"use client";

import { Quest } from "@/types";
import { QuestCard } from "./QuestCard";
import Link from "next/link";

interface QuestListProps {
  title: string;
  quests: Quest[];
  onQuestClick?: (quest: Quest) => void;
  showSeeAll?: boolean;
  seeAllHref?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
}

export function QuestList({
  title,
  quests,
  onQuestClick,
  showSeeAll = true,
  seeAllHref = "/quests",
  showSearch = false,
  onSearch,
}: QuestListProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight">
          {title}
        </h2>
        {showSeeAll && (
          <Link 
            href={seeAllHref} 
            className="text-sm text-[#6B7280] font-medium hover:text-[#1A1A1A] transition-colors"
          >
            See all →
          </Link>
        )}
      </div>

      {/* Search (optional) */}
      {showSearch && (
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search quests..."
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] border border-[#E5E7EB] shadow-sm transition-shadow hover:shadow-md"
          />
        </div>
      )}

      {/* Quest Cards */}
      <div className="space-y-3">
        {quests.map((quest, index) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onClick={() => onQuestClick?.(quest)}
            distance={1.2 + index * 0.8}
          />
        ))}
      </div>
    </div>
  );
}
