# Component Migration Status

## ✅ Already Using shadcn/ui
- `CreateQuestPanel.tsx` - New component, uses shadcn
- All shadcn base components in `components/ui/`

## 🔄 Needs Migration

### 1. Header.tsx
**Current**: Custom buttons with inline styles
**Needs**: 
- Migrate "Create Quest" button to shadcn Button
- Migrate user menu button to shadcn Button
- Keep custom glassmorphism styling

**Files**: `src/components/layout/Header.tsx`

### 2. QuestCard.tsx
**Current**: Custom button with Tailwind classes
**Needs**:
- Could use shadcn Card component
- Keep existing styling and behavior

**Files**: `src/components/quest/QuestCard.tsx`

### 3. SearchFilterBar.tsx
**Current**: Custom inputs
**Needs**:
- Migrate inputs to shadcn Input
- Migrate select/dropdown to shadcn Select (if we add it)

**Files**: `src/components/ui/SearchFilterBar.tsx`

### 4. FloatingActionButton.tsx
**Current**: Custom button
**Needs**:
- Migrate to shadcn Button
- Keep floating position and styling

**Files**: `src/components/ui/FloatingActionButton.tsx`

## 📝 Notes
- Migration should preserve all existing functionality
- Keep custom styling where needed (glassmorphism, etc.)
- Test each component after migration
