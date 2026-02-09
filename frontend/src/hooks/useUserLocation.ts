"use client";

import { useState, useEffect, useRef } from "react";

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  error: string | null;
  isLoading: boolean;
}

/** Only update if position or accuracy changed meaningfully to avoid update loops from watchPosition. */
function isSamePosition(
  a: UserLocation | null,
  b: { lat: number; lng: number; accuracy: number }
): boolean {
  if (!a) return false;
  const same =
    Math.abs(a.lat - b.lat) < 1e-6 &&
    Math.abs(a.lng - b.lng) < 1e-6 &&
    Math.abs(a.accuracy - b.accuracy) < 0.5;
  return same;
}

/**
 * Hook to get the user's current geolocation.
 * Requests permission on mount and watches for position updates.
 */
export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastLocationRef = useRef<UserLocation | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    let watchId: number;

    const handleSuccess = (position: GeolocationPosition) => {
      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      if (isSamePosition(lastLocationRef.current, next)) return;
      lastLocationRef.current = next;
      setLocation(next);
      setError(null);
      setIsLoading(false);
    };

    const handleError = (err: GeolocationPositionError) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setError("Location permission denied");
          break;
        case err.POSITION_UNAVAILABLE:
          setError("Location unavailable");
          break;
        case err.TIMEOUT:
          setError("Location request timed out");
          break;
        default:
          setError("Unable to get location");
      }
      setIsLoading(false);
    };

    // Get initial position quickly with lower accuracy
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000, // Accept cached position up to 1 minute old
    });

    // Then watch for higher accuracy updates
    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { location, error, isLoading };
}
