"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { CircleNotch } from "@phosphor-icons/react";
import { QuestIdeasCarousel } from "@/components/quest/QuestIdeasCarousel";
import { QuestsTable } from "@/components/quest/QuestsTable";
import { getShuffledIdeas } from "@/lib/quest-ideas";
import { Quest, QuestIdea } from "@/types";
import { questAPI } from "@/lib/api";
import { useUserLocation } from "@/hooks/useUserLocation";

// Helper function to convert API quest to frontend Quest type
const convertApiQuestToQuest = (apiQuest: {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  radius_meters: number;
  visibility: 'public' | 'private';
  photo_count: number;
  participant_count?: number;
  submission_count?: number;
  has_joined?: boolean | null;
  status: string;
  created_at: string;
}): Quest => {
  // Default category mapping - you can enhance this later
  const getCategoryIcon = (title: string, description: string): string => {
    const text = (title + ' ' + description).toLowerCase();
    if (text.includes('food') || text.includes('restaurant') || text.includes('cafe') || text.includes('ramen')) return '🍜';
    if (text.includes('sunset') || text.includes('nature') || text.includes('park') || text.includes('view')) return '🌅';
    if (text.includes('art') || text.includes('mural') || text.includes('street')) return '🎨';
    if (text.includes('dmv') || text.includes('queue') || text.includes('line') || text.includes('wait')) return '⏱️';
    return '📍'; // Default icon
  };

  const getCategory = (icon: string): Quest['category'] => {
    if (icon === '🍜') return 'food';
    if (icon === '🌅') return 'nature';
    if (icon === '🎨') return 'art';
    if (icon === '⏱️') return 'practical';
    return 'memories';
  };

  const icon = getCategoryIcon(apiQuest.title, apiQuest.description);
  const category = getCategory(icon);

  return {
    id: apiQuest.id,
    creatorId: apiQuest.creator_id,
    title: apiQuest.title,
    description: apiQuest.description,
    location: apiQuest.location,
    radiusMeters: apiQuest.radius_meters,
    type: "social", // Default type for now
    category,
    categoryIcon: icon,
    visibility: apiQuest.visibility,
    status: apiQuest.status as Quest['status'],
    completionCount: apiQuest.submission_count ?? 0,
    avgRating: undefined, // Will be populated when we add ratings
    hasJoined: apiQuest.has_joined ?? null,
    countryCode: "US", // TODO: Get from location
    createdAt: apiQuest.created_at,
  };
};

// Default map center when user location is not yet available
const DEFAULT_MAP_CENTER: [number, number] = [40.74, -73.99];

