"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Quest } from "@/types";
import { useLoadScript, GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { CreateQuestPanel } from "@/components/quest/CreateQuestPanel";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { questAPI } from "@/lib/api";
import { Share, Check, Eye, Compass } from "@phosphor-icons/react";

interface QuestMapProps {
  quests: Quest[];
  onQuestClick?: (quest: Quest) => void;
  onQuestCreated?: (questId: string) => void;
  selectedQuestId?: string | null; // ID of quest to center on and highlight
  center?: [number, number]; // [lat, lng] - maintaining compatibility with existing code
  zoom?: number;
  className?: string;
  showSearch?: boolean;
  allowQuestCreation?: boolean; // Allow clicking on map to create quests
  hideViewQuestButton?: boolean; // Hide "View Quest" button (e.g., when already on quest detail page)
  prefillData?: { title: string; description: string } | null; // Prefill data for create quest panel
  userLocation?: { lat: number; lng: number; accuracy?: number } | null; // Show "you are here" marker and use for default view
}

// Map container styles
const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "1rem",
};

// Libraries to load (Places API for search)
const libraries: ("places")[] = ["places"];

// Helper function to create solid map pin icon as SVG data URL for Google Maps markers
// Creates a solid filled pin icon
function getMapPinMarkerDataUrl(color: string = "#ef4444", size: number = 60): string {
  const height = size * 1.25; // Pin is taller than wide
  
  // Solid teardrop pin with white circle indicator
  const svgString = `<svg width="${size}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30">
    <!-- Teardrop pin shape - solid filled -->
    <path d="M12 2C8.1 2 5 5.1 5 9c0 4.5 7 12 7 12s7-7.5 7-12c0-3.9-3.1-7-7-7Z" 
          fill="${color}" 
          stroke="#ffffff" 
          stroke-width="1.5" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
    <!-- Inner circle indicator - white -->
    <circle cx="12" cy="9" r="3" 
            fill="#ffffff"/>
  </svg>`;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

// Single shared URL for all quest markers (avoids creating 100+ data URLs per render)
const DEFAULT_QUEST_MARKER_ICON_URL = getMapPinMarkerDataUrl("#ef4444", 60);

// Helper for clicked location marker (blue pin for quest being created, slightly larger)
function getClickedLocationMarkerDataUrl(): string {
  return getMapPinMarkerDataUrl("#3B82F6", 70); // Blue color to differentiate from existing quests
}

// Blue dot for "you are here" (matches common map UX)
function getUserLocationMarkerDataUrl(): string {
  const size = 44;
  const svgString = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="18" fill="#4285F4" stroke="#fff" stroke-width="4"/>
    <circle cx="22" cy="22" r="8" fill="#fff"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

export function QuestMap({
  quests,
  onQuestClick,
  onQuestCreated,
  selectedQuestId = null,
  center = [40.7128, -74.006], // Default to NYC
  zoom = 12,
  className = "",
  showSearch = true,
  allowQuestCreation = true,
  hideViewQuestButton = false,
  prefillData = null,
  userLocation = null,
}: QuestMapProps) {
  // Convert center from [lat, lng] array to { lat, lng } object for Google Maps
  const centerObj = center ? { lat: center[0], lng: center[1] } : { lat: 40.7128, lng: -74.006 };
  
  const { isAuthenticated, user } = useAuthContext();
  const router = useRouter();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [hoveredQuest, setHoveredQuest] = useState<Quest | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(centerObj);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [mapType, setMapType] = useState<string>("hybrid"); // Default to hybrid map
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCreateQuestModal, setShowCreateQuestModal] = useState(false);
  const [clickedAddress, setClickedAddress] = useState<string>("");
  const [isMapTypeMenuOpen, setIsMapTypeMenuOpen] = useState(false);
  const [questRadius, setQuestRadius] = useState<number>(10);
  const [showPlacePinMessage, setShowPlacePinMessage] = useState(false);
  
  // Initialize joinedQuests from quest data
  const [joinedQuests, setJoinedQuests] = useState<Set<string>>(() => {
    const joined = new Set<string>();
    quests.forEach(quest => {
      if (quest.hasJoined === true) {
        joined.add(quest.id);
      }
    });
    return joined;
  });
  
  // Update joinedQuests when quests change
  useEffect(() => {
    const joined = new Set<string>();
    quests.forEach(quest => {
      if (quest.hasJoined === true) {
        joined.add(quest.id);
      }
    });
    setJoinedQuests(joined);
  }, [quests]);
  const [shareLinks, setShareLinks] = useState<Map<string, string>>(new Map());
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState<string | null>(null);
  const [copiedQuestId, setCopiedQuestId] = useState<string | null>(null);
  const [isLoadingQuestSlug, setIsLoadingQuestSlug] = useState<string | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchBoxRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const radiusCircleRef = useRef<google.maps.Circle | null>(null);
  const whiteCircleRef = useRef<google.maps.Circle | null>(null);
  const hoverLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPrefillTitleRef = useRef<string | null>(null);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Initialize search autocomplete
  useEffect(() => {
    if (!isLoaded || !searchBoxRef.current || !showSearch) return;

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
      if (place.geometry?.location && mapRef.current) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const newCenter = { lat, lng };
        
        // Smoothly pan and zoom to the selected place
        // Use higher zoom level (16) to show the location clearly
        const targetZoom = 16;
        const currentZoom = mapRef.current.getZoom() || 12;
        
        // Update state
        setMapCenter(newCenter);
        setMapZoom(targetZoom);
        
        // Smoothly pan to location
        mapRef.current.panTo(newCenter);
        
        // Zoom in if currently zoomed out
        if (currentZoom < targetZoom) {
          mapRef.current.setZoom(targetZoom);
        }
        
        setSearchQuery(place.name || place.formatted_address || "");
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, showSearch]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverLeaveTimeoutRef.current) {
        clearTimeout(hoverLeaveTimeoutRef.current);
      }
    };
  }, []);

  // Auto-open create quest panel when prefillData is set (from carousel idea click)
  useEffect(() => {
    if (prefillData && isLoaded && mapRef.current) {
      // Check if this is a new idea (different title)
      const isNewIdea = previousPrefillTitleRef.current !== prefillData.title;
      
      // If panel is not open, or if it's a new idea, open it with map center as location
      if (!showCreateQuestModal || isNewIdea) {
        // Reset location if it's a new idea
        if (isNewIdea) {
          setClickedLocation(null);
          setClickedAddress("");
        }
        
        const center = mapRef.current.getCenter();
        if (center) {
          const clickedPoint = { lat: center.lat(), lng: center.lng() };
          setClickedLocation(clickedPoint);
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: clickedPoint }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              setClickedAddress(results[0].formatted_address);
            } else {
              setClickedAddress(`${clickedPoint.lat.toFixed(6)}, ${clickedPoint.lng.toFixed(6)}`);
            }
          });
          
          // Open the panel
          setShowCreateQuestModal(true);
          
          // Show ephemeral message to place pin
          setShowPlacePinMessage(true);
          
          // Hide message after 5 seconds
          setTimeout(() => {
            setShowPlacePinMessage(false);
          }, 5000);
          
          // Zoom in if needed for better location selection
          const currentZoom = mapRef.current.getZoom() || 12;
          if (currentZoom < 16) {
            mapRef.current.setZoom(16);
          }
        }
        
        // Update ref to track current prefill title
        previousPrefillTitleRef.current = prefillData.title;
      }
    } else if (!prefillData) {
      // Clear tracking when prefillData is cleared
      previousPrefillTitleRef.current = null;
      setShowPlacePinMessage(false);
    }
  }, [prefillData, isLoaded, showCreateQuestModal]);

  // Check for pending quest creation after login
  useEffect(() => {
    if (isAuthenticated && isLoaded && mapRef.current) {
      const pendingQuestFormData = sessionStorage.getItem('pendingQuestFormData');
      const returnUrl = sessionStorage.getItem('returnUrl');
      
      if (pendingQuestFormData && returnUrl) {
        try {
          const formData = JSON.parse(pendingQuestFormData);
          const { lat, lng, address } = formData;
          
          // Set location and open create quest panel
          const clickedPoint = { lat, lng };
          setClickedLocation(clickedPoint);
          
          // Set address if available
          if (address) {
            setClickedAddress(address);
          }
          
          // Pan and zoom to location
          mapRef.current.panTo(clickedPoint);
          const currentZoom = mapRef.current.getZoom() || 12;
          if (currentZoom < 16) {
            mapRef.current.setZoom(18);
          }
          
          // If address wasn't saved, reverse geocode
          if (!address) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: clickedPoint }, (results, status) => {
              if (status === "OK" && results && results[0]) {
                setClickedAddress(results[0].formatted_address);
              } else {
                setClickedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              }
            });
          }
          
          // Open panel - form data will be restored by CreateQuestPanel
          setShowCreateQuestModal(true);
        } catch (error) {
          console.error('Failed to restore quest creation state:', error);
        }
      }
    }
  }, [isAuthenticated, isLoaded]);

  // Update map center when prop changes
  useEffect(() => {
    if (center) {
      const newCenter = { lat: center[0], lng: center[1] };
      setMapCenter(newCenter);
      if (mapRef.current) {
        mapRef.current.setCenter(newCenter);
      }
    }
  }, [center]);

  // Handle selected quest - center map and highlight quest
  useEffect(() => {
    if (!selectedQuestId || !mapRef.current || !isLoaded) {
      return;
    }

    // Find the quest by ID
    const quest = quests.find(q => q.id === selectedQuestId);
    if (!quest) {
      return;
    }

    // Center map on quest location with smooth animation
    const questLocation = { lat: quest.location.lat, lng: quest.location.lng };
    
    // Set selected quest to show InfoWindow
    setSelectedQuest(quest);
    setHoveredQuest(null);
    
    // Pan and zoom to quest location smoothly
    mapRef.current.panTo(questLocation);
    mapRef.current.setZoom(16); // Zoom in close to show the quest clearly
    
    // Update state
    setMapCenter(questLocation);
    setMapZoom(16);
  }, [selectedQuestId, quests, isLoaded]);

  // Update or create circle when location or radius changes
  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    // Clear existing circles
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
      radiusCircleRef.current = null;
    }
    if (whiteCircleRef.current) {
      whiteCircleRef.current.setMap(null);
      whiteCircleRef.current = null;
    }

    // Only create circles if quest creation is allowed, we have a location and radius
    if (!allowQuestCreation || !clickedLocation || !questRadius) {
      return;
    }

    // Create white border circle first (behind)
    const whiteCircle = new google.maps.Circle({
      center: clickedLocation,
      radius: questRadius,
      fillColor: "transparent",
      fillOpacity: 0,
      strokeColor: "#ffffff",
      strokeOpacity: 1,
      strokeWeight: 6,
      clickable: false,
      draggable: false,
      editable: false,
      zIndex: 1,
      map: mapRef.current,
    });

    // Create radius circle in brand color (on top)
    const circle = new google.maps.Circle({
      center: clickedLocation,
      radius: questRadius,
      fillColor: "#F44D11",
      fillOpacity: 0.15,
      strokeColor: "#F44D11",
      strokeOpacity: 1,
      strokeWeight: 5,
      clickable: false,
      draggable: false,
      editable: false,
      zIndex: 2,
      map: mapRef.current,
    });

    // Store refs
    radiusCircleRef.current = circle;
    whiteCircleRef.current = whiteCircle;

    // Cleanup function
    return () => {
      if (circle) {
        circle.setMap(null);
      }
      if (whiteCircle) {
        whiteCircle.setMap(null);
      }
      radiusCircleRef.current = null;
      whiteCircleRef.current = null;
    };
  }, [clickedLocation, questRadius, allowQuestCreation]);

  // Clear clicked location and circles when quest creation is disabled
  useEffect(() => {
    if (!allowQuestCreation) {
      setClickedLocation(null);
      setClickedAddress("");
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setMap(null);
        radiusCircleRef.current = null;
      }
      if (whiteCircleRef.current) {
        whiteCircleRef.current.setMap(null);
        whiteCircleRef.current = null;
      }
    }
  }, [allowQuestCreation]);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Set initial map type
    if (mapType && google.maps.MapTypeId) {
      map.setMapTypeId(mapType as google.maps.MapTypeId);
    }
    
    // Add click listener to map (only if quest creation is allowed)
    if (allowQuestCreation) {
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const clickedPoint = { lat, lng };
          
          // Clear previous circles if they exist
          if (radiusCircleRef.current) {
            radiusCircleRef.current.setMap(null);
            radiusCircleRef.current = null;
          }
          if (whiteCircleRef.current) {
            whiteCircleRef.current.setMap(null);
            whiteCircleRef.current = null;
          }
          
          // Check current zoom level - only zoom in if zoomed out too much
          const currentZoom = map.getZoom() || 12;
          const targetZoom = 18; // Good zoom level to see 10-50m radius clearly
          
          // If zoomed out (zoom < 16), smoothly zoom in to the clicked point
          if (currentZoom < 16) {
            // Smooth zoom and pan to clicked location
            map.panTo(clickedPoint);
            map.setZoom(targetZoom);
          } else {
            // Already zoomed in - just pan to location smoothly
            map.panTo(clickedPoint);
          }
          
          // Set new location - allow all users to open the form
          setClickedLocation(clickedPoint);
          setShowCreateQuestModal(true);
          // Hide the place pin message since user has clicked
          setShowPlacePinMessage(false);
          // Don't reset radius - keep current value
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: clickedPoint }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              setClickedAddress(results[0].formatted_address);
            } else {
              setClickedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          });
        }
      });
    }
  }, [mapType, allowQuestCreation]);

  // Handle map type change
  const handleMapTypeChange = (newMapType: string) => {
    setMapType(newMapType);
    setIsMapTypeMenuOpen(false); // Close menu after selection
    if (mapRef.current && google.maps.MapTypeId) {
      mapRef.current.setMapTypeId(newMapType as google.maps.MapTypeId);
    }
  };

  // Map type options
  const mapTypes: Array<{ id: string; label: string; icon: string }> = [
    { id: "roadmap", label: "Map", icon: "🗺️" },
    { id: "satellite", label: "Satellite", icon: "🛰️" },
    { id: "hybrid", label: "Hybrid", icon: "🌍" },
    { id: "terrain", label: "Terrain", icon: "⛰️" },
  ];

  // Handle marker click
  const handleMarkerClick = (quest: Quest) => {
    // Clear any pending hover timeout
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    
    setSelectedQuest(quest);
    setHoveredQuest(null);
    // Close create quest modal if open and clear circles
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
      radiusCircleRef.current = null;
    }
    if (whiteCircleRef.current) {
      whiteCircleRef.current.setMap(null);
      whiteCircleRef.current = null;
    }
    setShowCreateQuestModal(false);
    setClickedLocation(null);
    onQuestClick?.(quest);
  };

  // Handle marker hover (mouseenter) - simple and immediate
  const handleMarkerHover = useCallback((quest: Quest) => {
    // Clear any pending hide timeout when hovering
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    
    // Only set if not already the hovered quest to prevent unnecessary re-renders
    if (hoveredQuest?.id !== quest.id) {
      setHoveredQuest(quest);
    }
  }, [hoveredQuest]);

  // Handle marker leave (mouseleave) - with delay to prevent flickering
  const handleMarkerLeave = useCallback(() => {
    // Clear any existing timeout
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
    }
    
    // Longer delay to allow smooth mouse movement to InfoWindow without flickering
    hoverLeaveTimeoutRef.current = setTimeout(() => {
      setHoveredQuest(null);
      hoverLeaveTimeoutRef.current = null;
    }, 300); // Increased from 100ms to 300ms for smoother experience
  }, []);

  // Close InfoWindow
  const handleInfoWindowClose = () => {
    setSelectedQuest(null);
    setHoveredQuest(null);
  };

  // Close create quest modal
  const handleCloseCreateQuestModal = () => {
    // Clear circles
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
      radiusCircleRef.current = null;
    }
    if (whiteCircleRef.current) {
      whiteCircleRef.current.setMap(null);
      whiteCircleRef.current = null;
    }
    setShowCreateQuestModal(false);
    setClickedLocation(null);
    setClickedAddress("");
    setShowPlacePinMessage(false);
    // Don't reset radius - keep it for next time
  };

  // Handle quest created
  const handleQuestCreated = (questId: string) => {
    // Close modal and reset state
    handleCloseCreateQuestModal();
    // Pass the quest ID to parent to select and show the new quest
    onQuestCreated?.(questId);
  };

  const handleJoinQuest = async (quest: Quest) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isJoining === quest.id) return;
    
    setIsJoining(quest.id);
    try {
      await questAPI.joinQuest(quest.id);
      setJoinedQuests(prev => new Set([...prev, quest.id]));
      
      // Navigate to quest page after joining
      try {
        // Fetch quest details to get the slug
        const questData = await questAPI.getQuest(quest.id);
        // Navigate to quest view page using slug if available, otherwise use ID
        const questIdentifier = questData.slug || quest.id;
        router.push(`/quest/${questIdentifier}`);
      } catch (navError: any) {
        console.error("Failed to navigate to quest:", navError);
        // Still show success even if navigation fails
      }
    } catch (error: any) {
      console.error("Failed to join quest:", error);
      alert(error.message || "Failed to join quest. Please try again.");
    } finally {
      setIsJoining(null);
    }
  };

  const handleShareQuest = async (quest: Quest) => {
    if (isSharing === quest.id) return;

    // Check if user can share (public quests or creator of private quests)
    const canShare = quest.visibility === "public" || 
                     (isAuthenticated && user && quest.creatorId === user.id);
    
    if (!canShare) {
      // Silently fail - user doesn't have permission
      console.warn("User doesn't have permission to share this quest");
      return;
    }

    setIsSharing(quest.id);
    try {
      // Try to get share link from cache first
      let shareLink = shareLinks.get(quest.id);
      
      if (!shareLink) {
        const response = await questAPI.getQuestShareLink(quest.id);
        shareLink = response.share_link;
        setShareLinks(prev => new Map(prev).set(quest.id, shareLink!));
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink);
      
      // Show "Link copied" on button
      setCopiedQuestId(quest.id);
      
      // Revert back to "Share Quest" after 2 seconds
      setTimeout(() => {
        setCopiedQuestId(null);
      }, 2000);
    } catch (error: any) {
      console.error("Failed to get share link:", error);
      // Silently fail - error is logged to console
    } finally {
      setIsSharing(null);
    }
  };

  const handleViewQuest = async (quest: Quest) => {
    if (isLoadingQuestSlug === quest.id) return;

    setIsLoadingQuestSlug(quest.id);
    try {
      // Fetch quest details to get the slug
      const questData = await questAPI.getQuest(quest.id);
      
      // Navigate to quest view page using slug if available, otherwise use ID
      const questIdentifier = questData.slug || quest.id;
      router.push(`/quest/${questIdentifier}`);
    } catch (error: any) {
      console.error("Failed to load quest:", error);
      alert(error.message || "Failed to load quest. Please try again.");
    } finally {
      setIsLoadingQuestSlug(null);
    }
  };

  if (loadError) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-muted rounded-2xl flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-red-500 font-medium mb-2">Error loading Google Maps</p>
            <p className="text-text-secondary text-sm">Please check your API key configuration.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-muted rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-text-secondary text-sm">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ minHeight: "400px" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={onMapLoad}
        options={{
          // Use default Google Maps styling (no custom styles) to show all standard features
          styles: undefined, // Use default Google Maps styles
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false, // We're using custom control
          fullscreenControl: false, // Removed fullscreen button
          mapTypeId: mapType as google.maps.MapTypeId,
          // Ensure all standard map features are visible
          clickableIcons: true, // Allow clicking on POIs, businesses, etc.
          // Enable scroll-to-zoom
          gestureHandling: "greedy", // Allows scroll-to-zoom without needing Ctrl/Cmd
          scrollwheel: true, // Enable mouse wheel zoom
        }}
      >
        {/* Quest Markers */}
        {quests.map((quest) => (
          <Marker
            key={quest.id}
            position={{ lat: quest.location.lat, lng: quest.location.lng }}
            icon={{
              url: DEFAULT_QUEST_MARKER_ICON_URL,
              scaledSize: new google.maps.Size(60, 75),
              anchor: new google.maps.Point(30, 75),
            }}
            onClick={() => handleMarkerClick(quest)}
            onMouseOver={() => handleMarkerHover(quest)}
            onMouseOut={handleMarkerLeave}
          />
        ))}

        {/* InfoWindow for selected quest (on click) */}
        {selectedQuest && (
          <InfoWindow
            key={`infowindow-${selectedQuest.id}`}
            position={{
              lat: selectedQuest.location.lat,
              lng: selectedQuest.location.lng,
            }}
            onCloseClick={handleInfoWindowClose}
            options={{
              maxWidth: 320,
              pixelOffset: new google.maps.Size(0, -10),
            }}
          >
            <div className="quest-info-window">
              {/* Header with title */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2 flex-1" style={{ letterSpacing: "-0.01em", marginTop: 0, paddingTop: 0 }}>
                    {selectedQuest.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedQuest.visibility === "public" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Public
                    </span>
                  )}
                  {selectedQuest.visibility === "private" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      Private
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                {selectedQuest.description}
              </p>

              {/* Quest Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-3 pb-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Radius</div>
                    <div className="text-sm font-medium text-gray-900">{selectedQuest.radiusMeters}m</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Completed</div>
                    <div className="text-sm font-medium text-gray-900">{selectedQuest.completionCount}</div>
                  </div>
                </div>
              </div>

              {/* Share and Join Buttons */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                {/* Share Button - Show if public or user is creator */}
                {(selectedQuest.visibility === "public" || 
                  (isAuthenticated && user && selectedQuest.creatorId === user.id)) && (
                  <Button
                    onClick={() => handleShareQuest(selectedQuest)}
                    disabled={isSharing === selectedQuest.id}
                    variant="outline"
                    className="w-full"
                  >
                    {isSharing === selectedQuest.id ? (
                      "Getting link..."
                    ) : copiedQuestId === selectedQuest.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2" weight="regular" />
                        Link copied
                      </>
                    ) : (
                      <>
                        <Share className="w-4 h-4 mr-2" weight="regular" />
                        Share Quest
                      </>
                    )}
                  </Button>
                )}
                
                {/* View Quest Button - hidden when hideViewQuestButton is true */}
                {!hideViewQuestButton && (
                  <Button
                    onClick={() => handleViewQuest(selectedQuest)}
                    disabled={isLoadingQuestSlug === selectedQuest.id}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoadingQuestSlug === selectedQuest.id ? (
                      "Loading..."
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" weight="regular" />
                        View Quest
                      </>
                    )}
                  </Button>
                )}
                
                {/* Join Quest Button */}
                {isAuthenticated && selectedQuest.creatorId !== user?.id && (
                  <Button
                    onClick={() => handleJoinQuest(selectedQuest)}
                    disabled={isJoining === selectedQuest.id || joinedQuests.has(selectedQuest.id)}
                    className="w-full disabled:opacity-50"
                  >
                    {isJoining === selectedQuest.id ? (
                      "Joining..."
                    ) : joinedQuests.has(selectedQuest.id) ? (
                      <>
                        <Check className="w-4 h-4 mr-2" weight="regular" />
                        Joined
                      </>
                    ) : (
                      "Join Quest"
                    )}
                  </Button>
                )}
                {!isAuthenticated && (
                  <Button
                    onClick={() => router.push("/login")}
                    className="w-full"
                  >
                    Sign in to Join Quest
                  </Button>
                )}
              </div>
            </div>
          </InfoWindow>
        )}

        {/* InfoWindow for hovered quest (shows on hover) - Full version with Join Quest button */}
        {hoveredQuest && hoveredQuest.id !== selectedQuest?.id && (
          <InfoWindow
            key={`hover-${hoveredQuest.id}`}
            position={{
              lat: hoveredQuest.location.lat,
              lng: hoveredQuest.location.lng,
            }}
            options={{
              pixelOffset: new google.maps.Size(0, -50), // Position above marker with less gap
              maxWidth: 320,
              disableAutoPan: true, // Prevent InfoWindow from moving the map
            }}
            onCloseClick={() => setHoveredQuest(null)}
          >
            <div 
              className="quest-info-window"
              onMouseEnter={() => {
                // Keep InfoWindow visible when mouse enters it - cancel any pending hide
                if (hoverLeaveTimeoutRef.current) {
                  clearTimeout(hoverLeaveTimeoutRef.current);
                  hoverLeaveTimeoutRef.current = null;
                }
              }}
              onMouseLeave={() => {
                // Hide InfoWindow when mouse leaves it - with delay for smooth transition
                handleMarkerLeave();
              }}
            >
              {/* Header with title */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2 flex-1" style={{ letterSpacing: "-0.01em", marginTop: 0, paddingTop: 0 }}>
                    {hoveredQuest.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {hoveredQuest.visibility === "public" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Public
                    </span>
                  )}
                  {hoveredQuest.visibility === "private" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      Private
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                {hoveredQuest.description}
              </p>

              {/* Quest Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-3 pb-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Radius</div>
                    <div className="text-sm font-medium text-gray-900">{hoveredQuest.radiusMeters}m</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Completed</div>
                    <div className="text-sm font-medium text-gray-900">{hoveredQuest.completionCount}</div>
                  </div>
                </div>
              </div>

              {/* Share and Join Buttons */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                {/* Share Button - Show if public or user is creator */}
                {(hoveredQuest.visibility === "public" || 
                  (isAuthenticated && user && hoveredQuest.creatorId === user.id)) && (
                  <Button
                    onClick={() => handleShareQuest(hoveredQuest)}
                    disabled={isSharing === hoveredQuest.id}
                    variant="outline"
                    className="w-full"
                  >
                    {isSharing === hoveredQuest.id ? (
                      "Getting link..."
                    ) : copiedQuestId === hoveredQuest.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2" weight="regular" />
                        Link copied
                      </>
                    ) : (
                      <>
                        <Share className="w-4 h-4 mr-2" weight="regular" />
                        Share Quest
                      </>
                    )}
                  </Button>
                )}
                
                {/* View Quest Button - hidden when hideViewQuestButton is true */}
                {!hideViewQuestButton && (
                  <Button
                    onClick={() => handleViewQuest(hoveredQuest)}
                    disabled={isLoadingQuestSlug === hoveredQuest.id}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoadingQuestSlug === hoveredQuest.id ? (
                      "Loading..."
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" weight="regular" />
                        View Quest
                      </>
                    )}
                  </Button>
                )}
                
                {/* Join Quest Button */}
                {isAuthenticated && hoveredQuest.creatorId !== user?.id && (
                  <Button
                    onClick={() => handleJoinQuest(hoveredQuest)}
                    disabled={isJoining === hoveredQuest.id || joinedQuests.has(hoveredQuest.id)}
                    className="w-full disabled:opacity-50"
                  >
                    {isJoining === hoveredQuest.id ? (
                      "Joining..."
                    ) : joinedQuests.has(hoveredQuest.id) ? (
                      <>
                        <Check className="w-4 h-4 mr-2" weight="regular" />
                        Joined
                      </>
                    ) : (
                      "Join Quest"
                    )}
                  </Button>
                )}
                {!isAuthenticated && (
                  <Button
                    onClick={() => router.push("/login")}
                    className="w-full"
                  >
                    Sign in to Join Quest
                  </Button>
                )}
              </div>
            </div>
          </InfoWindow>
        )}

        {/* User location marker - "you are here" */}
        {userLocation && (
          <Marker
            key="user-location"
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            icon={{
              url: getUserLocationMarkerDataUrl(),
              scaledSize: new google.maps.Size(44, 44),
              anchor: new google.maps.Point(22, 22),
            }}
            zIndex={500}
            title="You are here"
          />
        )}

        {/* Red pin marker for clicked location - only show when quest creation is allowed */}
        {allowQuestCreation && clickedLocation && (
          <Marker
            key={`quest-marker-${clickedLocation.lat}-${clickedLocation.lng}`}
            position={clickedLocation}
            icon={{
              url: getClickedLocationMarkerDataUrl(),
              scaledSize: new google.maps.Size(70, 88),
              anchor: new google.maps.Point(35, 88),
            }}
            zIndex={1000}
          />
        )}

        {/* Radius circle is now managed via useEffect and refs - no React component needed */}
      </GoogleMap>

      {/* Search Bar - responsive width so it doesn't touch edges on narrow screens */}
      {showSearch && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[min(28rem,calc(100vw-2rem))] transition-all duration-300 ${showCreateQuestModal ? 'sm:left-[calc(50%+12rem)]' : ''}`}>
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
                  className="pr-4 text-gray-400 hover:text-gray-600 rounded-md"
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

      {/* Ephemeral message to place pin - appears when panel opens from carousel */}
      {showPlacePinMessage && showCreateQuestModal && (
        <div className={`absolute top-20 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[min(28rem,calc(100vw-2rem))] transition-all duration-300 ${showCreateQuestModal ? 'sm:left-[calc(50%+12rem)]' : ''}`}>
          <div className="bg-brand text-brand-foreground rounded-xl shadow-lg border border-brand-hover px-5 py-3 flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Click on the map to place your quest location</p>
            </div>
            <button
              onClick={() => setShowPlacePinMessage(false)}
              className="text-white/80 hover:text-white transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Map Type Collapsible Menu - above zoom on mobile to avoid overlap */}
      <div className="absolute bottom-14 right-4 sm:bottom-4 sm:right-[70px] z-50">
        <div className="relative">
          {/* Main Button */}
          <Button
            variant="outline"
            onClick={() => setIsMapTypeMenuOpen(!isMapTypeMenuOpen)}
            className="bg-white shadow-lg border-gray-200 px-4 py-2.5 flex items-center gap-2 min-w-[120px] hover:bg-gray-50"
            title="Map Type"
          >
            <span className="text-base">
              {mapTypes.find((t) => t.id === mapType)?.icon || "🌍"}
            </span>
            <span>{mapTypes.find((t) => t.id === mapType)?.label || "Hybrid"}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isMapTypeMenuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>

          {/* Collapsible Menu */}
          {isMapTypeMenuOpen && (
            <>
              {/* Backdrop to close menu when clicking outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMapTypeMenuOpen(false)}
              />
              {/* Menu Items */}
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-[120px] z-50">
                {mapTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleMapTypeChange(type.id)}
                    className={`
                      w-full px-4 py-2.5 text-sm font-medium transition-colors
                      flex items-center gap-2
                      ${
                        mapType === type.id
                          ? "bg-brand text-brand-foreground"
                          : "text-foreground hover:bg-surface-hover"
                      }
                      ${type.id !== mapTypes[mapTypes.length - 1].id ? "border-b border-gray-100" : ""}
                    `}
                    title={type.label}
                  >
                    <span className="text-base">{type.icon}</span>
                    <span>{type.label}</span>
                    {mapType === type.id && (
                      <svg
                        className="w-4 h-4 ml-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hint banner when a quest idea is selected but no location picked yet */}
      {prefillData && !showCreateQuestModal && (
        <div className="absolute bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-5 py-3 flex items-center gap-3 max-w-sm pointer-events-none animate-fade-in">
          <Compass className="w-6 h-6 text-brand shrink-0" weight="duotone" />
          <div>
            <p className="text-sm font-medium text-gray-900 line-clamp-1">{prefillData.title}</p>
            <p className="text-xs text-gray-500">Click on the map to set the location</p>
          </div>
        </div>
      )}

      {/* Create Quest Panel - Left side on desktop, overlay on mobile */}
      {allowQuestCreation && (
        <div className={`absolute ${showCreateQuestModal ? 'left-0' : '-left-full sm:-left-96'} top-0 bottom-0 w-full sm:w-96 transition-all duration-300 z-50`}>
          <CreateQuestPanel
            isOpen={showCreateQuestModal}
            onClose={handleCloseCreateQuestModal}
            location={clickedLocation}
            address={clickedAddress}
            onQuestCreated={handleQuestCreated}
            onRadiusChange={setQuestRadius}
            prefillData={prefillData}
          />
        </div>
      )}
    </div>
  );
}
