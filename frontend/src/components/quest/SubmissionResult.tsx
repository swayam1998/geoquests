"use client";

import { CheckCircle, XCircle, MapPin, Image, Shield, Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SubmissionResultProps {
  success: boolean;
  pendingReview?: boolean;
  message?: string;
  contentMatchScore?: number;
  geminiGrade?: string;
  verificationResult?: {
    gps?: {
      verified: boolean;
      distance_meters: number;
      reason: string;
    };
    quality?: {
      score: number;
      is_blurry: boolean;
      is_too_dark: boolean;
      is_too_small: boolean;
    };
    faces?: {
      detected: number;
      blurred: number;
    };
    exif?: {
      validated?: boolean | null;
      reason?: string;
    };
  };
  rejectionReason?: string;
  questSlug?: string;
  /** URL of the submitted image to show the user what they submitted */
  submittedImageUrl?: string;
  /** Called when user clicks Try Again; use to clear result state and show form again */
  onTryAgain?: () => void;
}

export function SubmissionResult({
  success,
  pendingReview = false,
  message,
  contentMatchScore,
  geminiGrade,
  verificationResult,
  rejectionReason,
  questSlug,
  submittedImageUrl,
  onTryAgain,
}: SubmissionResultProps) {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (pendingReview) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-amber-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-amber-100">
            <Clock className="w-10 h-10 text-amber-600" weight="regular" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Under Review</h2>
          <p className="text-gray-600">
            Your photo passed initial verification and is now being reviewed by the quest creator. You&apos;ll be notified when it&apos;s approved.
          </p>
        </div>
        {submittedImageUrl && (
          <div className="mb-6 flex justify-center">
            <img
              src={submittedImageUrl}
              alt="Your submitted photo"
              className="rounded-lg border border-gray-200 shadow-sm max-h-64 w-auto object-contain"
            />
          </div>
        )}
        {(contentMatchScore != null || geminiGrade) && (
          <div className="space-y-2 mb-6 pt-6 border-t border-gray-200 text-sm text-gray-600">
            {contentMatchScore != null && (
              <p>Content match score: {contentMatchScore}/100</p>
            )}
            {geminiGrade && (
              <p>Grade: {geminiGrade}</p>
            )}
          </div>
        )}
        {questSlug && (
          <Link href={`/quest/${questSlug}`}>
            <Button className="w-full">Back to Quest</Button>
          </Link>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#FFE5D9' }}>
            <CheckCircle className="w-10 h-10" weight="regular" style={{ color: '#F44D11' }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quest Complete!</h2>
          <p className="text-gray-600">{message || "Your photo has been verified and submitted successfully."}</p>
        </div>
        {submittedImageUrl && (
          <div className="mb-6 flex justify-center">
            <img
              src={submittedImageUrl}
              alt="Your submitted photo"
              className="rounded-lg border border-gray-200 shadow-sm max-h-64 w-auto object-contain"
            />
          </div>
        )}
        {(contentMatchScore != null || geminiGrade) && (
          <div className="space-y-2 mb-4 text-sm text-gray-600">
            {contentMatchScore != null && <p>Content match score: {contentMatchScore}/100</p>}
            {geminiGrade && <p>Grade: {geminiGrade}</p>}
          </div>
        )}
        {verificationResult && (
          <div className="space-y-3 mb-6 pt-6 border-t border-gray-200">
            {verificationResult.gps && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" weight="regular" />
                <span className="text-gray-600">
                  Distance: {formatDistance(verificationResult.gps.distance_meters)}
                </span>
              </div>
            )}

            {verificationResult.quality && (
              <div className="flex items-center gap-3 text-sm">
                <Image className="w-4 h-4 text-gray-400 flex-shrink-0" weight="regular" />
                <span className="text-gray-600">
                  Quality Score: {verificationResult.quality.score}/100
                </span>
              </div>
            )}

            {verificationResult.faces && verificationResult.faces.blurred > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" weight="regular" />
                <span className="text-gray-600">
                  {verificationResult.faces.blurred} face{verificationResult.faces.blurred !== 1 ? "s" : ""} blurred for privacy
                </span>
              </div>
            )}
          </div>
        )}

        {questSlug && (
          <Link href={`/quest/${questSlug}`}>
            <Button className="w-full">Back to Quest</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-red-200">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <XCircle className="w-10 h-10 text-red-600" weight="regular" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Failed</h2>
        <p className="text-gray-600">{rejectionReason || message || "Your photo could not be verified."}</p>
      </div>

      {verificationResult && (
        <div className="space-y-3 mb-6 pt-6 border-t border-gray-200">
          {verificationResult.gps && !verificationResult.gps.verified && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" weight="regular" />
              <span className="text-gray-600">{verificationResult.gps.reason}</span>
            </div>
          )}

          {verificationResult.quality && (
            <>
              {verificationResult.quality.is_blurry && (
                <div className="flex items-start gap-3 text-sm">
                  <Image className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" weight="regular" />
                  <span className="text-gray-600">Image is too blurry. Please take a clearer photo.</span>
                </div>
              )}
              {verificationResult.quality.is_too_dark && (
                <div className="flex items-start gap-3 text-sm">
                  <Image className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" weight="regular" />
                  <span className="text-gray-600">Image is too dark. Please take a photo with better lighting.</span>
                </div>
              )}
              {verificationResult.quality.is_too_small && (
                <div className="flex items-start gap-3 text-sm">
                  <Image className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" weight="regular" />
                  <span className="text-gray-600">Image is too small. Minimum size: 640x480 pixels.</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(questSlug || onTryAgain) && (
        onTryAgain ? (
          <Button variant="outline" className="w-full" onClick={onTryAgain}>
            Try Again
          </Button>
        ) : (
          <Link href={`/quest/${questSlug}#submit`}>
            <Button variant="outline" className="w-full">Try Again</Button>
          </Link>
        )
      )}
    </div>
  );
}
