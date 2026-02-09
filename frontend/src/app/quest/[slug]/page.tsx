"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { questAPI, submissionAPI } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { QuestMap } from "@/components/map/QuestMap";
import { GPSStatus } from "@/components/quest/GPSStatus";
import { PhotoInput, type CaptureMethod } from "@/components/quest/PhotoInput";
import { SubmissionResult } from "@/components/quest/SubmissionResult";
import { Quest } from "@/types";
import { useAuthContext } from "@/contexts/AuthContext";
import { useUserLocation } from "@/hooks/useUserLocation";
import { haversineDistance, formatDistance } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Check, MapPin, Users, Calendar, Camera, NavigationArrow, CircleNotch } from "@phosphor-icons/react";

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

interface ApprovedSubmission {
  id: string;
  image_url: string;
  submitted_at: string;
  explorer_id: string;
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
  const [approvedSubmissions, setApprovedSubmissions] = useState<ApprovedSubmission[]>([]);
  const [approvedSubmissionsLoading, setApprovedSubmissionsLoading] = useState(false);
  const [approvedSubmissionsError, setApprovedSubmissionsError] = useState<string | null>(null);
  const { location: userLocation, isLoading: isLocationLoading } = useUserLocation();

  // Submit section ref for scroll-into-view
  const submitSectionRef = useRef<HTMLDivElement>(null);

