"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Quest } from "@/types";
import "leaflet/dist/leaflet.css";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface QuestMapProps {
  quests: Quest[];
  onQuestClick?: (quest: Quest) => void;
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  className?: string;
  showSearch?: boolean;
}

export function QuestMap({
  quests,
  onQuestClick,
  center = [40.7128, -74.006],
  zoom = 12,
  className = "",
  showSearch = true,
}: QuestMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initializingRef = useRef(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search for places using Nominatim (OpenStreetMap's geocoding service)
  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            "User-Agent": "GeoQuests/1.0",
          },
        }
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  // Handle selecting a search result
  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
    }
    
    setSearchQuery(result.display_name.split(",")[0]); // Show just the place name
    setShowResults(false);
    setSearchResults([]);
  };

  // Close results when clicking outside
  const handleBlur = () => {
    // Delay to allow click on results
    setTimeout(() => setShowResults(false), 200);
  };

  // Initialize map only once
  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (!mapRef.current || mapInstanceRef.current || initializingRef.current) return;
    
    initializingRef.current = true;

    // Dynamically import Leaflet
    const initMap = async () => {
      const L = (await import("leaflet")).default;

      // Check if container was removed during async import or map already created
      if (!mapRef.current || mapInstanceRef.current) {
        initializingRef.current = false;
        return;
      }

      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Create map
      const map = L.map(mapRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        attributionControl: false,
      });

      // Add tile layer - using OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setIsLoaded(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      initializingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update markers when quests change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const map = mapInstanceRef.current;
    
    // Import Leaflet for marker creation
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default;
      
      // Clear existing markers (except tile layer)
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Add markers for quests
      quests.forEach((quest) => {
        const marker = L.marker([quest.location.lat, quest.location.lng])
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 24px;">${quest.categoryIcon}</span>
                <strong style="font-size: 14px;">${quest.title}</strong>
              </div>
              <p style="color: #666; font-size: 13px; margin: 0 0 8px 0;">${quest.description}</p>
              <div style="font-size: 12px; color: #888;">
                ${quest.avgRating ? `<span style="color: #f59e0b;">★ ${quest.avgRating}</span> · ` : ""}
                ${quest.completionCount} completed
              </div>
            </div>
          `);

        marker.on("click", () => {
          onQuestClick?.(quest);
        });
      });
    });
  }, [quests, onQuestClick, isLoaded]);

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-2xl"
        style={{ minHeight: "400px" }}
      />
      
      {/* Search Bar */}
      {showSearch && isLoaded && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
          <div className="relative">
            <div className="flex items-center bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="pl-4 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={handleBlur}
                placeholder="Search places..."
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
              {isSearching && (
                <div className="pr-4">
                  <div className="w-4 h-4 border-2 border-[#8BA888] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {searchQuery && !isSearching && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  className="pr-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {result.display_name.split(",")[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.display_name.split(",").slice(1, 3).join(",")}
                    </p>
                  </button>
                ))}
              </div>
            )}
            
            {/* No Results */}
            {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500 text-center">No places found</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#8BA888] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
