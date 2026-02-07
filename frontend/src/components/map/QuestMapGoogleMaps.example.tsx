"use client";

/**
 * Example Google Maps implementation for QuestMap
 * 
 * This is a reference implementation showing:
 * - Styled Google Maps
 * - Custom markers with quest data
 * - InfoWindows that show on hover
 * - Google Places API search
 * 
 * To use this:
 * 1. Install: npm install @react-google-maps/api
 * 2. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
 * 3. Replace QuestMap.tsx with this implementation
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Quest } from "@/types";
import { useLoadScript, GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";

interface QuestMapProps {
  quests: Quest[];
  onQuestClick?: (quest: Quest) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  showSearch?: boolean;
}

// Custom map styles - you can customize colors, hide features, etc.
const mapStyles = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }], // Hide default POI labels
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }], // Light gray roads
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e3f2fd" }], // Light blue water
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#fafafa" }], // Light gray landscape
  },
];

// Map container styles
const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "1rem",
};

// Libraries to load (Places API for search)
const libraries: ("places")[] = ["places"];

export function QuestMapGoogleMaps({
  quests,
  onQuestClick,
  center = { lat: 40.7128, lng: -74.006 },
  zoom = 12,
  className = "",
  showSearch = true,
}: QuestMapProps) {
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [hoveredQuest, setHoveredQuest] = useState<Quest | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchBoxRef = useRef<HTMLInputElement | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Initialize search autocomplete
  useEffect(() => {
    if (!isLoaded || !searchBoxRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(
      searchBoxRef.current,
      {
        types: ["geocode", "establishment"],
        fields: ["geometry", "formatted_address", "name"],
      }
    );

    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapCenter({ lat, lng });
        setMapZoom(14);
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(14);
        }
        setSearchQuery(place.name || place.formatted_address || "");
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Initialize Places Service for search
    if (showSearch) {
      placesServiceRef.current = new google.maps.places.PlacesService(map);
    }
  }, [showSearch]);

  // Handle marker click
  const handleMarkerClick = (quest: Quest) => {
    setSelectedQuest(quest);
    setHoveredQuest(null);
    onQuestClick?.(quest);
  };

  // Handle marker hover (mouseenter)
  const handleMarkerHover = (quest: Quest) => {
    setHoveredQuest(quest);
  };

  // Handle marker leave (mouseleave)
  const handleMarkerLeave = () => {
    setHoveredQuest(null);
  };

  // Close InfoWindow
  const handleInfoWindowClose = () => {
    setSelectedQuest(null);
    setHoveredQuest(null);
  };

  if (loadError) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center">
          <p className="text-red-500">Error loading Google Maps. Please check your API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#F44D11' }} />
            <p className="text-gray-500 text-sm">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={onMapLoad}
        options={{
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Quest Markers */}
        {quests.map((quest) => (
          <Marker
            key={quest.id}
            position={{ lat: quest.location.lat, lng: quest.location.lng }}
            icon={{
              url: `data:image/svg+xml;base64,${btoa(`
                <svg width="40" height="50" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 0C9 0 0 9 0 20c0 11 20 30 20 30s20-19 20-30C40 9 31 0 20 0z" fill="#F44D11" stroke="#fff" stroke-width="2"/>
                  <text x="20" y="28" font-size="20" text-anchor="middle" fill="white">${quest.categoryIcon}</text>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(40, 50),
              anchor: new google.maps.Point(20, 50),
            }}
            onClick={() => handleMarkerClick(quest)}
            onMouseOver={() => handleMarkerHover(quest)}
            onMouseOut={handleMarkerLeave}
          />
        ))}

        {/* InfoWindow for selected quest (on click) */}
        {selectedQuest && (
          <InfoWindow
            position={{
              lat: selectedQuest.location.lat,
              lng: selectedQuest.location.lng,
            }}
            onCloseClick={handleInfoWindowClose}
          >
            <div style={{ minWidth: "200px", padding: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "24px" }}>{selectedQuest.categoryIcon}</span>
                <strong style={{ fontSize: "14px" }}>{selectedQuest.title}</strong>
              </div>
              <p style={{ color: "#666", fontSize: "13px", margin: "0 0 8px 0" }}>
                {selectedQuest.description}
              </p>
              <div style={{ fontSize: "12px", color: "#888" }}>
                {selectedQuest.avgRating && (
                  <span style={{ color: "#f59e0b" }}>★ {selectedQuest.avgRating}</span>
                )}
                {selectedQuest.avgRating && " · "}
                {selectedQuest.completionCount} completed
              </div>
            </div>
          </InfoWindow>
        )}

        {/* InfoWindow for hovered quest */}
        {hoveredQuest && hoveredQuest.id !== selectedQuest?.id && (
          <InfoWindow
            position={{
              lat: hoveredQuest.location.lat,
              lng: hoveredQuest.location.lng,
            }}
            options={{
              pixelOffset: new google.maps.Size(0, -10),
            }}
          >
            <div style={{ minWidth: "150px", padding: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "20px" }}>{hoveredQuest.categoryIcon}</span>
                <strong style={{ fontSize: "13px" }}>{hoveredQuest.title}</strong>
              </div>
              {hoveredQuest.avgRating && (
                <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
                  ★ {hoveredQuest.avgRating}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
          <div className="relative">
            <div className="flex items-center bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="pl-4 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchBoxRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places..."
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    if (autocompleteRef.current) {
                      autocompleteRef.current.set("place", null);
                    }
                  }}
                  className="pr-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
