"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { WarningCircle, Warning, X, Calendar as CalendarIcon, Question, Info } from "@phosphor-icons/react";
import { checkLocationSafety, type LocationSafety } from "@/lib/location-validation";
import { questAPI } from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useAuthContext } from "@/contexts/AuthContext";

interface CreateQuestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lng: number } | null;
  address: string;
  onQuestCreated?: (questId: string) => void;
  onRadiusChange?: (radius: number) => void;
  prefillData?: { title: string; description: string } | null;
}

export function CreateQuestPanel({
  isOpen,
  onClose,
  location,
  address,
  onQuestCreated,
  onRadiusChange,
  prefillData,
}: CreateQuestPanelProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [radius, setRadius] = useState(10); // Default to 10m
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoCount, setPhotoCount] = useState(1);
  const [isPaid, setIsPaid] = useState(false); // Default to open quests
  const [startDate, setStartDate] = useState<Date | undefined>(undefined); // Only for paid quests
  const [endDate, setEndDate] = useState<Date | undefined>(undefined); // Only for paid quests
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSafety, setLocationSafety] = useState<LocationSafety>({ safe: true });
  const prefillAppliedRef = useRef(false);

  // Reset prefill consumed flag when prefillData changes
  useEffect(() => {
    prefillAppliedRef.current = false;
  }, [prefillData]);

  // Apply prefill data when panel opens (only once per prefillData change)
  useEffect(() => {
    if (isOpen && prefillData && !prefillAppliedRef.current) {
      setTitle(prefillData.title);
      setDescription(prefillData.description);
      prefillAppliedRef.current = true;
    }
  }, [isOpen, prefillData]);

  // Restore form data after login (only once when panel opens after login)
  useEffect(() => {
    if (isOpen && isAuthenticated && location) {
      const savedFormData = sessionStorage.getItem('pendingQuestFormData');
      if (savedFormData) {
        try {
          const formData = JSON.parse(savedFormData);
          
          // Check if location matches (with small tolerance for floating point precision)
          const latMatch = Math.abs(formData.lat - location.lat) < 0.0001;
          const lngMatch = Math.abs(formData.lng - location.lng) < 0.0001;
          
          if (latMatch && lngMatch) {
            // Restore all form fields - use the saved values
            setTitle(formData.title || "");
            setDescription(formData.description || "");
            setRadius(formData.radius !== undefined ? formData.radius : 10);
            setIsPrivate(formData.isPrivate !== undefined ? formData.isPrivate : false);
            setPhotoCount(formData.photoCount !== undefined ? formData.photoCount : 1);
            setIsPaid(formData.isPaid !== undefined ? formData.isPaid : false);
            
            if (formData.isPaid && formData.startDate) {
              setStartDate(new Date(formData.startDate));
            } else {
              setStartDate(undefined);
            }
            
            if (formData.endDate) {
              setEndDate(new Date(formData.endDate));
            } else if (formData.endDate === null) {
              setEndDate(undefined);
            } else {
              setEndDate(undefined);
            }
            
            // Clear saved data after restoring
            sessionStorage.removeItem('pendingQuestFormData');
            console.log('Form data restored successfully:', formData);
          } else {
            console.log('Location mismatch - not restoring form data', {
              saved: { lat: formData.lat, lng: formData.lng },
              current: { lat: location.lat, lng: location.lng }
            });
          }
        } catch (error) {
          console.error('Failed to restore form data:', error);
          // Clear corrupted data
          sessionStorage.removeItem('pendingQuestFormData');
        }
      }
    }
  }, [isOpen, isAuthenticated, location]);

  // Validate location when panel opens or location changes
  useEffect(() => {
    if (isOpen && location) {
      validateLocation();
    }
  }, [isOpen, location]);

  // Update radius in parent (for map circle) - don't reset when location changes
  useEffect(() => {
    onRadiusChange?.(radius);
  }, [radius, onRadiusChange]);

  // Reset form when panel closes (but not if there's pending form data to restore)
  useEffect(() => {
    if (!isOpen) {
      // Check if there's pending form data - if so, don't reset (will be restored on next open)
      const hasPendingData = sessionStorage.getItem('pendingQuestFormData');
      
      if (!hasPendingData) {
        // Only reset if there's no pending data to restore
        setTitle("");
        setDescription("");
        setRadius(10);
        setIsPrivate(false);
        setPhotoCount(1);
        setIsPaid(false);
        setStartDate(undefined);
        setEndDate(undefined);
        setError(null);
        setLocationSafety({ safe: true });
      }
    }
  }, [isOpen]);

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

    if (!location) {
      setError("Please select a location on the map.");
      return;
    }

    if (!locationSafety.safe) {
      setError("Cannot create quest at this location. Please select a public space.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    // Validate minimum lengths
    if (title.trim().length < 10) {
      setError("Title must be at least 10 characters long.");
      return;
    }

    if (description.trim().length < 20) {
      setError("Description must be at least 20 characters long.");
      return;
    }

    // Validate dates
    if (startDate && endDate && endDate < startDate) {
      setError("End date must be after start date.");
      return;
    }

    // Check if user is authenticated before submitting
    if (!isAuthenticated) {
      // Store all form data in sessionStorage
      const formData = {
        title: title.trim(),
        description: description.trim(),
        lat: location.lat,
        lng: location.lng,
        radius,
        isPrivate,
        photoCount,
        isPaid,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        address,
        timestamp: Date.now(),
      };
      
      console.log('Saving form data before login:', formData);
      sessionStorage.setItem('pendingQuestFormData', JSON.stringify(formData));
      
      // Store return URL
      sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search);
      
      // Redirect to login
      router.push('/login?returnTo=createQuest');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdQuest = await questAPI.createQuest({
        title: title.trim(),
        description: description.trim(),
        lat: location.lat,
        lng: location.lng,
        radius_meters: radius,
        visibility: isPrivate ? "private" : "public",
        photo_count: photoCount,
        is_paid: isPaid,
        start_date: isPaid && startDate ? startDate.toISOString() : undefined,
        end_date: isPaid && endDate ? endDate.toISOString() : undefined,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setRadius(10);
      setIsPrivate(false);
      setPhotoCount(1);
      setIsPaid(false);
      setStartDate(undefined);
      setEndDate(undefined);
      
      // Pass the created quest ID to the callback
      onQuestCreated?.(createdQuest.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !location) {
    return null;
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-40 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-full sm:w-96 bg-card shadow-2xl z-50 flex flex-col overflow-hidden sm:border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-brand text-white">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Create Quest</h2>
        <button
          onClick={onClose}
          className="size-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" weight="regular" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              minLength={10}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/200 characters {title.length > 0 && title.length < 10 && (
                <span className="text-red-500">(minimum 10 characters)</span>
              )}
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
              minLength={20}
              required
            />
            <p className="text-xs text-muted-foreground">
              {description.length > 0 && description.length < 20 && (
                <span className="text-red-500">Minimum 20 characters required</span>
              )}
            </p>
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
              max={100}
              step={10}
              className="[&_[data-slot=slider-range]]:bg-brand [&_[data-slot=slider-thumb]]:border-brand"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10m</span>
              <span>100m</span>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Label id="visibility-label">Visibility</Label>
              <p className="text-sm text-muted-foreground">
                {isPrivate
                  ? "Only people with the link can view this quest"
                  : "Anyone can discover and complete this quest"}
              </p>
            </div>
            <div
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3"
              role="group"
              aria-labelledby="visibility-label"
            >
              <span className={`text-sm font-medium ${!isPrivate ? "text-foreground" : "text-muted-foreground"}`}>
                Public
              </span>
              <Switch
                id="visibility"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                aria-label="Toggle between public and private visibility"
              />
              <span className={`text-sm font-medium ${isPrivate ? "text-foreground" : "text-muted-foreground"}`}>
                Private
              </span>
            </div>
          </div>

          {/* Quest Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>Quest Type</Label>
              <div className="relative group">
                <button
                  type="button"
                  className="p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Quest type information"
                >
                  <Question className="w-4 h-4 text-gray-400" weight="regular" />
                </button>
                {/* Tooltip */}
                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <p>Paid quests are disabled for now. Please use Open Quest to create your quest. Paid quests will allow you to set start and end dates (coming soon).</p>
                  {/* Tooltip arrow */}
                  <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!isPaid ? "default" : "outline"}
                className="flex-1"
                onClick={() => setIsPaid(false)}
                disabled={isSubmitting}
              >
                Open Quest
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 opacity-60 cursor-not-allowed"
                disabled={true}
                title="Paid quests are disabled for now"
              >
                Paid Quest
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Open quests are available immediately and have no time restrictions.
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

          {/* Start Date - Shown for all quests (used when quest type supports it) */}
          <div className="space-y-2">
            <Label>Start Date {isPaid && <span className="text-red-500">*</span>}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" weight="regular" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              When should this quest become active? Open quests start immediately if not set.
            </p>
          </div>

          {/* End Date - Disabled for non-paid quests */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">End Date (Optional)</Label>
              <div className="relative group">
                <Info
                  className="w-4 h-4 text-muted-foreground shrink-0"
                  weight="regular"
                  aria-label="Why is end date disabled?"
                />
                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <p>End date is available for paid quests (coming soon). For open quests, quests have no expiration.</p>
                  <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 opacity-75 pointer-events-none">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="w-4 h-4" weight="regular" />
                <span>Not available for open quests</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              When should this quest expire? Available with paid quests (coming soon).
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t">
            <Button
              type="submit"
              className="w-full"
              disabled={
                !locationSafety.safe || 
                !title.trim() || 
                !description.trim() || 
                title.trim().length < 10 ||
                description.trim().length < 20 ||
                (isPaid && !startDate) ||
                (isPaid && startDate && endDate && endDate < startDate) ||
                isSubmitting
              }
            >
              {isSubmitting ? "Creating..." : "Create Quest"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
