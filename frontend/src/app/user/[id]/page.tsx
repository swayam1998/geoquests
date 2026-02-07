"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { userAPI, questAPI } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { QuestMap } from "@/components/map/QuestMap";
import { Quest } from "@/types";
import { Button } from "@/components/ui/button";
import { Camera } from "@phosphor-icons/react";
import Image from "next/image";

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
  quests_created_count: number;
  quests_joined_count: number;
  quests_completed_count: number;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [createdQuests, setCreatedQuests] = useState<Quest[]>([]);
  const [joinedQuests, setJoinedQuests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"created" | "joined">("created");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load user profile
      const userData = await userAPI.getUser(userId);
      setUser(userData);

      // Load created quests
      const created = await userAPI.getUserCreatedQuests(userId);
      setCreatedQuests(convertApiQuestsToQuests(created));

      // Load joined quests
      const joined = await userAPI.getUserJoinedQuests(userId);
      setJoinedQuests(joined);
    } catch (err: any) {
      console.error("Failed to load user data:", err);
      setError(err.message || "Failed to load user profile");
    } finally {
      setIsLoading(false);
    }
  };

  const convertApiQuestsToQuests = (apiQuests: any[]): Quest[] => {
    return apiQuests.map((apiQuest) => {
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

      const icon = getCategoryIcon(apiQuest.title, apiQuest.description);
      const category = getCategory(icon);

      return {
        id: apiQuest.id,
        creatorId: apiQuest.creator_id,
        title: apiQuest.title,
        description: apiQuest.description,
        location: apiQuest.location,
        radiusMeters: apiQuest.radius_meters,
        type: "social",
        category,
        categoryIcon: icon,
        visibility: apiQuest.visibility,
        status: apiQuest.status as Quest['status'],
        completionCount: apiQuest.participant_count || 0,
        avgRating: undefined,
        hasJoined: apiQuest.has_joined ?? null,
        countryCode: "US",
        createdAt: apiQuest.created_at,
      };
    });
  };

  const handleQuestClick = (quest: Quest) => {
    setSelectedQuestId(quest.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-blue mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "User not found"}</p>
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

  const allQuests = activeTab === "created" ? createdQuests : convertApiQuestsToQuests(joinedQuests);
  const mapCenter: [number, number] = allQuests.length > 0 
    ? [allQuests[0].location.lat, allQuests[0].location.lng]
    : [40.7128, -74.006];

  return (
    <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-6 sm:pb-8">
        {/* User Profile Header */}
        <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl md:text-3xl font-bold flex-shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.display_name || "User"}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              ) : (
                <span>{user.display_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2 truncate">
                {user.display_name || "User"}
              </h1>
              <p className="text-sm sm:text-base text-text-secondary mb-2 sm:mb-4 truncate">{user.email}</p>
              {user.is_verified && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border" style={{ backgroundColor: '#FFF5F2', color: '#B8371A', borderColor: '#FFE5D9' }}>
                  ✓ Verified
                </span>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
            <div className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-action-blue">{user.quests_created_count}</div>
              <div className="text-xs sm:text-sm text-text-secondary mt-1">Quests Created</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">{user.quests_joined_count}</div>
              <div className="text-xs sm:text-sm text-text-secondary mt-1">Quests Joined</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: '#F44D11' }}>{user.quests_completed_count}</div>
              <div className="text-xs sm:text-sm text-text-secondary mt-1">Quests Completed</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6">
          <div className="border-b border-border">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("created")}
                className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center font-medium text-xs sm:text-sm transition-colors touch-manipulation ${
                  activeTab === "created"
                    ? "text-tab-active border-b-2 border-tab-active"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                Created ({createdQuests.length})
              </button>
              <button
                onClick={() => setActiveTab("joined")}
                className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center font-medium text-xs sm:text-sm transition-colors touch-manipulation ${
                  activeTab === "joined"
                    ? "text-tab-active border-b-2 border-tab-active"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                Joined ({joinedQuests.length})
              </button>
            </nav>
          </div>

          {/* Quest List */}
          <div className="p-3 sm:p-4 md:p-6">
            {allQuests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary">No quests found</p>
              </div>
            ) : (
              <div 
                className="overflow-y-auto pr-3 quest-list-scrollbar"
                style={{ 
                  maxHeight: '600px',
                  overflowY: 'auto'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                  {allQuests.map((quest) => {
                    const joinedQuest = activeTab === "joined" ? joinedQuests.find((q) => q.id === quest.id) : null;
                    const questSlug = joinedQuest?.slug;
                    
                    return (
                      <div
                        key={quest.id}
                        onClick={() => handleQuestClick(quest)}
                        className="bg-muted rounded-lg p-4 cursor-pointer hover:bg-surface-hover transition-colors border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{quest.title}</h3>
                            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{quest.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-text-secondary">
                                {quest.completionCount} completed
                              </span>
                              {activeTab === "joined" && joinedQuest?.joined_at && (
                                <span className="text-xs text-text-secondary">
                                  • Joined {new Date(joinedQuest.joined_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {activeTab === "joined" && questSlug && (
                              <div className="mt-3">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/quest/${questSlug}/submit`);
                                  }}
                                  size="sm"
                                  className="w-full text-white"
                                  style={{ background: 'linear-gradient(to right, #F44D11, #D43D0F)' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(to right, #D43D0F, #B8371A)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(to right, #F44D11, #D43D0F)';
                                  }}
                                >
                                  <Camera className="w-4 h-4 mr-2" weight="regular" />
                                  Submit Quest
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        {allQuests.length > 0 && (
          <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg overflow-hidden h-[400px] sm:h-[500px] md:h-[600px]">
            <QuestMap
              quests={allQuests}
              onQuestClick={handleQuestClick}
              selectedQuestId={selectedQuestId}
              center={mapCenter}
              zoom={12}
              className="w-full h-full"
              showSearch={false}
              allowQuestCreation={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
