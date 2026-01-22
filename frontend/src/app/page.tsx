"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { QuestMap } from "@/components/map/QuestMap";
import { QuestIdeasCarousel } from "@/components/quest/QuestIdeasCarousel";
import { QuestsTable } from "@/components/quest/QuestsTable";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { getShuffledIdeas } from "@/lib/quest-ideas";
import { Quest, QuestIdea } from "@/types";

// Mock data for quests - moved outside component to prevent recreation
const mockQuests: Quest[] = [
  {
    id: "1",
    creatorId: "user-1",
    title: "Sunset at the Bridge",
    description: "Capture the beautiful sunset view from the pedestrian bridge",
    location: { lat: 40.7128, lng: -74.006 },
    radiusMeters: 100,
    type: "social",
    category: "nature",
    categoryIcon: "🌅",
    visibility: "public",
    status: "active",
    completionCount: 156,
    avgRating: 4.9,
    countryCode: "US",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    creatorId: "user-2",
    title: "Hidden Ramen Spot",
    description: "Find this amazing ramen shop hidden in the alley",
    location: { lat: 40.7589, lng: -73.9851 },
    radiusMeters: 50,
    type: "social",
    category: "food",
    categoryIcon: "🍜",
    visibility: "public",
    status: "active",
    completionCount: 89,
    avgRating: 4.8,
    countryCode: "US",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    creatorId: "user-3",
    title: "DMV Queue Check",
    description: "How long is the line at the DMV right now?",
    location: { lat: 40.7484, lng: -73.9857 },
    radiusMeters: 30,
    type: "social",
    category: "practical",
    categoryIcon: "⏱️",
    visibility: "public",
    status: "active",
    completionCount: 34,
    avgRating: 4.5,
    countryCode: "US",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    creatorId: "user-4",
    title: "Street Art Alley",
    description: "Discover the amazing murals in this hidden alley",
    location: { lat: 40.7282, lng: -73.7949 },
    radiusMeters: 100,
    type: "social",
    category: "art",
    categoryIcon: "🎨",
    visibility: "public",
    status: "active",
    completionCount: 67,
    avgRating: 4.7,
    countryCode: "US",
    createdAt: new Date().toISOString(),
  },
];

// Memoized Map component to prevent re-renders
const MemoizedMap = ({ quests, onQuestClick }: { quests: Quest[], onQuestClick: (quest: Quest) => void }) => {
  return useMemo(() => (
    <QuestMap
      quests={quests}
      onQuestClick={onQuestClick}
      center={[40.74, -73.99]}
      zoom={12}
      className="w-full h-full"
      showSearch={true}
    />
  ), [quests, onQuestClick]);
};

