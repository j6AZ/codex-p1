# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static web application that provides an interactive Google Maps interface with Places autocomplete search and custom boundary drawing functionality. Users can search for locations, have automatic circular boundaries created around them, or draw custom freehand boundaries on the map.

## Development Commands

### Local Development
```bash
# Serve the application locally
npx serve public

# The app will be available at http://localhost:3000
```

### Deployment
The site is deployed via Netlify and automatically deploys from the main branch. The `netlify.toml` configuration specifies:
- Publish directory: `public`
- Framework: static

## Configuration

### Google Maps API Key
The application requires a Google Maps API key with the following APIs enabled:
- Maps JavaScript API
- Places API
- Drawing Library

**Setup:**
1. The API key is currently hardcoded in `public/index.html` at line 9
2. There is also a `config.js.example` file showing the intended pattern for external configuration
3. `public/config.js` is gitignored to prevent committing API keys

**Important:** The current implementation has the API key embedded directly in `index.html`. For production, this should be moved to an environment variable or config file pattern.

## Architecture

### File Structure
```
public/
├── index.html          # Main HTML entry point with embedded API key
├── main.js             # Core application logic
├── styles.css          # Application styling
├── config.js.example   # Template for API key configuration
├── mock_demo.html      # Demo/test file
└── leaflet_demo.html   # Alternative demo with Leaflet
```

### Core Functionality (main.js)

**Map Initialization:**
- Default center: San Francisco (37.7749, -122.4194)
- Attempts geolocation to center on user's current location
- Creates a marker at the centered position

**Boundary System:**
The application has two boundary modes:

1. **Automatic Circular Boundaries** (`createBoundary` function):
   - Created when a place is selected via autocomplete
   - Calculates radius based on the place's viewport bounds using Haversine formula
   - Falls back to 500m radius for specific locations without viewport
   - Black stroke (#000000, 10px), light black fill (0.1 opacity)

2. **Freehand Drawing** (`startDrawing` function):
   - Supports both mouse and touch events for desktop/mobile
   - Implements custom polygon drawing that follows the cursor/finger
   - Drawing process:
     - Click/tap and hold to start
     - Path is created as user moves cursor/finger
     - Release to complete the shape
     - Shape becomes editable after creation
   - Uses global state: `drawingMode`, `isDrawing`, `poly`, `path`, `drawnShape`

**UI Controls:**
- Search card: Floating centered autocomplete input
- Button container (top-right):
  - "Remove Boundary" button (with X icon)
  - "Draw" button
  - Drawing controls (Cancel/Apply) - shown only during drawing mode
- Drawing instruction banner appears at top when in drawing mode

**State Management:**
Key global variables:
- `map`: Google Maps instance
- `marker`: Single marker showing selected/current location
- `autocomplete`: Places Autocomplete instance
- `boundary`: Current boundary (circle or polygon)
- `drawingManager`: Google Maps DrawingManager instance
- `drawingMode`: Boolean flag for drawing mode
- `drawnShape`: Temporary shape being drawn
- `poly`, `path`: Temporary polygon and path for freehand drawing
- `isDrawing`: Flag indicating active drawing

**Event Flow:**
1. Place selected → `place_changed` event → `createBoundary()` → Shows "Remove Boundary" button
2. "Draw" clicked → `startDrawing()` → Disables map dragging, sets up drawing listeners, shows drawing controls
3. Drawing complete → User clicks "Apply" → `applyDrawing()` → Sets `boundary`, exits drawing mode
4. "Cancel" clicked → `cancelDrawing()` → Removes drawn shape, exits drawing mode
5. "Remove Boundary" clicked → `removeBoundary()` → Clears boundary, shows "Draw" button

**Drawing Implementation Details:**
- Freehand drawing uses Google Maps Polygon with MVCArray for the path
- Mouse events: mousedown, mousemove, mouseup
- Touch events: touchstart, touchmove, touchend (for mobile support)
- Map dragging is disabled during drawing mode
- All event listeners are cleaned up when exiting drawing mode (`exitDrawingMode`)

### Styling (styles.css)

- Uses system fonts for native look across platforms
- Responsive design with mobile breakpoint at 480px
- Button positioning: 66px from right edge (to avoid map controls)
- Card UI centered at top with translucent shadow
- Drawing instruction banner: full-width top overlay with semi-transparent white background

## Known Issues & Patterns

1. **API Key Management**: The API key is currently hardcoded in `index.html` instead of using the config.js pattern shown in the example file.

2. **Drawing State Cleanup**: The application properly cleans up event listeners when exiting drawing mode to prevent memory leaks.

3. **Mobile Support**: Touch events are fully implemented for freehand drawing on mobile devices.

4. **Map Dragging**: Automatically disabled during drawing mode and re-enabled afterward to prevent accidental map movement while drawing.

## Recent Development History

Based on git commits, recent work has focused on:
- Implementing and refining the freehand drawing feature
- Fixing drawing behavior to properly stop when mouse/touch is released
- Ensuring drawn boundaries persist when "Apply" is clicked
- Making the drawing path visible during the drawing process
- Adding UI controls (Draw, Apply, Cancel buttons)
- Switching boundary from polygon to circle for automatic boundaries
- UI refinements for button positioning and styling
