# Layout Issues - Technical Documentation

**Date**: November 10, 2025
**Status**: CRITICAL - Layout system needs redesign

---

## Current Problems

### 1. Sections Won't Position Next to Each Other
**Symptom**: User cannot drag Suggestions or Controls sections to appear next to the Board, even when there's plenty of horizontal space in the window.

**Current Behavior**:
- Sections remain in their initial positions
- Dragging doesn't allow horizontal placement next to board
- Position clamping appears to prevent valid positions

**Expected Behavior**:
- Board on left at (0, 0)
- Suggestions should be draggable to (440, 0) - right of board
- Controls should be draggable to (440, 320) - right of board, below suggestions
- All three sections should fit side-by-side in a reasonably sized window

### 2. Controls Section Not Visible
**Symptom**: User reports they cannot see the Controls section at all.

**Current State**:
- Controls section position: (440, 320)
- Section has maxHeight: 280px
- ScrollView added but doesn't make section accessible
- Position clamping may be pushing it out of bounds

**Expected State**:
- Controls section always visible or accessible via scrolling
- Should appear in default layout on right side below Suggestions

---

## Current Implementation

### Layout Structure
```typescript
<ScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContent}>
  <DraggableSection initialPosition={board} />
  <DraggableSection initialPosition={analysis} />
  <DraggableSection initialPosition={controls} />
</ScrollView>
```

### DraggableSection Component
- Uses `PanResponder` for drag handling
- Uses `Animated.ValueXY` for positioning
- Absolute positioning via transform: translateX/translateY
- Grid snapping (20px grid)
- Position clamping to prevent off-screen movement

### Position Clamping Logic
```typescript
const marginX = 16;
const marginY = 16;
const maxX = containerSize.width - layout.width - marginX;
const maxY = containerSize.height - layout.height - marginY;
const minVisibleX = -(layout.width - 100); // Keep 100px visible
const minVisibleY = 0;
```

**Problem**: This clamping may be too restrictive and preventing valid side-by-side positioning.

---

## Root Causes

1. **Absolute Positioning in ScrollView**
   - Absolute positioned elements don't flow naturally
   - ScrollView doesn't properly account for absolutely positioned children
   - Container size calculations may be incorrect

2. **Position Clamping Too Restrictive**
   - Current clamping based on containerSize (window dimensions)
   - Doesn't account for scroll area
   - minHeight: 900px on scrollContent but clamping uses window height

3. **No Layout Flow**
   - Sections don't respect each other's positions
   - Can overlap without restriction
   - No automatic arrangement or collision detection

4. **Window Resize Issues**
   - Sections don't reposition intelligently when window expands
   - Clamping prevents moving into newly available space
   - ScrollView content size not dynamically updating

---

## Attempted Fixes (Did Not Work)

1. **Added ScrollView** - Sections still not accessible
2. **Reduced Position Clamping Margins** - Still too restrictive
3. **Added Reset Layout Button** - Positions reset but dragging still broken
4. **Reduced Section Heights** - Doesn't solve positioning problem
5. **Added useEffect for window resize** - Still doesn't reposition correctly

---

## Proposed Solutions

### Option 1: Flex-Based Layout (RECOMMENDED)
**Approach**: Remove absolute positioning, use flexbox for arrangement.

```typescript
<View style={styles.mainContent}>
  <View style={styles.flexRow}>
    <DraggableSection style={styles.boardSection} />
    <View style={styles.flexColumn}>
      <DraggableSection style={styles.analysisSection} />
      <DraggableSection style={styles.controlsSection} />
    </View>
  </View>
</View>
```

**Pros**:
- Natural layout flow
- Sections always visible
- Responsive by default
- Simpler than absolute positioning

**Cons**:
- Need to redefine what "draggable" means in flex context
- May need different drag behavior (snap to predefined positions?)

### Option 2: Grid-Based Layout
**Approach**: Define grid positions, sections snap to grid cells.

```typescript
// Define grid: 2 columns, 3 rows
const gridPositions = {
  board: { col: 0, row: 0, rowSpan: 2 },
  analysis: { col: 1, row: 0 },
  controls: { col: 1, row: 1 },
};
```

**Pros**:
- Predictable positions
- Easy to ensure all sections visible
- Can enforce non-overlapping

**Cons**:
- Less flexible than free positioning
- Still needs layout implementation

### Option 3: Fix Absolute Positioning
**Approach**: Keep current approach, fix the bugs.

**Required Changes**:
1. Remove ScrollView, use fixed viewport
2. Calculate positions relative to available space, not window size
3. Add collision detection
4. Improve clamping to allow full use of space
5. Add manual scrollbars if needed

**Pros**:
- Keeps current drag behavior
- Free positioning retained

**Cons**:
- Complex to get right
- Already attempted multiple fixes
- May have fundamental limitations

### Option 4: Hybrid Approach
**Approach**: Use flex for default layout, add "customize mode" for dragging.

- Default: Flex layout, all sections visible
- User clicks "Customize Layout" button
- Enters special mode where sections become draggable
- Sections snap to predefined positions
- Exit customize mode to lock layout

**Pros**:
- Always functional default layout
- Drag customization as optional feature
- Best of both worlds

**Cons**:
- More complex implementation
- Two layout systems to maintain

---

## Recommended Next Steps

1. **IMMEDIATE**: Switch to Option 1 (Flex-Based Layout)
   - Remove absolute positioning
   - Use flexbox for natural layout
   - Make sections draggable within flex constraints
   - Ensures all sections always visible

2. **Short-term**: Implement basic flex layout
   - Board on left
   - Suggestions + Controls stacked on right
   - Remove ScrollView (not needed with flex)
   - Save layout preference (which sections are in which column)

3. **Long-term**: Add advanced drag customization
   - Allow swapping section positions
   - Allow hiding/showing sections
   - Allow resizing sections
   - More sophisticated layout engine

---

## Technical Debt

- Current DraggableSection component not suitable for production
- Need comprehensive layout testing across window sizes
- Need better error handling when sections don't fit
- Need accessibility features for layout customization
- Consider using a layout library instead of custom implementation

---

## Files Affected

- `/App.tsx` - Main content area layout
- `/src/components/ui/draggable-section.tsx` - Draggable component
- `/STATUS.md` - Project status
- `/CLAUDE.md` - Development notes

---

## User Impact

**High Priority**: User cannot access Controls section - this includes:
- New Game button
- Player selection (Human/AI)
- Start/Stop button for AI vs AI
- Learning Mode toggle
- Game statistics

**Without Controls section, core functionality is broken.**
