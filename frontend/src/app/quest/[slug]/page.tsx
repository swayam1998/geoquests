"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { questAPI } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { QuestMap } from "@/components/map/QuestMap";
import { Quest } from "@/types";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, MapPin, Users, Calendar, Camera } from "@phosphor-icons/react";

interface QuestDetail {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  radius_meters: number;
  visibility: 'public' | 'private';
  photo_count: number;
  is_paid: boolean;
  slug: string | null;
  share_link: string | null;
  participant_count: number;
  has_joined: boolean | null;
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export default function QuestSharePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated, user } = useAuthContext();
  
  const [quest, setQuest] = useState<QuestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    loadQuest();
  }, [slug]);

  const loadQuest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const questData = await questAPI.getQuest(slug);
      setQuest(questData);
      setHasJoined(questData.has_joined || false);
    } catch (err: any) {
      console.error("Failed to load quest:", err);
      setError(err.message || "Failed to load quest");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinQuest = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!quest || isJoining) return;
    
    setIsJoining(true);
    try {
      await questAPI.joinQuest(quest.id);
      setHasJoined(true);
      // Reload quest data to get updated participant count
      await loadQuest();
    } catch (error: any) {
      console.error("Failed to join quest:", error);
      alert(error.message || "Failed to join quest. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const convertToQuest = (questDetail: QuestDetail): Quest => {
    const getCategoryIcon = (title: string, description: string): string => {
      const text = (title + ' ' + description).toLowerCase();
      if (text.includes('food') || text.includes('restaurant') || text.includes('cafe') || text.includes('ramen')) return '🍜';
      if (text.includes('sunset') || text.includes('nature') || text.includes('park') || text.includes('view')) return '🌅';
      if (text.includes('art') || text.includes('mural') || text.includes('street')) return '🎨';
      if (text.includes('dmv') || text.includes('queue') || text.includes('line') || text.includes('wait')) return '⏱️';
      return '📍';
    };

    const getCategory = (icon: string): Quest['category'] => {
      if (icon === '🍜') return 'food';
      if (icon === '🌅') return 'nature';
      if (icon === '🎨') return 'art';
      if (icon === '⏱️') return 'practical';
      return 'memories';
    };

    const icon = getCategoryIcon(questDetail.title, questDetail.description);
    const category = getCategory(icon);

    return {
      id: questDetail.id,
      creatorId: questDetail.creator_id,
      title: questDetail.title,
      description: questDetail.description,
      location: questDetail.location,
      radiusMeters: questDetail.radius_meters,
      type: "social",
      category,
      categoryIcon: icon,
      visibility: questDetail.visibility,
      status: questDetail.status as Quest['status'],
      completionCount: questDetail.participant_count || 0,
      avgRating: undefined,
      hasJoined: questDetail.has_joined ?? null,
      countryCode: "US",
      createdAt: questDetail.created_at,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-blue mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading quest...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Quest not found"}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-action-blue text-white rounded-lg hover:bg-action-blue-hover"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questForMap = convertToQuest(quest);
  const isCreator = isAuthenticated && user && quest.creator_id === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-page-content pb-6 sm:pb-8">
        {/* Quest Details Card */}
        <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Title - stays on top */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3 mb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words text-center">{quest.title}</h1>
            {quest.visibility === "public" ? (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mx-auto sm:mx-0">
                Public
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 mx-auto sm:mx-0">
                Private
              </span>
            )}
          </div>
          
          {/* Description - centered */}
          <p className="text-text-secondary text-sm sm:text-base md:text-lg mb-3 sm:mb-4 break-words text-center">{quest.description}</p>
          
          {/* Joined Status Indicator - centered */}
          {hasJoined && (
            <div className="mb-3 sm:mb-4 flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border" style={{ backgroundColor: '#FFF5F2', color: '#B8371A', borderColor: '#FFE5D9' }}>
                <Check className="w-4 h-4" weight="regular" />
                <span className="text-sm font-medium">You have joined this quest</span>
              </div>
            </div>
          )}
          
          {/* Coordinates Display - centered */}
          <div className="mb-3 sm:mb-4 text-sm text-text-secondary text-center">
            <span className="font-medium">Coordinates: </span>
            <span className="font-mono">{quest.location.lat.toFixed(6)}, {quest.location.lng.toFixed(6)}</span>
          </div>
          
          {/* Quest Stats - centered with icons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-2">
              <MapPin className="w-5 h-5 text-text-tertiary" weight="regular" />
              <div className="text-center">
                <div className="text-sm text-text-secondary">Radius</div>
                <div className="font-semibold text-foreground">{quest.radius_meters}m</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Users className="w-5 h-5 text-text-tertiary" weight="regular" />
              <div className="text-center">
                <div className="text-sm text-text-secondary">Participants</div>
                <div className="font-semibold text-foreground">{quest.participant_count}</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Calendar className="w-5 h-5 text-text-tertiary" weight="regular" />
              <div className="text-center">
                <div className="text-sm text-text-secondary">Created</div>
                <div className="font-semibold text-foreground">
                  {new Date(quest.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Camera className="w-5 h-5 text-text-tertiary" weight="regular" />
              <div className="text-center">
                <div className="text-sm text-text-secondary">Photos</div>
                <div className="font-semibold text-foreground">{quest.photo_count}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            {isCreator ? (
              // Creator view - no action needed since map is below
              null
            ) : hasJoined ? (
              // User has joined - show Upload Image button
              <Button
                onClick={() => router.push(`/quest/${slug}/submit`)}
                className="flex-1 sm:flex-initial sm:min-w-[200px] bg-brand hover:bg-brand-hover text-brand-foreground font-medium py-3 rounded-lg"
              >
                <Camera className="w-5 h-5 mr-2" weight="regular" />
                Upload Image
              </Button>
            ) : (
              // User hasn't joined - show Join Quest button
              <Button
                onClick={handleJoinQuest}
                disabled={isJoining || !isAuthenticated}
                className="flex-1 sm:flex-initial sm:min-w-[200px] bg-action-blue hover:bg-action-blue-hover text-white font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {isJoining ? "Joining..." : "Join Quest"}
              </Button>
            )}
            {!isAuthenticated && (
              <Button
                onClick={() => router.push("/login")}
                className="flex-1 sm:flex-initial sm:min-w-[200px] bg-action-blue hover:bg-action-blue-hover text-white font-medium py-3 rounded-lg"
              >
                Sign in to Join
              </Button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg overflow-hidden h-[400px] sm:h-[500px] md:h-[600px]">
          <QuestMap
            quests={[questForMap]}
            selectedQuestId={quest.id}
            center={[quest.location.lat, quest.location.lng]}
            zoom={15}
            className="w-full h-full"
            showSearch={false}
            allowQuestCreation={false}
            hideViewQuestButton={true}
          />
        </div>
      </div>
    </div>
  );
}
