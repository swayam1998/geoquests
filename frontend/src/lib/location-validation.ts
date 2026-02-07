/**
 * Location validation utility
 * Checks if a location is safe for quest creation (public vs private)
 * Uses Street View availability as the primary indicator of public access
 */

// Safe location types - allow quest creation
const SAFE_TYPES = [
  'establishment',        // Businesses, restaurants, cafes
  'point_of_interest',   // Tourist attractions
  'park',                // Parks
  'restaurant',          // Restaurants
  'cafe',                // Cafes
  'store',               // Shops
  'tourist_attraction',  // Tourist spots
  'transit_station',     // Public transit
  'beach',               // Beaches
  'natural_feature',     // Natural landmarks
  'gym',                 // Gyms
  'bar',                 // Bars
  'museum',              // Museums
  'library',             // Libraries
  'church',              // Churches (public spaces)
  'mosque',              // Mosques
  'synagogue',           // Synagogues
  'stadium',             // Stadiums
  'amusement_park',      // Amusement parks
  'zoo',                 // Zoos
  'aquarium',            // Aquariums
];

// Unsafe location types - block quest creation
const UNSAFE_TYPES = [
  'street_address',      // Residential addresses
  'premise',             // Buildings (often residential)
  'subpremise',          // Apartment units
  'route',               // Streets (too generic, could be residential)
];

export interface LocationSafety {
  safe: boolean;
  reason?: string;
  locationType?: string;
}

/**
 * Check if Street View is available at a location
 * Street View availability is a strong indicator of public access
 * This only returns metadata (no images), so it's FREE
 * @param location - LatLng location to check
 * @returns Promise<boolean> - true if Street View is available
 */
export function checkStreetViewAvailability(
  location: google.maps.LatLng | google.maps.LatLngLiteral
): Promise<boolean> {
  return new Promise((resolve) => {
    const streetViewService = new google.maps.StreetViewService();
    
    streetViewService.getPanorama(
      { 
        location: location as google.maps.LatLng,
        radius: 50 // Search within 50 meters
      },
      (data, status) => {
        // Street View is available if status is OK
        // This only checks metadata, no images are loaded (FREE)
        resolve(status === google.maps.StreetViewStatus.OK);
      }
    );
  });
}

/**
 * Check if a location is safe for quest creation
 * Uses Street View availability as primary indicator, falls back to type-based validation
 * @param geocodeResult - Google Maps Geocoding API result
 * @param location - LatLng location (optional, for Street View check)
 * @returns Promise<LocationSafety> object
 */
export async function checkLocationSafety(
  geocodeResult: google.maps.GeocoderResult,
  location?: google.maps.LatLng | google.maps.LatLngLiteral
): Promise<LocationSafety> {
  // If location is provided, check Street View availability first
  if (location) {
    try {
      const hasStreetView = await checkStreetViewAvailability(location);
      
      // If Street View is available, it's very likely a public space
      if (hasStreetView) {
        const allTypes = [
          ...geocodeResult.address_components.flatMap(comp => comp.types),
          ...(geocodeResult.types || [])
        ];
        return {
          safe: true,
          locationType: determineLocationType(allTypes) || 'public_space'
        };
      }
      
      // If no Street View, continue with type-based validation below
    } catch (error) {
      // If Street View check fails, fall back to type-based validation
      console.warn('Street View check failed, using type-based validation:', error);
    }
  }
  
  // Fall back to type-based validation
  return checkLocationSafetyByType(geocodeResult);
}

/**
 * Check location safety based on address/place types (fallback method)
 * @param geocodeResult - Google Maps Geocoding API result
 * @returns LocationSafety object
 */
function checkLocationSafetyByType(
  geocodeResult: google.maps.GeocoderResult
): LocationSafety {
  // Get all address component types
  const addressTypes = geocodeResult.address_components.flatMap(
    comp => comp.types
  );
  
  // Get place types from the result
  const placeTypes = geocodeResult.types || [];
  
  // Combine all types
  const allTypes = [...addressTypes, ...placeTypes];
  
  // Check for unsafe types first
  const hasUnsafeType = UNSAFE_TYPES.some(type => 
    allTypes.includes(type)
  );
  
  if (hasUnsafeType) {
    // Additional check: if it's a premise but also an establishment
    // (e.g., a restaurant in a building), it's OK
    const isEstablishment = allTypes.includes('establishment') ||
                           allTypes.includes('point_of_interest') ||
                           allTypes.some(type => SAFE_TYPES.includes(type));
    
    if (isEstablishment) {
      // It's a business in a building - that's OK
      return { 
        safe: true,
        locationType: determineLocationType(allTypes)
      };
    }
    
    // It's likely a private residence
    return { 
      safe: false, 
      reason: 'This location appears to be private property. Quests can only be created in public spaces like parks, restaurants, cafes, or landmarks.',
      locationType: 'private_residence'
    };
  }
  
  // Check for safe types
  const hasSafeType = SAFE_TYPES.some(type => 
    allTypes.includes(type)
  );
  
  if (hasSafeType) {
    return { 
      safe: true,
      locationType: determineLocationType(allTypes)
    };
  }
  
  // If we can't determine, check if it's just coordinates (no address)
  // This might be a park or open space
  if (geocodeResult.formatted_address.match(/^\d+\.\d+, \d+\.\d+$/)) {
    // Just coordinates - likely an open space, allow but warn
    return { 
      safe: true, 
      reason: 'Unable to verify location type. Please ensure this is a public space.',
      locationType: 'unknown'
    };
  }
  
  // Default: if unclear, allow but warn
  return { 
    safe: true, 
    reason: 'Unable to verify if this is a public space. Please ensure you have permission to create quests here.',
    locationType: 'unknown'
  };
}

/**
 * Determine the type of location from address components
 */
function determineLocationType(types: string[]): string {
  // Check for specific types in order of specificity
  if (types.includes('park')) return 'park';
  if (types.includes('restaurant')) return 'restaurant';
  if (types.includes('cafe')) return 'cafe';
  if (types.includes('tourist_attraction')) return 'tourist_attraction';
  if (types.includes('store')) return 'store';
  if (types.includes('establishment')) return 'establishment';
  if (types.includes('point_of_interest')) return 'point_of_interest';
  if (types.includes('transit_station')) return 'transit_station';
  if (types.includes('natural_feature')) return 'natural_feature';
  
  return 'public_space';
}
