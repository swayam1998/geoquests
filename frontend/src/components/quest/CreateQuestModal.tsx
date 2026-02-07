"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { WarningCircle, Warning } from "@phosphor-icons/react";
import { checkLocationSafety, type LocationSafety } from "@/lib/location-validation";
import { questAPI } from "@/lib/api";

interface CreateQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lng: number };
  address: string;
  onQuestCreated?: () => void;
  onRadiusChange?: (radius: number) => void;
}

export function CreateQuestModal({
  isOpen,
  onClose,
  location,
  address,
  onQuestCreated,
  onRadiusChange,
}: CreateQuestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [radius, setRadius] = useState(50);
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoCount, setPhotoCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSafety, setLocationSafety] = useState<LocationSafety>({ safe: true });

  // Validate location when modal opens or location changes
  useEffect(() => {
    if (isOpen && location) {
      validateLocation();
    }
  }, [isOpen, location]);

  // Update radius in parent (for map circle)
  useEffect(() => {
    onRadiusChange?.(radius);
  }, [radius, onRadiusChange]);

  const validateLocation = async () => {
    if (!location) return;
    
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location }, async (results, status) => {
      if (status === "OK" && results && results[0]) {
        // Pass both geocode result and location for Street View check
        const safety = await checkLocationSafety(results[0], location);
        setLocationSafety(safety);
      } else {
        // If geocoding fails, allow but warn
        setLocationSafety({
          safe: true,
          reason: "Unable to verify location. Please ensure this is a public space.",
        });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!locationSafety.safe) {
      setError("Cannot create quest at this location. Please select a public space.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      await questAPI.createQuest({
        title: title.trim(),
        description: description.trim(),
        lat: location.lat,
        lng: location.lng,
        radius_meters: radius,
        visibility: isPrivate ? "private" : "public",
        photo_count: photoCount,
        is_paid: false, // Paid quests disabled for now
      });

      // Reset form
      setTitle("");
      setDescription("");
      setRadius(50);
      setIsPrivate(false);
      setPhotoCount(1);
      
      onQuestCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[min(90vh,calc(100vh-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quest</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Safety Warning */}
          {!locationSafety.safe && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <WarningCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" weight="regular" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    Private Location Detected
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {locationSafety.reason}
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Please select a public location like a park, restaurant, or public landmark.
                  </p>
                </div>
              </div>
            </div>
          )}

          {locationSafety.safe && locationSafety.reason && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Warning className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" weight="regular" />
                <p className="text-sm text-yellow-800">{locationSafety.reason}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Find the best sunset view"
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what explorers need to find or do at this location..."
              rows={4}
              required
            />
          </div>

          {/* Location Display */}
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium">{address}</p>
              <p className="text-muted-foreground mt-1">
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </p>
            </div>
          </div>

          {/* Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="radius">Radius: {radius}m</Label>
            </div>
            <Slider
              id="radius"
              value={[radius]}
              onValueChange={([value]) => setRadius(value)}
              min={10}
              max={1000}
              step={10}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10m</span>
              <span>1000m</span>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="visibility">Visibility</Label>
              <p className="text-sm text-muted-foreground">
                {isPrivate
                  ? "Only people with the link can view this quest"
                  : "Anyone can discover and complete this quest"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!isPrivate ? "font-medium" : "text-muted-foreground"}`}>
                Public
              </span>
              <Switch
                id="visibility"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <span className={`text-sm ${isPrivate ? "font-medium" : "text-muted-foreground"}`}>
                Private
              </span>
            </div>
          </div>

          {/* Paid Quest Toggle (Disabled) */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-0.5">
              <Label htmlFor="isPaid" className="text-base font-medium">
                Paid Quest
              </Label>
              <p className="text-sm text-muted-foreground">
                Paid quests allow you to set start and end dates
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Free</span>
              <Switch
                id="isPaid"
                checked={false}
                disabled={true}
                aria-label="Paid quest (coming soon)"
              />
              <span className="text-sm text-muted-foreground">Paid</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 Paid quests are coming soon! For now, all quests are free and start immediately.
            </p>
          </div>

          {/* Photo Count */}
          <div className="space-y-2">
            <Label htmlFor="photoCount">Number of Photos Required</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPhotoCount(Math.max(1, photoCount - 1))}
                disabled={photoCount <= 1}
              >
                −
              </Button>
              <Input
                id="photoCount"
                type="number"
                value={photoCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setPhotoCount(Math.min(5, Math.max(1, value)));
                }}
                min={1}
                max={5}
                className="w-20 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPhotoCount(Math.min(5, photoCount + 1))}
                disabled={photoCount >= 5}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              How many photos should explorers submit? (1-5)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!locationSafety.safe || !title.trim() || !description.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Quest"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