// Lazy-load map so Google script and map bundle load only when user scrolls to map
const DynamicQuestMap = dynamic(
  () => import("@/components/map/QuestMap").then((m) => ({ default: m.QuestMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
        <CircleNotch className="w-10 h-10 animate-spin" weight="regular" aria-hidden />
        <span className="sr-only">Loading map...</span>
      </div>
    ),
  }
);

// Memoized Map component to prevent re-renders
const MemoizedMap = ({
  quests,
  onQuestClick,
  onQuestCreated,
  selectedQuestId,
  prefillData,
  center,
  userLocation,
}: {
  quests: Quest[];
  onQuestClick: (quest: Quest) => void;
  onQuestCreated: (questId: string) => void;
  selectedQuestId: string | null;
  prefillData: { title: string; description: string } | null;
  center: [number, number];
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
}) => {
  return useMemo(
    () => (
      <DynamicQuestMap
        quests={quests}
        onQuestClick={onQuestClick}
        onQuestCreated={onQuestCreated}
        selectedQuestId={selectedQuestId}
        prefillData={prefillData}
        center={center}
        userLocation={userLocation}
        zoom={12}
        className="w-full h-full"
        showSearch={true}
      />
    ),
    [quests, onQuestClick, onQuestCreated, selectedQuestId, prefillData, center, userLocation]
  );
};

export default function HomePage() {
  const [questIdeas, setQuestIdeas] = useState<QuestIdea[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mapVisible, setMapVisible] = useState(false);
  const [isLoadingQuests, setIsLoadingQuests] = useState(true);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [pendingIdea, setPendingIdea] = useState<QuestIdea | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const creamSectionRef = useRef<HTMLElement>(null);
  const creamInnerRef = useRef<HTMLDivElement>(null);
  const questTableSectionRef = useRef<HTMLElement>(null);
  const [questsTableVisible, setQuestsTableVisible] = useState(false);

  const { location: userLocation } = useUserLocation();
  // Center map on user's location once when we first get it; otherwise use default
  const [initialMapCenter, setInitialMapCenter] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (userLocation && initialMapCenter === null) {
      setInitialMapCenter([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation, initialMapCenter]);
  const mapCenter = initialMapCenter ?? DEFAULT_MAP_CENTER;

  // Fetch quests from API (smaller initial batch for faster first paint, then fetch rest in background)
  const fetchQuests = useCallback(async () => {
    try {
      setIsLoadingQuests(true);
      const initialLimit = 50;
      const apiQuests = await questAPI.getQuests({
        status: 'active',
        visibility: 'public',
        limit: initialLimit,
      });
      const convertedQuests = apiQuests.map(convertApiQuestToQuest);
      setQuests(convertedQuests);

      // If we got a full page, fetch the rest in the background so map/table can show more
      if (apiQuests.length >= initialLimit) {
        questAPI
          .getQuests({
            status: 'active',
            visibility: 'public',
            limit: 100,
            offset: initialLimit,
          })
          .then((more) => {
            const moreConverted = more.map(convertApiQuestToQuest);
            setQuests((prev) => [...prev, ...moreConverted]);
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
      setQuests([]);
    } finally {
      setIsLoadingQuests(false);
    }
  }, []);

  // Shuffle ideas only on client to avoid hydration mismatch
  useEffect(() => {
    setQuestIdeas(getShuffledIdeas(8));
    setIsMounted(true);
    fetchQuests();
  }, [fetchQuests]);

  // Scroll to map if hash is present (e.g., from "Create Quest" button)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#map') {
      // Small delay to ensure map is rendered
      setTimeout(() => {
        if (mapContainerRef.current) {
          mapContainerRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 300);
    }
  }, [isMounted]);

  // Lightweight scroll listener for hero fade + parallax
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (creamSectionRef.current) {
            const creamHeight = creamSectionRef.current.offsetHeight;
            const fadeOutPoint = creamHeight * 0.9; // 90% of cream section height
            const scrollY = window.scrollY;
            
            // Calculate opacity: fade from 1 to 0 as we scroll from 0 to fadeOutPoint
            const progress = Math.min(scrollY / fadeOutPoint, 1);
            setHeroOpacity(Math.max(1 - progress, 0));
            
            // Keep scrollProgress for parallax (based on viewport height)
            const parallaxProgress = Math.min(scrollY / window.innerHeight, 1);
            setScrollProgress(parallaxProgress);
          }

          // Cream section expand effect (direct DOM for 60fps)
          if (creamInnerRef.current && creamSectionRef.current) {
            const creamRect = creamSectionRef.current.getBoundingClientRect();
            const creamTop = creamRect.top;
            const viewportHeight = window.innerHeight;
            
            // Expansion triggers as cream section enters viewport
            // Progress: 0 when cream top is at viewport bottom, 1 when cream top reaches ~40% from top
            const expansionZone = viewportHeight * 0.6;
            const rawProgress = (viewportHeight - creamTop) / expansionZone;
            const t = Math.min(Math.max(rawProgress, 0), 1);
            
            // Ease-out cubic for a smooth deceleration feel
            const eased = 1 - Math.pow(1 - t, 3);
            
            // Width: 86% → 100%
            const width = 86 + (eased * 14);
            
            creamInnerRef.current.style.width = `${width}%`;
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Also recalculate on resize in case cream section height changes
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // IntersectionObserver for map entrance animation (one-time)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // IntersectionObserver for quest table: only render full table when section is in view
  useEffect(() => {
    const el = questTableSectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setQuestsTableVisible(true);
      },
      { rootMargin: "100px 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Handle quest click - navigate to map and center on quest
  const handleQuestClick = useCallback((quest: Quest) => {
    // Set the selected quest ID
    setSelectedQuestId(quest.id);
    
    // Scroll to map section smoothly
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    } else {
      // Fallback: scroll to top if map container ref not available
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Handle quest created - refresh list and show the newly created quest
  const handleQuestCreated = useCallback(async (questId: string) => {
    // Clear any pending idea since the quest was created
    setPendingIdea(null);
    
    // Set the newly created quest as selected first
    // This ensures it will be highlighted once the quest list updates
    setSelectedQuestId(questId);
    
    // Refresh the quest list
    await fetchQuests();
    
    // Smoothly scroll to map section to show the new quest
    // Use a small delay to ensure the quest list has updated and map has rendered
    setTimeout(() => {
      if (mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      } else {
        // Fallback: scroll to top if map container ref not available
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 150);
  }, [fetchQuests]);

  const handleIdeaClick = useCallback((idea: QuestIdea) => {
    // Store the idea for prefilling the create quest panel
    setPendingIdea(idea);
    
    // Scroll to map section smoothly
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-hero-bg grain-overlay">
      {/* Header */}
      <Header />

      {/* Hero Section - slightly shorter than viewport so cream section peeks; sticky so content scrolls over it */}
      <section className="sticky top-0 z-0 h-[95vh] min-h-[500px] overflow-hidden bg-hero-bg grain-overlay">
        {/* Decorative clouds - parallax, fade out with hero text */}
        <div 
          className="absolute inset-0 z-2 pointer-events-none overflow-hidden will-change-transform"
          style={{ opacity: heroOpacity }}
        >
          {/* Left cloud - bottom */}
          <Image
            src="/images/cloud-left.png"
            alt=""
            width={436}
            height={486}
            className="absolute left-0 bottom-[25%] max-md:hidden will-change-transform"
            style={{ transform: `translateY(${scrollProgress * 30}px)` }}
            priority
          />
          
          {/* Right cloud - top */}
          <Image
            src="/images/cloud-right.png"
            alt=""
            width={436}
            height={486}
            className="absolute right-0 top-[8%] max-md:hidden will-change-transform"
            style={{ transform: `translateY(${scrollProgress * -20}px)` }}
            priority
          />
        </div>

        {/* Hero Text - fades + scales + floats up on scroll */}
        <div 
          className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none px-4 will-change-transform"
          style={{
            opacity: heroOpacity,
            transform: `scale(${1 - scrollProgress * 0.1}) translateY(${scrollProgress * -50}px)`,
          }}
        >
          <h1 
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[9.7vw] font-black text-hero-text text-center uppercase leading-[0.9] tracking-tight px-4"
          >
            Find a reason to 
            <br />
            explore the world
          </h1>
          <p 
            className="mt-6 sm:mt-10 text-xl sm:text-2xl md:text-4xl lg:text-5xl text-hero-text text-center font-medium px-4"
          >
            One Quest at a time
          </p>
        </div>
      </section>

      {/* Cream content section - scrolls over the sticky hero */}
      {/* Full-width wrapper keeps the section in normal document flow */}
      <section ref={creamSectionRef} className="relative z-5">
        {/* Inner div gets the width/radius animation, centered via margin auto */}
        <div 
          ref={creamInnerRef}
          className="mx-auto bg-background shadow-xl overflow-hidden rounded-t-[2.5rem] will-change-[width]"
          style={{ width: '86%' }}
        >
          {/* Description text + button */}
          <div className="pt-16 sm:pt-20 md:pt-24 lg:pt-28 px-6 sm:px-8 md:px-10 lg:px-14 pb-4 sm:pb-6 md:pb-8 lg:pb-10 w-full md:w-[55%] lg:w-[40%]">
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground/80 leading-relaxed">
              GeoQuests provides real-time ground truth from people 
              actually on the scene. Whether you’re monitoring assets, 
              planning the perfect day, or scouting your next adventure, 
              we give you eyes on the ground to explore and decide 
              with absolute confidence.
            </p>
            <Button asChild className="mt-5 w-fit gap-2 text-sm sm:text-base">
              <Link href="/#map">
                Start exploring
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </Button>
          </div>

          {/* Carousel */}
          <div className="px-4 sm:px-6 md:px-8 lg:px-10 pb-8 overflow-hidden">
            <QuestIdeasCarousel 
              ideas={questIdeas} 
              onIdeaClick={handleIdeaClick} 
            />
          </div>

          {/* Map */}
          <div
            id="map"
            ref={mapContainerRef}
            className={`px-6 sm:px-10 md:px-16 lg:px-24 py-10 md:py-16 transition-opacity duration-700 ease-out
              ${mapVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="w-full h-[60vh] md:h-[70vh] min-h-[500px] max-h-[800px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90">
              {mapVisible && (
                <MemoizedMap 
                  quests={quests} 
                  onQuestClick={handleQuestClick}
                  onQuestCreated={handleQuestCreated}
                  selectedQuestId={selectedQuestId}
                  prefillData={pendingIdea ? { title: pendingIdea.title, description: pendingIdea.description } : null}
                  center={mapCenter}
                  userLocation={userLocation}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Quests Table */}
      <main className="relative z-5 bg-background pt-8 pb-32 pb-32-safe">
        {/* Quests Table Section - full table renders only when in view */}
        <section ref={questTableSectionRef} className="px-4 md:px-8 mb-16">
          <div className="max-w-4xl mx-auto">
            {isLoadingQuests ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <CircleNotch className="w-12 h-12 text-brand animate-spin" weight="regular" aria-hidden />
                <p className="text-sm text-muted-foreground">Loading quests...</p>
              </div>
            ) : !questsTableVisible ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Quests</h2>
                <p className="text-sm text-muted-foreground">
                  {quests.length} {quests.length === 1 ? "quest" : "quests"} — scroll down to view
                </p>
              </div>
            ) : (
              <QuestsTable
                quests={quests}
                onQuestClick={handleQuestClick}
                userLocation={userLocation}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
