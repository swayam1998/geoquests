# Google Maps Migration Guide

## Overview

This guide explains how to migrate from OpenStreetMap/Leaflet to Google Maps, including styling options and marker functionality.

## Current Implementation

- **Map Library**: Leaflet
- **Tile Provider**: OpenStreetMap
- **Geocoding**: Nominatim (OpenStreetMap)
- **Markers**: Leaflet markers with popups on click

## What Needs to Change

### 1. Dependencies

**Remove:**
- `leaflet` (or keep for gradual migration)
- `react-leaflet`
- `@types/leaflet`

**Add:**
- `@react-google-maps/api` - React wrapper for Google Maps
- Or use `@googlemaps/js-api-loader` for direct integration

### 2. API Key Setup

You'll need a Google Maps API key with these APIs enabled:
- **Maps JavaScript API** (for map rendering)
- **Places API** (for search/geocoding - optional but recommended)
- **Geocoding API** (for reverse geocoding - optional)

**Environment Variable:**
```bash
# frontend/.env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Cost Note:** Google Maps has a free tier ($200/month credit), which covers:
- ~28,000 map loads
- ~40,000 geocoding requests
- ~17,000 Places API requests

### 3. Code Changes

#### Main Changes:
1. **Map Component** (`QuestMap.tsx`): Replace Leaflet with Google Maps
2. **Search Functionality**: Switch from Nominatim to Google Places API
3. **Markers**: Use Google Maps markers instead of Leaflet markers
4. **Styling**: Remove Leaflet CSS, add Google Maps styles

#### Files to Modify:
- `frontend/src/components/map/QuestMap.tsx` - Complete rewrite
- `frontend/src/app/globals.css` - Remove Leaflet styles
- `frontend/package.json` - Update dependencies

## Google Maps Features

### ✅ Can You Style Google Maps?

**Yes!** Google Maps supports extensive styling through:
1. **Styled Maps** - JSON-based styling to customize colors, visibility, and styling of map features
2. **Map Types** - Roadmap, Satellite, Terrain, Hybrid
3. **Custom Themes** - Dark mode, minimal, custom color schemes

**Example Styled Map:**
```typescript
const mapStyles = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }]
  }
];
```

### ✅ Can You Add Pins/Markers?

**Yes!** Google Maps supports:
1. **Default Markers** - Standard red pins
2. **Custom Markers** - Your own images/icons
3. **Custom HTML Markers** - React components as markers
4. **Marker Clustering** - Group nearby markers

### ✅ Can You Show Modals on Hover?

**Yes!** Multiple approaches:
1. **InfoWindow** - Google's built-in popup (opens on click by default, but can be triggered on hover)
2. **Custom Overlay** - Create custom React components that appear on hover
3. **Marker with HTML** - Use custom HTML markers with hover events

**Recommended:** Use InfoWindow with hover event listeners for the best UX.

## Migration Steps

### Step 1: Install Dependencies

```bash
cd frontend
npm install @react-google-maps/api
# or
npm install @googlemaps/js-api-loader
```

### Step 2: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Maps JavaScript API" and "Places API"
4. Create credentials (API Key)
5. Restrict the key to your domain (for production)

### Step 3: Update Environment Variables

Add to `frontend/.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

### Step 4: Update Map Component

Replace `QuestMap.tsx` with Google Maps implementation (see example below).

### Step 5: Update Search

Replace Nominatim API calls with Google Places API.

### Step 6: Remove Leaflet Dependencies

```bash
npm uninstall leaflet react-leaflet @types/leaflet
```

Remove Leaflet CSS import from `globals.css`.

## Example Implementation

See the updated `QuestMap.tsx` component in the next section for a complete example.

## Cost Considerations

### Free Tier ($200/month credit):
- **Map Loads**: ~28,000 per month
- **Geocoding**: ~40,000 requests/month
- **Places API**: ~17,000 requests/month

### Pricing (after free tier):
- **Map Loads**: $7 per 1,000 loads
- **Geocoding**: $5 per 1,000 requests
- **Places API**: $17 per 1,000 requests

**Recommendation:** Monitor usage and set up billing alerts.

## Benefits of Google Maps

1. **Better Data Quality** - More accurate and up-to-date map data
2. **Familiar UX** - Users recognize Google Maps interface
3. **Rich Features** - Places API, Street View, Directions
4. **Better Mobile Support** - Optimized for mobile devices
5. **Business Data** - Rich POI data with ratings, photos, hours

## Drawbacks

1. **Cost** - Can get expensive at scale (vs free OpenStreetMap)
2. **API Key Management** - Need to secure and manage API keys
3. **Terms of Service** - Must comply with Google's ToS
4. **Dependency** - Relies on Google's service availability

## Next Steps

1. Get Google Maps API key
2. Review the example implementation
3. Test locally with API key
4. Gradually migrate (can run both side-by-side)
5. Monitor usage and costs
