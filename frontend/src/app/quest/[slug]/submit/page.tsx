"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { questAPI, submissionAPI } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { GPSStatus } from "@/components/quest/GPSStatus";
import { CameraCapture } from "@/components/quest/CameraCapture";
import { SubmissionResult } from "@/components/quest/SubmissionResult";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react";
import Link from "next/link";

interface QuestDetail {
  id: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  radius_meters: number;
  slug: string | null;
}

export default function QuestSubmitPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [quest, setQuest] = useState<QuestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submission flow states
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<"success" | "failure" | null>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);

  useEffect(() => {
    loadQuest();
  }, [slug]);

  const loadQuest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const questData = await questAPI.getQuest(slug);
      setQuest({
        id: questData.id,
        title: questData.title,
        description: questData.description,
        location: questData.location,
        radius_meters: questData.radius_meters,
        slug: questData.slug,
      });
    } catch (err: any) {
      console.error("Failed to load quest:", err);
      setError(err.message || "Failed to load quest");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationReady = (location: { lat: number; lng: number; accuracy: number }) => {
    setGpsLocation(location);
    setGpsReady(true);
  };

  const handlePhotoCapture = (imageBlob: Blob) => {
    setPhoto(imageBlob);
  };

  const handleSubmit = async () => {
    if (!quest || !photo || !gpsLocation) return;

    setIsUploading(true);
    setError(null);

    try {
      // Convert blob to File
      const imageFile = new File([photo], "quest-photo.jpg", { type: "image/jpeg" });

      // Submit to API
      const response = await submissionAPI.submitQuestPhoto(
        quest.id,
        imageFile,
        {
          lat: gpsLocation.lat,
          lng: gpsLocation.lng,
          accuracy: gpsLocation.accuracy,
        },
        new Date().toISOString()
      );

      setSubmissionData(response);
      setResult("success");
    } catch (err: any) {
      console.error("Failed to submit:", err);
      setError(err.message || "Failed to submit photo");
      
      // Check if it's a verification error
      if (err.data && err.data.verification_result) {
        setSubmissionData({
          verification_result: err.data.verification_result,
          rejection_reason: err.data.message,
        });
      } else {
        setSubmissionData({
          rejection_reason: err.message || "Failed to submit photo",
        });
      }
      
      setResult("failure");
    } finally {
      setIsUploading(false);
    }
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

  if (error && !quest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!quest) return null;

  // Show result if submission completed
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-page-content pb-8">
          <SubmissionResult
            success={result === "success"}
            verificationResult={submissionData?.verification_result}
            rejectionReason={submissionData?.rejection_reason}
            questSlug={quest.slug || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-page-gradient-from via-page-gradient-via to-page-gradient-to">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-page-content pb-6 sm:pb-8">
        {/* Back button */}
        <Link href={`/quest/${slug}`}>
          <Button variant="ghost" className="mb-4 sm:mb-6 text-sm sm:text-base">
            <ArrowLeft className="w-4 h-4 mr-2" weight="regular" />
            Back to Quest
          </Button>
        </Link>

        {/* Quest info */}
        <div className="bg-card rounded-lg p-4 sm:p-6 shadow-sm border border-border mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 break-words">{quest.title}</h1>
          <p className="text-sm sm:text-base text-text-secondary break-words">{quest.description}</p>
        </div>

        {/* GPS Status */}
        <div className="mb-4 sm:mb-6">
          <GPSStatus
            questLocation={quest.location}
            questRadius={quest.radius_meters}
            onLocationReady={handleLocationReady}
          />
        </div>

        {/* Camera Capture */}
        {gpsReady && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Take a Photo</h2>
            <CameraCapture onCapture={handlePhotoCapture} disabled={isUploading} />
          </div>
        )}

        {/* Submit Button */}
        {photo && gpsReady && (
          <div className="mb-4 sm:mb-6">
            <Button
              onClick={handleSubmit}
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

        {/* Error message */}
        {error && result === null && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
