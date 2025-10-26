# Google Maps Code Component for Framer

This is a fully functional Google Maps component with autocomplete search and editable boundary selection, ready to use in Framer.

## Features

- ✅ Google Maps with black & white styling
- ✅ Autocomplete search for locations
- ✅ Editable and draggable rectangle boundary
- ✅ Animated instruction banner
- ✅ Remove boundary button
- ✅ Fully responsive

## How to Use in Framer

### Step 1: Get Your Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
4. Create credentials (API Key)
5. Copy your API key

### Step 2: Add Component to Framer

1. Open your Framer project
2. In the **Assets** panel, click the **"+"** button
3. Select **"Code"** → **"New Component"** (or press Cmd+Shift+Y)
4. Name it something like "GoogleMapSearch"
5. Copy the entire contents of `FramerMapComponent.tsx`
6. Paste it into the Framer code editor
7. The component will appear in your Assets panel

### Step 3: Use the Component

1. Drag the component onto your canvas
2. Resize it to fit your design (it will fill the space you give it)
3. In the properties panel, you can adjust:
   - **API Key**: Your Google Maps API key
   - **Default Latitude**: Starting map latitude (default: 37.7749 - San Francisco)
   - **Default Longitude**: Starting map longitude (default: -122.4194)
   - **Default Zoom**: Starting zoom level (default: 12)

### Step 4: Configure Your API Key

1. Select the component on the canvas
2. In the Properties panel on the right, find the **API Key** field
3. Paste your Google Maps API key
4. Adjust the default location if needed (Latitude, Longitude, Zoom)

### Step 5: Test It

1. Preview your Framer project (click the Play button or press Cmd+P)
2. Type a location in the search box
3. Select a location from the autocomplete dropdown
4. A rectangle boundary will appear - you can:
   - **Resize** it by dragging the corners/edges
   - **Move** it by dragging the center
5. Click "Remove Boundary" to clear it

## Customization

### Change Colors

In the component code, you can modify:

**Rectangle Boundary** (around line 143):
```typescript
strokeColor: "#000000",  // Border color
fillColor: "#000000",    // Fill color
fillOpacity: 0.1,        // Fill transparency
```

**Map Styling** (lines 54-74):
The map uses a grayscale theme. You can change colors in the `styles` array.

**Instruction Banner** (around line 262):
```typescript
backgroundColor: "rgba(0, 0, 0, 0.85)",  // Banner background
color: "white",                           // Text color
```

### Change Text

**Search Label** (around line 195):
```typescript
Search for a place
```

**Instruction Message** (around line 268):
```typescript
Resize the selected area to refine your search location
```

## Getting Boundary Data

If you need to capture the boundary coordinates (for form submission, etc.), you can add this code:

```typescript
// Add this inside the createBoundary function after creating newBoundary
google.maps.event.addListener(newBoundary, 'bounds_changed', () => {
    const bounds = newBoundary.getBounds()
    if (bounds) {
        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        console.log('Boundary:', {
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng()
        })
        // You can emit this data to parent components or store it
    }
})
```

## Troubleshooting

### Map not loading
- Check that your API key is correct
- Verify that Maps JavaScript API and Places API are enabled
- Check browser console for errors

### Autocomplete not working
- Ensure Places API is enabled in Google Cloud Console
- Check that your API key has the correct permissions

### Component not appearing in Framer
- Make sure you copied the entire file contents
- Check for any syntax errors in the code editor

## Notes

- The component is fully self-contained
- It loads the Google Maps script automatically
- The instruction banner auto-hides after 5 seconds
- The map uses one-finger dragging on mobile
- All styling is inline for portability

## Support

For issues or questions, refer to:
- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Framer Code Components Documentation](https://www.framer.com/developers/)
