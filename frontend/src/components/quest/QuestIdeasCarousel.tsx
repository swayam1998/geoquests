"use client";

import { QuestIdea } from "@/types";
import { Compass, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface QuestIdeasCarouselProps {
  ideas: QuestIdea[];
  onIdeaClick?: (idea: QuestIdea) => void;
}

export function QuestIdeasCarousel({ ideas, onIdeaClick }: QuestIdeasCarouselProps) {
  // Duplicate ideas for seamless infinite scroll
  const duplicatedIdeas = [...ideas, ...ideas];

  return (
    <div className="space-y-6">
      {/* Carousel with slow auto-scroll */}
      <div className="overflow-hidden -mx-1">
        <div 
          className="flex gap-5 px-1 animate-slow-scroll hover:[animation-play-state:paused]"
          style={{
            width: "fit-content",
          }}
        >
          {duplicatedIdeas.map((idea, index) => (
            <div
              key={`${idea.id}-${index}`}
              className="shrink-0 w-72 min-h-64 p-5 bg-card rounded-2xl border border-border group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              {/* Icon + label */}
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-5 h-5 text-brand" weight="duotone" />
                <span className="text-xs font-medium text-brand uppercase tracking-wide">
                  Quests
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-foreground leading-snug mb-2 line-clamp-1">
                {idea.title}
              </h3>

              {/* Description - full text visible */}
              <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1">
                {idea.description}
              </p>

              {/* Create Quest button */}
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIdeaClick?.(idea);
                }}
                className="w-full gap-1.5 group/btn"
              >
                Create Quest
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" weight="bold" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
