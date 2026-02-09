"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, UploadSimple, ArrowCounterClockwise, Check, Warning, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/quest/CameraCapture";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence"];
const ACCEPT_TYPES = [...ALLOWED_TYPES, ...HEIC_TYPES];

/** Convert HEIC/HEIF file to JPEG blob for preview and upload (backend expects JPEG/PNG). */
async function heicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!blob || !(blob instanceof Blob)) throw new Error("HEIC conversion failed");
  return new File([blob], file.name.replace(/\.[^.]+$/i, ".jpg"), { type: "image/jpeg" });
}

export type CaptureMethod = "live" | "upload";

export interface ExifLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface ExifPreview {
  hasGps: boolean;
  lat?: number;
  lng?: number;
  timestamp?: string;
  cameraModel?: string;
  width: number;
  height: number;
  error?: string;
}

interface PhotoInputProps {
  onCapture: (blob: Blob, captureMethod: CaptureMethod, exifLocation?: ExifLocation) => void;
  disabled?: boolean;
  /** When true, "Take a Photo" is disabled (e.g. user not in quest area). Upload remains available. */
  takePhotoDisabled?: boolean;
}

type InputMode = "choice" | "live" | "upload";

export function PhotoInput({ onCapture, disabled = false, takePhotoDisabled = false }: PhotoInputProps) {
  const [mode, setMode] = useState<InputMode>("choice");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [exifPreview, setExifPreview] = useState<ExifPreview | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(null);
    setUploadFile(null);
    setExifPreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    resetUpload();
    setUploadError(null);
    setIsProcessingFile(true);

    const isHeic = HEIC_TYPES.includes(rawFile.type) || /\.heic$/i.test(rawFile.name);

    // Parse EXIF from original file (HEIC has EXIF; heic2any output does not preserve it)
    let hasGps = false;
    let lat: number | undefined;
    let lng: number | undefined;
    let timestamp: string | undefined;
    let cameraModel: string | undefined;
    try {
      const exifr = (await import("exifr")).default;
      // Parse without pick first so we get all tags (exifr may use different key names for HEIC/JPEG)
      const exif = await exifr.parse(rawFile);
      if (exif && typeof exif === "object") {
        const latVal = exif.latitude ?? (exif as any).Latitude ?? (exif as any).GPSLatitude;
        const lngVal = exif.longitude ?? (exif as any).Longitude ?? (exif as any).GPSLongitude;
        if (latVal != null && lngVal != null) {
          const latNum = typeof latVal === "number" ? latVal : Number(latVal);
          const lngNum = typeof lngVal === "number" ? lngVal : Number(lngVal);
          if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
            hasGps = true;
            lat = latNum;
            lng = lngNum;
          }
        }
        const dt = exif.DateTimeOriginal ?? (exif as any).CreateDate;
        if (dt) {
          timestamp = dt instanceof Date ? dt.toISOString() : String(dt);
        }
        cameraModel = exif.Model ?? (exif as any).LensModel ?? (exif as any).Model ?? undefined;
      }
    } catch {
      // exifr may fail; continue without EXIF
    }

    let file: File = rawFile;
    if (isHeic) {
      try {
        file = await heicToJpeg(rawFile);
      } catch (err) {
        setIsProcessingFile(false);
        setUploadError("Could not convert HEIC image. Try saving as JPEG from your device.");
        return;
      }
    } else if (!ALLOWED_TYPES.includes(rawFile.type)) {
      setIsProcessingFile(false);
      setUploadError("Please select a JPEG, PNG, or HEIC image.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setIsProcessingFile(false);
      setUploadError("Image must be under 10MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      setIsProcessingFile(false);
      if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        setUploadError(`Image must be at least ${MIN_WIDTH}×${MIN_HEIGHT} pixels.`);
      }
      setUploadPreview(url);
      setExifPreview({
        hasGps,
        lat,
        lng,
        timestamp,
        cameraModel,
        width,
        height,
      });
      setUploadFile(file);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setIsProcessingFile(false);
      setUploadError("Could not load image.");
    };
    img.src = url;
  };

  const confirmUpload = () => {
    if (!uploadFile) return;
    const exifLocation: ExifLocation | undefined =
      exifPreview?.hasGps && exifPreview.lat != null && exifPreview.lng != null
        ? { lat: exifPreview.lat, lng: exifPreview.lng, accuracy: 0 }
        : undefined;
    onCapture(uploadFile as Blob, "upload", exifLocation);
  };

  const handleLiveCapture = (blob: Blob) => {
    onCapture(blob, "live");
  };

  if (mode === "choice") {
    const takeDisabled = disabled || takePhotoDisabled;
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">Choose how to add your photo:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => !takeDisabled && setMode("live")}
              disabled={takeDisabled}
            >
              <Camera className="w-8 h-8" weight="regular" />
              <span>Take a Photo</span>
            </Button>
            {takePhotoDisabled && (
              <p className="text-xs text-amber-600 text-center">Get within the quest area to take a photo</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => { setMode("upload"); setTimeout(() => fileInputRef.current?.click(), 0); }}
            disabled={disabled}
          >
            <UploadSimple className="w-8 h-8" weight="regular" />
            <span>Upload a Photo</span>
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES.join(",") + ",.heic,.heif"}
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  if (mode === "live") {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode("choice")}
          disabled={disabled}
        >
          ← Back to options
        </Button>
        <CameraCapture onCapture={handleLiveCapture} disabled={disabled} />
      </div>
    );
  }

  // mode === "upload"
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => { resetUpload(); setMode("choice"); }}
        disabled={disabled}
      >
        ← Back to options
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_TYPES.join(",") + ",.heic,.heif"}
        className="hidden"
        onChange={handleFileSelect}
      />
      {isProcessingFile && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <CircleNotch className="w-10 h-10 mx-auto text-action-blue animate-spin mb-2" weight="regular" />
          <p className="text-sm text-text-secondary">Processing image...</p>
        </div>
      )}
      {!uploadPreview && !isProcessingFile ? (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadSimple className="w-10 h-10 mx-auto text-muted-foreground mb-2" weight="regular" />
          <p className="text-sm text-text-secondary">Tap to select a photo (JPEG, PNG, or HEIC, max 10MB)</p>
        </div>
      ) : uploadPreview ? (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
            <img
              src={uploadPreview}
              alt="Upload preview"
              className="w-full h-full object-contain"
            />
          </div>
          {exifPreview && (
            <div className="bg-card rounded-lg p-4 border border-border text-sm space-y-1">
              {exifPreview.hasGps && (
                <p className="text-text-secondary">
                  Location: {exifPreview.lat?.toFixed(5)}, {exifPreview.lng?.toFixed(5)}
                </p>
              )}
              {!exifPreview.hasGps && (
                <div className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
                  <Warning className="w-4 h-4 flex-shrink-0 mt-0.5" weight="regular" />
                  <span>
                    This photo has no location data embedded. It may receive a lower verification score.
                  </span>
                </div>
              )}
              {exifPreview.timestamp && (
                <p className="text-text-secondary">Taken: {exifPreview.timestamp}</p>
              )}
              {exifPreview.cameraModel && (
                <p className="text-text-secondary">Camera: {exifPreview.cameraModel}</p>
              )}
              <p className="text-text-secondary">Size: {exifPreview.width}×{exifPreview.height}</p>
            </div>
          )}
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { resetUpload(); fileInputRef.current?.click(); }}
              disabled={disabled}
            >
              <ArrowCounterClockwise className="w-4 h-4 mr-2" weight="regular" />
              Choose another
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={confirmUpload}
              disabled={disabled || !!uploadError || (exifPreview != null && (exifPreview.width < MIN_WIDTH || exifPreview.height < MIN_HEIGHT))}
            >
              <Check className="w-4 h-4 mr-2" weight="regular" />
              Use this photo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
