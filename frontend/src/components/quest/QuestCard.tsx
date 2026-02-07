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
      className="w-full flex items-center gap-4 p-4 bg-card hover:bg-surface-hover rounded-2xl transition-all duration-200 text-left shadow-sm hover:shadow-lg border border-border group"
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate text-base">{quest.title}</h3>
        <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
          <span>{quest.completionCount} completed</span>
          {showDistance && distance !== undefined && (
            <>
              <span className="text-border">·</span>
              <span className="text-text-secondary">{formatDistance(distance)}</span>
            </>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg
        className="w-5 h-5 text-text-tertiary flex-shrink-0 group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200"
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
