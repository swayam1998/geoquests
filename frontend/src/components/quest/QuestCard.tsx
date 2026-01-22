"use client";

import { Quest } from "@/types";

interface QuestCardProps {
  quest: Quest;
  onClick?: () => void;
  showDistance?: boolean;
  distance?: number; // in km
}

export function QuestCard({ quest, onClick, showDistance = true, distance }: QuestCardProps) {
  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white hover:bg-[#FAFAFA] rounded-2xl transition-all duration-200 text-left shadow-sm hover:shadow-lg border border-[#E5E7EB] group"
    >
      {/* Category Icon */}
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-200">
        {quest.categoryIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[#1A1A1A] truncate text-base">{quest.title}</h3>
        <div className="flex items-center gap-2 text-sm text-[#6B7280] mt-1">
          {quest.avgRating && (
            <>
              <span className="flex items-center gap-0.5 text-[#1A1A1A] font-medium">
                <span className="text-amber-500">★</span>
                {quest.avgRating.toFixed(1)}
              </span>
              <span className="text-[#E5E7EB]">·</span>
            </>
          )}
          <span>{quest.completionCount} completed</span>
          {showDistance && distance !== undefined && (
            <>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[#6B7280]">{formatDistance(distance)}</span>
            </>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg
        className="w-5 h-5 text-[#9CA3AF] flex-shrink-0 group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all duration-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}
