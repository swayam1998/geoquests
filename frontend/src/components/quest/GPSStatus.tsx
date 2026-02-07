"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, NavigationArrow, WarningCircle, CheckCircle } from "@phosphor-icons/react";

interface GPSStatusProps {
  questLocation: { lat: number; lng: number };
  questRadius: number;
  onLocationReady: (location: { lat: number; lng: number; accuracy: number }) => void;
}

type GPSStatus = "acquiring" | "ready" | "weak" | "too_far";

export function GPSStatus({ questLocation, questRadius, onLocationReady }: GPSStatusProps) {
  const [status, setStatus] = useState<GPSStatus>("acquiring");
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("weak");
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const handlePosition = (position: GeolocationPosition) => {
      setCurrentLocation(position);
      const acc = position.coords.accuracy;
      setAccuracy(acc);

      const dist = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        questLocation.lat,
        questLocation.lng
      );
      setDistance(dist);

      // Determine status
      if (acc >= 100) {
        setStatus("weak");
      } else if (dist > questRadius) {
        setStatus("too_far");
      } else {
        setStatus("ready");
        // Notify parent that location is ready
        onLocationReady({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: acc,
        });
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error("GPS error:", error);
      setStatus("weak");
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [questLocation, questRadius, onLocationReady]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
      <div className="flex items-start gap-2 sm:gap-3">
        {status === "acquiring" && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5" />
        )}
        {status === "ready" && <CheckCircle className="w-5 h-5 mt-0.5" weight="regular" style={{ color: '#F44D11' }} />}
        {status === "weak" && <WarningCircle className="w-5 h-5 text-yellow-600 mt-0.5" weight="regular" />}
        {status === "too_far" && <MapPin className="w-5 h-5 text-red-600 mt-0.5" weight="regular" />}

        <div className="flex-1">
          {status === "acquiring" && (
            <div>
              <p className="font-medium text-sm sm:text-base text-gray-900">Acquiring GPS signal...</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Make sure you're in an open area for better accuracy
              </p>
            </div>
          )}

          {status === "ready" && (
            <div>
              <p className="font-medium text-sm sm:text-base" style={{ color: '#B8371A' }}>You're here! Ready to capture</p>
              {distance !== null && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {formatDistance(distance)} away • Accuracy: {accuracy ? `${Math.round(accuracy)}m` : "N/A"}
                </p>
              )}
            </div>
          )}

          {status === "weak" && (
            <div>
              <p className="font-medium text-sm sm:text-base text-yellow-700">GPS signal weak</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Move to an open area for better signal. Current accuracy: {accuracy ? `${Math.round(accuracy)}m` : "N/A"}
              </p>
            </div>
          )}

          {status === "too_far" && (
            <div>
              <p className="font-medium text-sm sm:text-base text-red-700">Too far from quest location</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                You are {distance ? formatDistance(distance) : "N/A"} away. Get within {questRadius}m to complete the quest.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
