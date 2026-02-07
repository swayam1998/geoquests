# Google Maps Migration - Quick Answers

## Your Questions Answered

### 1. What changes do we need to make?

**Summary of Changes:**

1. **Install Google Maps library**
   ```bash
   npm install @react-google-maps/api
   ```

2. **Get Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable "Maps JavaScript API" and "Places API"
   - Create API key
   - Add to `frontend/.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key`

3. **Replace QuestMap.tsx**
   - Current: Uses Leaflet + OpenStreetMap
   - New: Uses Google Maps API
   - See `QuestMapGoogleMaps.example.tsx` for reference

4. **Update search functionality**
   - Current: Nominatim (OpenStreetMap geocoding)
   - New: Google Places API Autocomplete

5. **Remove Leaflet dependencies** (optional, can keep for gradual migration)
   ```bash
   npm uninstall leaflet react-leaflet @types/leaflet
   ```

6. **Update CSS**
   - Remove `@import "leaflet/dist/leaflet.css"` from `globals.css`
   - Remove Leaflet-specific styles

---

### 2. Can we style the Google Map?

**✅ YES!** Google Maps supports extensive styling:

**Options:**
1. **Styled Maps (JSON)** - Customize colors, visibility, and styling of map features
2. **Map Types** - Roadmap, Satellite, Terrain, Hybrid
3. **Custom Themes** - Dark mode, minimal, custom color schemes

**Example Styled Map:**
```typescript
const mapStyles = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }] // Hide POI labels
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }] // Light gray roads
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e3f2fd" }] // Light blue water
  }
];
```

**What you can style:**
- Road colors and styles
- Water colors
- Landscape/terrain colors
- POI (Points of Interest) visibility
- Transit lines
- Labels and text
- Building colors
- And much more!

**Tools:**
- [Google Maps Styling Wizard](https://mapstyle.withgoogle.com/) - Visual editor
- [Snazzy Maps](https://snazzymaps.com/) - Pre-made styles

---

### 3. Can we add pins/markers for quest markers?

**✅ YES!** Multiple options:

**Option 1: Default Markers**
```typescript
<Marker position={{ lat, lng }} />
```

**Option 2: Custom Icon Markers** (Recommended for quests)
```typescript
<Marker
  position={{ lat, lng }}
  icon={{
    url: '/quest-marker.png', // Your custom image
    scaledSize: new google.maps.Size(40, 50),
  }}
/>
```

**Option 3: SVG Markers** (Best for quest icons)
```typescript
<Marker
  position={{ lat, lng }}
  icon={{
    url: `data:image/svg+xml;base64,${btoa(svgString)}`,
    scaledSize: new google.maps.Size(40, 50),
  }}
/>
```

**Option 4: HTML Markers** (Most flexible)
- Use React components as markers
- Full control over styling and interactions

**In the example implementation:**
- Each quest gets a custom marker with the quest's category icon (🎨, 🍜, etc.)
- Markers are styled with your brand color (#8BA888)

---

### 4. Can we show modals when hovering over markers?

**✅ YES!** Multiple approaches:

**Option 1: InfoWindow on Hover** (Recommended)
```typescript
// Track hovered quest
const [hoveredQuest, setHoveredQuest] = useState<Quest | null>(null);

// On marker hover
<Marker
  onMouseOver={() => setHoveredQuest(quest)}
  onMouseOut={() => setHoveredQuest(null)}
/>

// Show InfoWindow for hovered quest
{hoveredQuest && (
  <InfoWindow position={hoveredQuest.location}>
    <div>{hoveredQuest.title}</div>
  </InfoWindow>
)}
```

**Option 2: Custom Overlay**
- Create custom React components that appear on hover
- More control over styling and positioning

**Option 3: HTML Marker with Hover**
- Use HTML markers with CSS hover effects

**In the example implementation:**
- **Click**: Shows full InfoWindow with quest details
- **Hover**: Shows smaller InfoWindow with quest title and rating
- Both can be active simultaneously (hover shows preview, click shows full details)

---

## Implementation Steps

### Step 1: Get API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable APIs:
   - Maps JavaScript API
   - Places API (for search)
4. Create API Key
5. (Optional) Restrict key to your domain

### Step 2: Install Dependencies
```bash
cd frontend
npm install @react-google-maps/api
```

### Step 3: Add Environment Variable
Create/update `frontend/.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

### Step 4: Replace Map Component
1. Review `QuestMapGoogleMaps.example.tsx`
2. Copy to `QuestMap.tsx` (or merge changes)
3. Update imports in files using `QuestMap`

### Step 5: Test
1. Start dev server: `npm run dev`
2. Navigate to page with map
3. Verify:
   - Map loads
   - Markers appear
   - Hover shows InfoWindow
   - Click works
   - Search works

---

## Cost Information

### Free Tier: $200/month credit
- **Map Loads**: ~28,000 per month
- **Geocoding**: ~40,000 requests/month
- **Places API**: ~17,000 requests/month

### After Free Tier:
- **Map Loads**: $7 per 1,000 loads
- **Geocoding**: $5 per 1,000 requests
- **Places API**: $17 per 1,000 requests

**Recommendation:**
- Monitor usage in Google Cloud Console
- Set up billing alerts
- Consider caching map loads for repeat visitors

---

## Benefits vs OpenStreetMap

| Feature | OpenStreetMap | Google Maps |
|---------|--------------|-------------|
| **Cost** | Free | Free tier, then paid |
| **Data Quality** | Good (community) | Excellent (commercial) |
| **Familiarity** | Less familiar | Very familiar |
| **POI Data** | Limited | Rich (ratings, photos, hours) |
| **Mobile** | Good | Optimized |
| **Search** | Nominatim (basic) | Places API (advanced) |
| **Styling** | Limited | Extensive |
| **Support** | Community | Commercial |

---

## Next Steps

1. ✅ Review `QuestMapGoogleMaps.example.tsx`
2. ✅ Get Google Maps API key
3. ✅ Install dependencies
4. ✅ Test locally
5. ✅ Replace current implementation
6. ✅ Monitor usage and costs

---

## Files to Update

1. `frontend/src/components/map/QuestMap.tsx` - Replace with Google Maps version
2. `frontend/src/app/globals.css` - Remove Leaflet CSS
3. `frontend/package.json` - Add Google Maps dependency
4. `frontend/.env.local` - Add API key
5. `frontend/src/app/page.tsx` - No changes needed (uses QuestMap component)

---

## Need Help?

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [React Google Maps API Docs](https://react-google-maps-api-docs.netlify.app/)
- [Map Styling Wizard](https://mapstyle.withgoogle.com/)
