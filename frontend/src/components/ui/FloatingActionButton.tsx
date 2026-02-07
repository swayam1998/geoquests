"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-8 right-8 bottom-safe right-safe w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary hover:bg-primary/80 hover:scale-110 active:scale-95 transition-all duration-300 z-40 shadow-[0_8px_30px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.2)]"
      aria-label="Create Quest"
    >
      <Plus className="w-7 h-7" weight="regular" />
    </Button>
  );
}
