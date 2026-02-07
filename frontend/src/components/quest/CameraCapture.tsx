"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, ArrowCounterClockwise, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  disabled?: boolean;
}

export function CameraCapture({ onCapture, disabled = false }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!disabled && !capturedImage) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [disabled, capturedImage]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });
      setStream(mediaStream);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : "Failed to access camera. Please check your device settings."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Create preview URL
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    startCamera();
  };

  const confirmPhoto = () => {
    if (!canvasRef.current || !capturedImage) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={startCamera} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Button onClick={retakePhoto} variant="outline" className="flex-1 touch-manipulation">
            <ArrowCounterClockwise className="w-4 h-4 mr-2" weight="regular" />
            Retake
          </Button>
          <Button onClick={confirmPhoto} className="flex-1 touch-manipulation">
            <Check className="w-4 h-4 mr-2" weight="regular" />
            Use This Photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3] max-h-[60vh] sm:max-h-none">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
              <p>Starting camera...</p>
            </div>
          </div>
        )}
      </div>
      <Button
        onClick={capturePhoto}
        disabled={!stream || disabled}
        className="w-full touch-manipulation"
        size="lg"
      >
        <Camera className="w-5 h-5 mr-2" weight="regular" />
        Capture Photo
      </Button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
