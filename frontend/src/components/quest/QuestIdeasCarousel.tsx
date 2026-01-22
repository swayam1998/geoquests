"use client";

import { QuestIdea } from "@/types";
import Link from "next/link";

interface QuestIdeasCarouselProps {
  ideas: QuestIdea[];
  onIdeaClick?: (idea: QuestIdea) => void;
}

export function QuestIdeasCarousel({ ideas, onIdeaClick }: QuestIdeasCarouselProps) {
  // Duplicate ideas for seamless infinite scroll
  const duplicatedIdeas = [...ideas, ...ideas];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight">
          Create a Quest
        </h2>
        <Link 
          href="/ideas" 
          className="text-sm text-[#6B7280] font-medium hover:text-[#1A1A1A] transition-colors"
        >
          See all →
        </Link>
      </div>

      {/* Subtitle */}
      <p className="text-[#6B7280] text-base">
        Get inspired! Pick an idea to get started.
      </p>

      {/* Carousel with slow auto-scroll */}
      <div className="overflow-hidden -mx-1">
        <div 
          className="flex gap-4 px-1 animate-slow-scroll hover:[animation-play-state:paused]"
          style={{
            width: "fit-content",
          }}
        >
          {duplicatedIdeas.map((idea, index) => (
            <button
              key={`${idea.id}-${index}`}
              onClick={() => onIdeaClick?.(idea)}
              className="flex-shrink-0 w-36 p-5 bg-white rounded-2xl hover:shadow-lg transition-all duration-200 text-center border border-[#E5E7EB] group hover:-translate-y-1"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">{idea.icon}</div>
              <p className="text-sm font-semibold text-[#1A1A1A] line-clamp-2">
                {idea.title}
              </p>
              <span className={`inline-block mt-3 text-xs font-medium px-3 py-1 rounded-full ${
                idea.category === "practical" 
                  ? "bg-[#FEF3C7] text-[#D97706]" 
                  : "bg-[#F3F4F6] text-[#4B5563]"
              }`}>
                {idea.category === "practical" ? "Practical" : "Personal"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