export default function HomePage() {
  const [questIdeas, setQuestIdeas] = useState<QuestIdea[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shuffle ideas only on client to avoid hydration mismatch
  useEffect(() => {
    setQuestIdeas(getShuffledIdeas(8));
    setIsMounted(true);
  }, []);

  // Handle scroll for parallax effect using requestAnimationFrame for smoothness
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    // Progress through the first screen of scrolling
    const progress = Math.min(Math.max(scrollY / windowHeight, 0), 1);
    setScrollProgress(progress);
  }, []);

  useEffect(() => {
    let ticking = false;
    
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  // Memoize handlers to prevent map re-renders
  const handleQuestClick = useCallback((quest: Quest) => {
    console.log("Quest clicked:", quest);
  }, []);

  const handleIdeaClick = (idea: QuestIdea) => {
    console.log("Idea clicked:", idea);
  };

  const handleCreateQuest = () => {
    console.log("Create quest clicked");
  };

  // Calculate dynamic styles based on scroll progress
  // 
  // Simple behavior:
  // 1. Map barely peeks from bottom of screen (fixed position, mostly hidden)
  // 2. Cream panel rises from below, passing OVER the map
  // 3. Once cream panel clears the map (goes above it), map scrolls with cream panel
  //    as if they're on the same surface/paper
  
  const textScale = 1 - scrollProgress * 0.4;
  const textOpacity = 1 - scrollProgress * 2.5;
  const textTranslateY = scrollProgress * -15;
  
  const borderRadius = 32;
  
  // Map: barely visible at bottom, mostly off-screen initially
  const mapHeight = 60; // vh
  const mapInitialBottom = -45; // vh - only ~10vh visible (55 - 45 = 10vh peeking)
  
  // Cream panel rises from 0vh to 100vh
  const panelHeight = scrollProgress * 100;
  
  // The map's top edge is at: mapInitialBottom + mapHeight = -45 + 55 = 10vh from bottom
  // When the cream panel rises past 10vh, it has cleared the map's top
  // At that point, the map should start scrolling with the cream panel
  const mapTopFromBottom = mapInitialBottom + mapHeight; // 10vh
  const attachmentProgress = mapTopFromBottom / 100; // 0.10 (10% scroll)
  
  const isAttached = scrollProgress > attachmentProgress;
  
  // Before attachment: map stays fixed at initial position
  // After attachment: map rises with the scroll (same speed as cream panel)
  const mapBottom = isAttached 
    ? mapInitialBottom + (scrollProgress - attachmentProgress) * 60
    : mapInitialBottom;
  
  // Map always stays on top of the cream panel
  const mapZIndex = 40;
  
  // Content opacity and position
  const contentOpacity = Math.max(scrollProgress - 0.15, 0) * 1.5;
  const contentTranslateY = (1 - Math.min(scrollProgress * 1.5, 1)) * 40;

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Header */}
      <Header isLoggedIn={false} />

      {/* Hero Section - Sticky container for scroll effect */}
      <div className="relative h-[200vh]">
        {/* Sticky wrapper that stays in view during scroll */}
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Blue background with texture - isolated stacking context */}
          <div 
            className="absolute inset-0 z-0"
            style={{ 
              bottom: `${panelHeight}vh`,
              isolation: 'isolate'
            }}
          >
            {/* Paper texture overlay */}
            {/* <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-40" aria-hidden="true">
              <Image
                src="/images/paper.jpg"
                alt=""
                fill
                className="object-cover"
                quality={75}
                priority
              />
            </div> */}
            
            {/* Shadow/vignette overlay */}
            {/* <div className="absolute inset-0 pointer-events-none opacity-35 mix-blend-multiply" aria-hidden="true">
              <Image
                src="/images/shadows.jpg"
                alt=""
                fill
                className="object-cover"
                quality={75}
              />
            </div> */}
          </div>

          {/* Decorative clouds */}
          <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
            {/* Left cloud - bottom */}
            <Image
              src="/images/cloud-left.png"
              alt=""
              width={436}
              height={486}
              className="absolute left-0 bottom-[25%] max-md:hidden"
              style={{ transform: `translateY(${scrollProgress * 30}px)` }}
              priority
            />
            
            {/* Right cloud - top */}
            <Image
              src="/images/cloud-right.png"
              alt=""
              width={436}
              height={486}
              className="absolute right-0 top-[8%] max-md:hidden"
              style={{ transform: `translateY(${scrollProgress * -20}px)` }}
              priority
            />
          </div>

          {/* Hero Text - Animates on scroll, centered in the middle of the screen */}
          <div 
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none px-4 pb-80"
            style={{
              transform: `scale(${textScale}) translateY(${textTranslateY}vh)`,
              opacity: Math.max(textOpacity, 0),
            }}
          >
            <h1 
              className="text-[9.7vw] font-medium text-[#2D2E2A] text-center leading-tight"
              
            >
              Find a reason to 
              <br />
              explore the world
            </h1>
            <p 
              className="mt-8 text-xl md:text-4xl text-[#2D2E2A] text-center font-medium"
              
            >
              One quest at a time
            </p>
          </div>

          {/* Map - barely peeks initially, then scrolls with cream panel once it passes over */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[86%]"
            style={{
              bottom: `${mapBottom}vh`,
              height: `${mapHeight}vh`,
              maxHeight: "calc(100vh - 280px)",
              zIndex: mapZIndex,
            }}
          >
            <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90">
              {isMounted && (
                <MemoizedMap quests={mockQuests} onQuestClick={handleQuestClick} />
              )}
            </div>
          </div>

          {/* Cream content panel - rises from bottom, always below the map */}
          <div 
            className="absolute bottom-0 left-0 right-0 z-20"
            style={{
              height: `${panelHeight}vh`,
            }}
          >
            <div 
              className="absolute inset-0 bg-[#F5F3EF] overflow-hidden"
              style={{
                borderTopLeftRadius: `${borderRadius}px`,
                borderTopRightRadius: `${borderRadius}px`,
              }}
            >
              {/* Content wrapper - flexbox layout for consistent spacing */}
              <div className="h-full flex flex-col md:flex-row">
                {/* Description text - positioned on the left side */}
                <div 
                  className="p-6 md:p-8 lg:p-10 w-full md:w-[38%] lg:w-[38%] z-40 flex-shrink-0"
                  style={{
                    opacity: contentOpacity,
                    transform: `translateY(${contentTranslateY}px)`,
                  }}
                >
                  <p className="text-sm md:text-base lg:text-[1.75rem] text-[#1A1A1A]/80 leading-relaxed">
                   Create quests for others to discover, explore hidden 
                    gems in your neighborhood, and connect with your community through 
                    shared experiences—wherever they are—to help you make 
                    meaningful connections one quest at a time.
                  </p>
                  <button 
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-[#1A1A1A] font-medium text-sm hover:bg-gray-50 transition-all duration-200 shadow-sm border border-gray-200/80 w-fit hover:shadow-md"
                  >
                    Start exploring
                    <span className="w-5 h-5 rounded-full bg-[#8BA888] flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - After hero */}
      <main className="relative z-30 bg-[#F5F3EF] pt-8 pb-32">
        {/* Quests Table Section */}
        <section className="px-4 md:px-8 mb-16">
          <div className="max-w-4xl mx-auto">
            <QuestsTable
              quests={mockQuests}
              onQuestClick={handleQuestClick}
            />
          </div>
        </section>

        {/* Quest Ideas Section */}
        <section className="px-4 md:px-8 mb-12">
          <div className="max-w-4xl mx-auto">
            <QuestIdeasCarousel 
              ideas={questIdeas} 
              onIdeaClick={handleIdeaClick} 
            />
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={handleCreateQuest} />
    </div>
  );
}
