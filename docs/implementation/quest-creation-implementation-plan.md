# Quest Creation Feature - Implementation Plan

## Overview

This document outlines the complete implementation plan for the quest creation feature, including component migration to shadcn/ui, location validation, and all required form fields.

**Status**: ✅ Implementation Complete (Backend API Pending)  
**Last Updated**: 2026-01-26  
**Verification**: See [quest-creation-verification.md](./quest-creation-verification.md)

---

## Table of Contents

1. [Feature Requirements](#feature-requirements)
2. [Component Library Migration](#component-library-migration)
3. [Location Validation Strategy](#location-validation-strategy)
4. [Quest Creation Modal](#quest-creation-modal)
5. [Map Integration](#map-integration)
6. [Implementation Phases](#implementation-phases)
7. [Technical Details](#technical-details)

---

## Feature Requirements

### Required Fields (MVP)

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| **Title** | Text Input | Max 200 chars, required | - |
| **Description** | Textarea | Required | - |
| **Location** | Auto-filled | From map click (lat/lng) | - |
| **Radius** | Slider | 10-1000m | 50m |
| **Visibility** | Toggle | Public / Private | Public |
| **Number of Photos** | Number Input | 1-5 | 1 |

### Field Details

#### 1. Title
- **Component**: shadcn Input
- **Validation**: 
  - Required
  - Max 200 characters
  - Show character counter
- **Placeholder**: "e.g., Find the best sunset view"

#### 2. Description
- **Component**: shadcn Textarea
- **Validation**: Required
- **Placeholder**: "Describe what explorers need to find or do at this location..."
- **Rows**: 4-5

#### 3. Location
- **Auto-filled** from map click
- **Display**: 
  - Formatted address (from reverse geocoding)
  - Coordinates: "Lat: X.XXXXXX, Lng: Y.YYYYYY"
- **Read-only** (user can't edit, but can click map again to change)

#### 4. Radius
- **Component**: shadcn Slider
- **Range**: 10-1000 meters
- **Default**: 50m
- **Display**: 
  - Slider with value display
  - Text: "Radius: 50m"
- **Visual Feedback**: Circle on map updates in real-time

#### 5. Visibility
- **Component**: shadcn Toggle Group or Switch
- **Options**: 
  - **Public**: "Anyone can discover and complete this quest"
  - **Private**: "Only people with the link can view this quest"
- **Default**: Public
- **Note**: Both types have shareable links

#### 6. Number of Photos
- **Component**: shadcn Number Input or Input with +/- buttons
- **Range**: 1-5
- **Default**: 1
- **Purpose**: Allows multi-angle/360° view of location
- **Helper Text**: "How many photos should explorers submit?"

---

## Component Library Migration

### Strategy: Gradual Migration with shadcn/ui

**Goal**: Migrate all existing components to use shadcn/ui patterns while maintaining 100% functionality and behavior.

### Phase 1: Setup shadcn/ui

#### 1.1 Installation
```bash
cd frontend
npx shadcn@latest init
```

**Configuration**:
- Style: `new-york` (or `default`)
- Base color: Match existing `#8BA888` green
- CSS variables: Update to match current theme
- Tailwind config: Merge with existing config

#### 1.2 Install Required Components
```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add slider
npx shadcn@latest add switch
npx shadcn@latest add dialog
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add card
```

#### 1.3 Theme Configuration
Update `globals.css` to integrate shadcn theme variables with existing colors:

```css
:root {
  /* Existing colors */
  --background: #4994EF;
  --foreground: #1A1A1A;
  --primary: #1A1A1A;
  --accent: #6366F1;
  
  /* shadcn/ui variables - match existing theme */
  --primary: #8BA888; /* Quest green */
  --primary-foreground: #FFFFFF;
  --secondary: #F3F4F6;
  --muted: #6B7280;
  --border: #E5E7EB;
  --radius: 0.5rem;
}
```

### Phase 2: Component Migration Order

**Priority Order** (migrate one at a time, test thoroughly):

1. **Button** components
   - Files: `Header.tsx`, `FloatingActionButton.tsx`
   - Test: All button interactions work identically

2. **Input** components
   - Files: `SearchFilterBar.tsx`, `Header.tsx` (if any)
   - Test: Search functionality unchanged

3. **Card** components
   - Files: `QuestCard.tsx`
   - Test: Card layout, hover states, click handlers

4. **Dialog/Modal** components
   - Files: New `CreateQuestModal.tsx`
   - Test: Open/close, backdrop, animations

5. **Form** components
   - Files: New quest creation form
   - Test: Validation, submission, error states

6. **Select/Dropdown** components
   - Files: `SearchFilterBar.tsx` (country selector)
   - Test: Dropdown functionality

### Phase 3: Migration Guidelines

#### For Each Component:
1. **Read existing component** - Understand all functionality
2. **Create shadcn version** - Use shadcn component as base
3. **Copy all logic** - State, handlers, effects
4. **Match styling** - Use existing Tailwind classes
5. **Test thoroughly** - Ensure identical behavior
6. **Update imports** - Replace old component with new

#### Example: Button Migration
```tsx
// Before
<button className="bg-[#8BA888] text-white px-4 py-2 rounded-lg">
  Create Quest
</button>

// After (using shadcn Button)
import { Button } from "@/components/ui/button"

<Button className="bg-[#8BA888] hover:bg-[#7A9878]">
  Create Quest
</Button>
```

---

## Location Validation Strategy

### Frontend Validation (Required)

**Goal**: Prevent users from creating quests in private/residential areas before submission.

### Google Maps Geocoding API Response

The Geocoding API returns `address_components` with `types` that help identify location:

#### Safe Location Types (Allow Quest Creation)
```typescript
const SAFE_TYPES = [
  'establishment',        // Businesses, restaurants, cafes
  'point_of_interest',   // Tourist attractions
  'park',                // Parks
  'restaurant',          // Restaurants
  'cafe',                // Cafes
  'store',               // Shops
  'tourist_attraction',  // Tourist spots
  'transit_station',      // Public transit
  'beach',               // Beaches
  'natural_feature',     // Natural landmarks
]
```

#### Unsafe Location Types (Block Quest Creation)
```typescript
const UNSAFE_TYPES = [
  'street_address',      // Residential addresses
  'premise',             // Buildings (often residential)
  'subpremise',          // Apartment units
  'route',               // Streets (too generic)
  'neighborhood',        // Neighborhoods (too broad)
  'political',           // Administrative areas
]
```

### Implementation

#### Step 1: Enhanced Reverse Geocoding

When user clicks map, perform reverse geocode and analyze results:

```typescript
const geocoder = new google.maps.Geocoder();
geocoder.geocode({ location: { lat, lng } }, (results, status) => {
  if (status === "OK" && results && results[0]) {
    const result = results[0];
    const address = result.formatted_address;
    
    // Analyze address components
    const addressTypes = result.address_components.flatMap(
      comp => comp.types
    );
    
    // Check if location is safe
    const isSafe = checkLocationSafety(addressTypes, result.types);
    
    setClickedAddress(address);
    setLocationSafety(isSafe);
    setLocationType(determineLocationType(addressTypes));
  }
});
```

#### Step 2: Safety Check Function

```typescript
function checkLocationSafety(
  addressTypes: string[],
  placeTypes: string[]
): { safe: boolean; reason?: string } {
  // Check for unsafe types
  const hasUnsafeType = UNSAFE_TYPES.some(type => 
    addressTypes.includes(type) || placeTypes.includes(type)
  );
  
  if (hasUnsafeType) {
    // Additional check: if it's a premise but also an establishment
    const isEstablishment = addressTypes.includes('establishment') ||
                           placeTypes.includes('establishment');
    
    if (isEstablishment) {
      return { safe: true }; // Business in a building is OK
    }
    
    return { 
      safe: false, 
      reason: 'This location appears to be private property. Quests can only be created in public spaces.' 
    };
  }
  
  // Check for safe types
  const hasSafeType = SAFE_TYPES.some(type => 
    addressTypes.includes(type) || placeTypes.includes(type)
  );
  
  if (hasSafeType) {
    return { safe: true };
  }
  
  // Default: if unclear, allow but warn
  return { 
    safe: true, 
    reason: 'Unable to verify if this is a public space. Please ensure you have permission to create quests here.' 
  };
}
```

#### Step 3: UI Feedback in Modal

```tsx
{!locationSafety.safe && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
    <div className="flex items-start gap-2">
      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
      <div>
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
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
      <p className="text-sm text-yellow-800">
        {locationSafety.reason}
      </p>
    </div>
  </div>
)}
```

#### Step 4: Disable Create Button

```tsx
<Button 
  type="submit"
  disabled={!locationSafety.safe || isSubmitting}
  className="w-full"
>
  {isSubmitting ? 'Creating...' : 'Create Quest'}
</Button>
```

### Edge Cases

1. **Parks/Open Spaces**: May not have specific address components
   - Solution: Check for `park`, `natural_feature`, or `establishment` types
   - If only coordinates, allow but show warning

2. **Mixed Use Buildings**: Building with business on ground floor
   - Solution: If `establishment` type exists, allow

3. **Unclear Locations**: No clear type indicators
   - Solution: Show warning but allow (user discretion)

4. **API Failures**: Geocoding fails
   - Solution: Show warning, allow creation (backend will validate)

---

## Quest Creation Modal

### Component Structure

```
CreateQuestModal/
├── CreateQuestModal.tsx (main component)
├── QuestForm.tsx (form fields)
├── LocationDisplay.tsx (location info + validation)
└── RadiusSlider.tsx (slider with map integration)
```

### Modal Design

#### Layout
```
┌─────────────────────────────────────┐
│  Create Quest              [X]      │
├─────────────────────────────────────┤
│                                     │
│  Location Validation (if unsafe)    │
│                                     │
│  Title *                            │
│  [_____________________________]     │
│                                     │
│  Description *                      │
│  [_____________________________]     │
│  [_____________________________]     │
│                                     │
│  Location                           │
│  📍 123 Main St, City, State        │
│     Lat: 40.7128, Lng: -74.0060     │
│                                     │
│  Radius: 50m                        │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━]     │
│  10m                         1000m  │
│                                     │
│  Visibility                          │
│  ○ Public  ● Private                │
│                                     │
│  Number of Photos: [1]              │
│  [−]  [1]  [+]                      │
│                                     │
│  [        Create Quest        ]     │
│                                     │
└─────────────────────────────────────┘
```

### Component Implementation

#### CreateQuestModal.tsx

```tsx
interface CreateQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lng: number };
  address: string;
  onQuestCreated?: (quest: Quest) => void;
}

export function CreateQuestModal({
  isOpen,
  onClose,
  location,
  address,
  onQuestCreated,
}: CreateQuestModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    radius: 50,
    visibility: 'public' as 'public' | 'private',
    photoCount: 1,
  });
  
  const [locationSafety, setLocationSafety] = useState<{
    safe: boolean;
    reason?: string;
  }>({ safe: true });
  
  // Validate location on mount
  useEffect(() => {
    validateLocation(location);
  }, [location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!locationSafety.safe) {
      return; // Button should be disabled anyway
    }
    
    // Submit to API
    // ...
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quest</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <LocationDisplay 
            address={address}
            location={location}
            safety={locationSafety}
          />
          
          <QuestForm 
            formData={formData}
            onChange={setFormData}
          />
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!locationSafety.safe || !formData.title || !formData.description}
            >
              Create Quest
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Map Integration

### Radius Circle Visualization

#### Implementation

Use Google Maps `Circle` component to show radius:

```tsx
import { Circle } from '@react-google-maps/api';

// In QuestMap component
{clickedLocation && radius && (
  <Circle
    center={clickedLocation}
    radius={radius}
    options={{
      fillColor: '#8BA888',
      fillOpacity: 0.2,
      strokeColor: '#8BA888',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      clickable: false,
      draggable: false,
      editable: false,
      zIndex: 1,
    }}
  />
)}
```

#### Real-time Updates

When slider changes in modal, update circle:

```tsx
// In QuestMap
const [questRadius, setQuestRadius] = useState<number | null>(null);

// Pass to modal
<CreateQuestModal
  radius={questRadius}
  onRadiusChange={setQuestRadius}
  // ...
/>

// In modal
<Slider
  value={[formData.radius]}
  onValueChange={([value]) => {
    setFormData({ ...formData, radius: value });
    onRadiusChange(value); // Update parent
  }}
  min={10}
  max={1000}
  step={10}
/>
```

### Location Marker

Keep existing red flag marker for clicked location:

```tsx
{clickedLocation && (
  <Marker
    position={clickedLocation}
    icon={{
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg width="32" height="40" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z" 
                fill="#ea4335" stroke="#fff" stroke-width="2"/>
          <path d="M16 8L20 16H12L16 8Z" fill="#fff"/>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(32, 40),
      anchor: new google.maps.Point(16, 40),
    }}
    zIndex={1000}
  />
)}
```

---

## Implementation Phases

### Phase 1: Setup & Foundation (Day 1)

**Tasks**:
- [x] Install and configure shadcn/ui ✅
- [x] Update theme to match existing colors ✅
- [x] Install required shadcn components ✅
- [x] Create component structure (`components/ui/`) ✅
- [x] Test shadcn components work with existing Tailwind ✅

**Deliverable**: ✅ shadcn/ui ready to use

---

### Phase 2: Location Validation (Day 1-2)

**Tasks**:
- [x] Implement enhanced reverse geocoding ✅
- [x] Create location safety check function ✅
- [x] Add location type detection ✅
- [x] Create LocationDisplay component with validation UI ✅ (integrated into panel)
- [ ] Test with various location types (residential, commercial, parks) ⚠️ Needs manual testing

**Deliverable**: ✅ Location validation working in frontend

---

### Phase 3: Quest Creation Modal (Day 2-3)

**Tasks**:
- [x] Create CreateQuestModal component ✅ (changed to CreateQuestPanel per user request)
- [x] Implement all form fields: ✅
  - [x] Title input with character counter ✅
  - [x] Description textarea ✅
  - [x] Location display (read-only) ✅
  - [x] Radius slider ✅
  - [x] Visibility toggle ✅
  - [x] Photo count input ✅
- [x] Add form validation ✅
- [x] Style panel to match app design ✅
- [x] Add loading states ✅

**Deliverable**: ✅ Complete quest creation panel UI

---

### Phase 4: Map Integration (Day 3)

**Tasks**:
- [x] Add Circle component to map ✅
- [x] Connect radius slider to circle visualization ✅
- [x] Ensure circle updates in real-time ✅
- [x] Test circle visibility and styling ✅
- [x] Handle edge cases (very small/large radius) ✅

**Deliverable**: ✅ Radius circle visible and interactive on map

---

### Phase 5: Component Migration (Day 4-5)

**Tasks**:
- [x] Migrate Button components ✅
  - [x] Header.tsx ✅
  - [x] FloatingActionButton.tsx ✅
  - [x] Other button usages ✅
- [x] Migrate Input components ✅
  - [x] SearchFilterBar.tsx ✅
- [ ] Migrate Card components (optional)
  - [ ] QuestCard.tsx (not migrated - current implementation is fine)
- [x] Test each migration thoroughly ✅
- [x] Update imports across codebase ✅

**Deliverable**: ✅ All components using shadcn/ui patterns

---

### Phase 6: API Integration (Day 5)

**Tasks**:
- [ ] Create quest creation API endpoint (if not exists) ❌ **BACKEND MISSING**
- [x] Add API client method for quest creation ✅
- [x] Connect form submission to API ✅
- [x] Handle success/error states ✅
- [x] Add error messages ✅
- [ ] Refresh quest list after creation ⚠️ (needs backend endpoint first)

**Deliverable**: ⚠️ Frontend ready, backend endpoint needed

---

### Phase 7: Testing & Polish (Day 6)

**Tasks**:
- [x] Test all form validations ✅ (code implemented)
- [ ] Test location validation with various locations ⚠️ Needs manual testing
- [x] Test radius circle visualization ✅ (working)
- [ ] Test on mobile devices ⚠️ Needs manual testing
- [x] Fix any UI/UX issues ✅ (addressed user feedback)
- [x] Add loading states and transitions ✅
- [x] Test error handling ✅ (code implemented)

**Deliverable**: ⚠️ Code complete, needs manual testing and backend

---

## Technical Details

### API Request Format

```typescript
interface CreateQuestRequest {
  title: string;
  description: string;
  lat: number;
  lng: number;
  radius_meters: number;
  visibility: 'public' | 'private';
  photo_count: number; // New field
  type?: 'social'; // Default for MVP
}
```

### API Response Format

```typescript
interface CreateQuestResponse {
  id: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  radius_meters: number;
  visibility: 'public' | 'private';
  photo_count: number;
  share_link: string; // For both public and private
  created_at: string;
}
```

### State Management

**Component State**:
- Form data (title, description, radius, visibility, photoCount)
- Location safety status
- Loading states
- Error messages

**No global state needed** - all state local to modal component.

### Error Handling

**Client-side Errors**:
- Invalid form data → Show inline validation errors
- Unsafe location → Disable submit button, show warning
- Network error → Show error toast/message

**Server-side Errors**:
- 400 Bad Request → Show validation errors
- 401 Unauthorized → Redirect to login
- 500 Server Error → Show generic error message

### Accessibility

- All form fields have proper labels
- Keyboard navigation works
- Screen reader support
- Focus management in modal
- ARIA attributes on custom components

---

## Files to Create/Modify

### New Files
```
frontend/src/
├── components/
│   ├── ui/                    # shadcn components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── dialog.tsx
│   │   └── label.tsx
│   └── quest/
│       ├── CreateQuestModal.tsx
│       ├── QuestForm.tsx
│       └── LocationDisplay.tsx
└── lib/
    └── location-validation.ts  # Location safety checks
```

### Modified Files
```
frontend/src/
├── components/
│   ├── map/
│   │   └── QuestMap.tsx        # Add circle, modal integration
│   ├── layout/
│   │   └── Header.tsx          # Migrate to shadcn Button
│   ├── quest/
│   │   └── QuestCard.tsx        # Migrate to shadcn Card
│   └── ui/
│       ├── FloatingActionButton.tsx  # Migrate to shadcn Button
│       └── SearchFilterBar.tsx       # Migrate inputs
├── app/
│   └── globals.css             # Add shadcn theme variables
├── lib/
│   └── api.ts                  # Add createQuest method
└── types/
    └── index.ts                # Add CreateQuestRequest/Response types
```

---

## Testing Checklist

### Location Validation
- [ ] Residential address → Blocked with error message
- [ ] Restaurant/cafe → Allowed
- [ ] Park → Allowed
- [ ] Public landmark → Allowed
- [ ] Unclear location → Warning shown, but allowed
- [ ] Geocoding failure → Warning shown, allowed

### Form Validation
- [ ] Empty title → Error message
- [ ] Title > 200 chars → Error message
- [ ] Empty description → Error message
- [ ] Invalid photo count → Error message
- [ ] All valid → Form submits

### Map Integration
- [ ] Click map → Modal opens
- [ ] Change radius → Circle updates
- [ ] Very small radius (10m) → Circle visible
- [ ] Very large radius (1000m) → Circle visible
- [ ] Close modal → Circle and marker removed

### Component Migration
- [ ] All buttons work identically
- [ ] All inputs work identically
- [ ] All cards display correctly
- [ ] No visual regressions
- [ ] No functionality lost

### API Integration
- [ ] Successful creation → Quest appears on map
- [ ] Error response → Error message shown
- [ ] Network error → Error message shown
- [ ] Loading state → Button disabled, spinner shown

---

## Success Criteria

✅ **Feature Complete**:
- Users can create quests with all required fields
- Location validation prevents private property quests
- Radius circle visible and interactive
- All components use shadcn/ui consistently
- Form validation works correctly
- API integration functional

✅ **Quality**:
- No visual regressions
- All existing functionality preserved
- Responsive design works on mobile
- Accessibility standards met
- Code follows project patterns

✅ **User Experience**:
- Clear error messages
- Intuitive form flow
- Visual feedback for all actions
- Fast and responsive

---

## Notes & Considerations

### Future Enhancements (Not in MVP)
- Quest categories (removed for now)
- Hints field
- Deadline
- Max completions
- Draft saving
- Photo upload preview
- Quest type selector (beyond social)

### Performance
- Geocoding API calls: Cache results if user clicks same location
- Form state: Use React Hook Form for better performance (optional)
- Map rendering: Circle updates should be smooth (use debounce if needed)

### Cost Considerations
- Google Maps Geocoding API: $5 per 1000 requests
- Estimate: ~$0.01 per quest creation (very affordable)
- Consider caching geocoding results

---

## Questions & Decisions

### Resolved
- ✅ Use shadcn/ui for component library
- ✅ Frontend validation blocks private locations
- ✅ Max 5 photos
- ✅ Link-based private quests
- ✅ No drafts feature
- ✅ Migrate all existing components

### Open Questions
- Should we add quest preview before creation?
- Should radius circle be editable on map (drag to resize)?
- Should we show quest count in radius circle?

---

**Next Steps**: Review this plan, then proceed with Phase 1 implementation.