  // Submission flow state (for joined users, below the map)
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>("live");
  const [uploadExifLocation, setUploadExifLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<"success" | "failure" | "pending_review" | null>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Calculate distance from user to quest
  const distanceToQuest = useMemo(() => {
    if (!userLocation || !quest) return null;
    return haversineDistance(
      userLocation.lat,
      userLocation.lng,
      quest.location.lat,
      quest.location.lng
    );
  }, [userLocation, quest]);

  useEffect(() => {
    loadQuest();
  }, [slug]);

  // Load approved submissions when viewer is the quest creator
  const isCreator = isAuthenticated && user && quest !== null && quest.creator_id === user.id;
  useEffect(() => {
    if (!isCreator || !quest?.id) return;
    let cancelled = false;
    setApprovedSubmissionsLoading(true);
    setApprovedSubmissionsError(null);
    submissionAPI
      .getQuestSubmissions(quest.id, { status: "verified" })
      .then((list) => {
        if (!cancelled) {
          setApprovedSubmissions(
            list.map((s) => ({
              id: s.id,
              image_url: s.image_url,
              submitted_at: s.submitted_at,
              explorer_id: s.explorer_id,
            }))
          );
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setApprovedSubmissionsError(err.message || "Failed to load photos");
        }
      })
      .finally(() => {
        if (!cancelled) setApprovedSubmissionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCreator, quest?.id]);

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

  // Scroll to submit section when hash is #submit (e.g. from /quest/[slug]/submit redirect)
  useEffect(() => {
    if (!quest || !hasJoined || isCreator) return;
    if (typeof window !== "undefined" && window.location.hash === "#submit") {
      submitSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [quest, hasJoined, isCreator]);

  const handleScrollToSubmit = () => {
    submitSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLocationReady = (location: { lat: number; lng: number; accuracy: number }) => {
    setGpsLocation(location);
    setGpsReady(true);
  };

  const handlePhotoCapture = (
    imageBlob: Blob,
    method: CaptureMethod,
    exifLocation?: { lat: number; lng: number; accuracy?: number }
  ) => {
    setPhoto(imageBlob);
    setCaptureMethod(method);
    setUploadExifLocation(method === "upload" && exifLocation ? exifLocation : null);
  };

  const getLocationForSubmit = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    if (gpsLocation) return Promise.resolve(gpsLocation);
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Location is not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? 0,
          }),
        () => reject(new Error("Could not get your location. Please enable location access.")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  const handleSubmitPhoto = async () => {
    if (!quest || !photo) return;
    setIsUploading(true);
    setSubmissionError(null);
    try {
      let location: { lat: number; lng: number; accuracy: number };
      if (captureMethod === "upload" && uploadExifLocation) {
        location = {
          lat: uploadExifLocation.lat,
          lng: uploadExifLocation.lng,
          accuracy: uploadExifLocation.accuracy ?? 0,
        };
      } else {
        location = await getLocationForSubmit();
      }
      const imageFile = photo instanceof File ? photo : new File([photo], "quest-photo.jpg", { type: "image/jpeg" });
      const response = await submissionAPI.submitQuestPhoto(
        quest.id,
        imageFile,
        { lat: location.lat, lng: location.lng, accuracy: location.accuracy },
        new Date().toISOString(),
        captureMethod
      );
      setSubmissionData(response);
      setSubmissionResult(response.status === "pending_review" ? "pending_review" : "success");
    } catch (err: any) {
      console.error("Failed to submit:", err);
      setSubmissionError(err.message || "Failed to submit photo");
      if (err.data && err.data.verification_result) {
        setSubmissionData({
          verification_result: err.data.verification_result,
          rejection_reason: err.data.message,
        });
      } else {
        setSubmissionData({ rejection_reason: err.message || "Failed to submit photo" });
      }
      setSubmissionResult("failure");
    } finally {
      setIsUploading(false);
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
      <div className="relative min-h-screen bg-hero-bg grain-overlay">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/cloud-left.png"
            alt=""
            width={436}
            height={486}
            className="absolute left-0 bottom-[25%] max-md:hidden"
          />
          <Image
            src="/images/cloud-right.png"
            alt=""
            width={436}
            height={486}
            className="absolute right-0 top-[8%] max-md:hidden"
          />
        </div>
        <Header />
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-blue mx-auto mb-4"></div>
            <p className="text-hero-text">Loading quest...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="relative min-h-screen bg-hero-bg grain-overlay">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/cloud-left.png"
            alt=""
            width={436}
            height={486}
            className="absolute left-0 bottom-[25%] max-md:hidden"
          />
          <Image
            src="/images/cloud-right.png"
            alt=""
            width={436}
            height={486}
            className="absolute right-0 top-[8%] max-md:hidden"
          />
        </div>
        <Header />
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Quest not found"}</p>
            <Button onClick={() => router.push("/")}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const questForMap = convertToQuest(quest);

  return (
    <div className="relative min-h-screen bg-hero-bg grain-overlay">
      {/* Decorative clouds - same as hero */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/cloud-left.png"
          alt=""
          width={436}
          height={486}
          className="absolute left-0 bottom-[25%] max-md:hidden"
        />
        <Image
          src="/images/cloud-right.png"
          alt=""
          width={436}
          height={486}
          className="absolute right-0 top-[8%] max-md:hidden"
        />
      </div>

      <Header />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-page-content pb-6 sm:pb-8">
        {/* Quest Details Card */}
        <div className="bg-card rounded-xl sm:rounded-2xl border-2 border-white shadow-xl shadow-black/15 p-4 sm:p-6 mb-4 sm:mb-6">
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
          
          {/* Distance from user */}
          {(distanceToQuest !== null || isLocationLoading) && (
            <div className="mt-4 sm:mt-5 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
                <NavigationArrow className="w-4 h-4 text-blue-600" weight="fill" />
                {isLocationLoading ? (
                  <span className="text-sm text-blue-700 font-medium">Getting your location...</span>
                ) : distanceToQuest !== null ? (
                  <span className="text-sm text-blue-700 font-medium">
                    {formatDistance(distanceToQuest)} away from you
                  </span>
                ) : null}
              </div>
            </div>
          )}

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
              // User has joined - scroll to submit section below the map
              <Button
                onClick={handleScrollToSubmit}
                size="lg"
                className="flex-1 sm:flex-initial sm:min-w-[200px] text-sm sm:text-base"
              >
                <Camera className="w-5 h-5 mr-2" weight="regular" />
                Submit Quest
              </Button>
            ) : (
              // User hasn't joined - show Join Quest button
              <Button
                onClick={handleJoinQuest}
                disabled={isJoining || !isAuthenticated}
                className="flex-1 sm:flex-initial sm:min-w-[200px] disabled:opacity-50 text-sm sm:text-base"
              >
                {isJoining ? "Joining..." : "Join Quest"}
              </Button>
            )}
            {!isAuthenticated && (
              <Button
                onClick={() => router.push("/login")}
                className="flex-1 sm:flex-initial sm:min-w-[200px] text-sm sm:text-base"
              >
                Sign in to Join Quest
              </Button>
            )}
          </div>
        </div>

        {/* Photos from participants (creator only) */}
        {isCreator && (
          <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3 sm:mb-4">
              Photos from participants
            </h2>
            {approvedSubmissionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-blue" />
              </div>
            ) : approvedSubmissionsError ? (
              <p className="text-sm text-red-600 py-4">{approvedSubmissionsError}</p>
            ) : approvedSubmissions.length === 0 ? (
              <p className="text-sm text-text-secondary py-4">No approved photos yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {approvedSubmissions.map((sub) => (
                  <a
                    key={sub.id}
                    href={sub.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-action-blue"
                  >
                    <img
                      src={sub.image_url}
                      alt="Approved submission"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="bg-card rounded-xl sm:rounded-2xl border-2 border-white shadow-xl shadow-black/15 overflow-hidden h-[400px] sm:h-[500px] md:h-[600px]">
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

        {/* Submit section: photo + submit (only for joined, non-creator users) */}
        {hasJoined && !isCreator && (
          <div
            id="submit"
            ref={submitSectionRef}
            className="mt-4 sm:mt-6 bg-card rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-border relative"
          >
            {submissionResult ? (
              <SubmissionResult
                success={submissionResult === "success"}
                pendingReview={submissionResult === "pending_review"}
                verificationResult={submissionData?.verification_result}
                rejectionReason={submissionData?.rejection_reason}
                questSlug={quest.slug || undefined}
                submittedImageUrl={submissionData?.image_url}
                contentMatchScore={submissionData?.content_match_score}
                geminiGrade={submissionData?.gemini_result?.grade}
                onTryAgain={() => {
                  setSubmissionResult(null);
                  setSubmissionData(null);
                  setSubmissionError(null);
                }}
              />
            ) : (
              <>
                {isUploading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 rounded-xl sm:rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                      <CircleNotch className="w-12 h-12 text-action-blue animate-spin" weight="regular" />
                      <p className="text-sm font-medium text-foreground">Verifying submission...</p>
                    </div>
                  </div>
                )}
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Submit your photo</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Take a photo at the location (when you&apos;re in the quest area) or upload an existing photo from anywhere.
                </p>
                <div className="mb-4">
                  <GPSStatus
                    questLocation={quest.location}
                    questRadius={quest.radius_meters}
                    onLocationReady={handleLocationReady}
                  />
                </div>
                <div className="mb-4">
                  <h3 className="text-base font-medium text-foreground mb-2">Add a Photo</h3>
                  <PhotoInput
                    onCapture={handlePhotoCapture}
                    disabled={isUploading}
                    takePhotoDisabled={!gpsReady}
                  />
                </div>
                {photo && (
                  <div className="mb-4">
                    <Button
                      onClick={handleSubmitPhoto}
                      disabled={isUploading}
                      className="w-full touch-manipulation"
                      size="lg"
                    >
                      {isUploading ? (
                        <>
                          <CircleNotch className="w-5 h-5 mr-2 animate-spin" weight="regular" />
                          Verifying Submission...
                        </>
                      ) : (
                        "Submit Photo"
                      )}
                    </Button>
                  </div>
                )}
                {submissionError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    {submissionError}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
