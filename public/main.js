// Check if API key is defined
if (typeof GOOGLE_MAPS_API_KEY === "undefined" || !GOOGLE_MAPS_API_KEY) {
  console.error("Google Maps API key missing");
  document.getElementById("map").innerHTML = '<div style="text-align: center; padding: 20px;">Error: Google Maps API key is missing</div>';
}

const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,drawing&callback=initMap`;
script.async = true;
script.defer = true;
document.head.appendChild(script);

let map;
let marker;
let autocomplete;
let boundary = null; // Will store the boundary polygon
let drawingManager = null;
let drawingMode = false;
let drawnShape = null;

// Variables for rectangle drawing
let isDrawing = false;
let drawingRectangle = null;
let startPoint = null;
let hasDrawnShape = false; // Flag to track if user has drawn a shape in current session

window.initMap = function initMap() {
  const defaultPosition = { lat: 37.7749, lng: -122.4194 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultPosition,
    zoom: 12,
    gestureHandling: 'greedy', // Allow one-finger dragging on mobile
    styles: [
      {
        "elementType": "geometry",
        "stylers": [{"color": "#f5f5f5"}]
      },
      {
        "elementType": "labels.icon",
        "stylers": [{"visibility": "off"}]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#616161"}]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#f5f5f5"}]
      },
      {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#bdbdbd"}]
      },
      {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{"color": "#eeeeee"}]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#757575"}]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{"color": "#e5e5e5"}]
      },
      {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#9e9e9e"}]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{"color": "#ffffff"}]
      },
      {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#757575"}]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{"color": "#dadada"}]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#616161"}]
      },
      {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#9e9e9e"}]
      },
      {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{"color": "#e5e5e5"}]
      },
      {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [{"color": "#eeeeee"}]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{"color": "#c9c9c9"}]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#9e9e9e"}]
      }
    ]
  });

  marker = new google.maps.Marker({
    map,
    position: defaultPosition,
  });
  
  // Initialize the drawing manager (but don't activate it yet)
  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: false,
    polygonOptions: {
      strokeColor: "#000000",
      strokeOpacity: 1.0,
      strokeWeight: 10,
      fillColor: "#000000",
      fillOpacity: 0.1,
      editable: true,
      draggable: false
    },
    // Add options for the drawing polyline to make it visible during drawing
    polylineOptions: {
      strokeColor: "#000000",
      strokeOpacity: 1.0,
      strokeWeight: 5
    }
  });
  
  // Set up button event listeners
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  const drawBoundaryBtn = document.getElementById("draw-boundary");
  const cancelDrawingBtn = document.getElementById("cancel-drawing");
  const applyDrawingBtn = document.getElementById("apply-drawing");
  const drawingControls = document.getElementById("drawing-controls");
  
  removeBoundaryBtn.addEventListener("click", removeBoundary);
  
  // Initial button states - hide all drawing buttons
  removeBoundaryBtn.style.display = "none";
  drawBoundaryBtn.style.display = "none";
  cancelDrawingBtn.style.display = "none";
  applyDrawingBtn.style.display = "none";
  drawingControls.style.display = "none";
  
  // Listen for polygon complete event
  google.maps.event.addListener(drawingManager, 'polygoncomplete', function(polygon) {
    drawnShape = polygon;
    // Disable drawing mode once a shape is drawn
    drawingManager.setDrawingMode(null);
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(pos);
        map.setZoom(14);
        marker.setPosition(pos);
      },
      (error) => {
        console.warn("Geolocation failed or was denied:", error.message);
      }
    );
  }

  const input = document.getElementById("pac-input");
  autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["geometry", "name", "formatted_address"],
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();

    if (!place.geometry || !place.geometry.location) {
      alert("No details available for the selected place.");
      return;
    }

    const location = place.geometry.location;
    map.setCenter(location);
    map.setZoom(15);
    marker.setPosition(location);
    
    // Create a boundary around the selected place
    createBoundary(place);
  });
};

// Function to create a boundary around a place
function createBoundary(place) {
  // Remove any existing boundary
  removeBoundary();
  
  // Show ONLY the remove boundary button
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  
  removeBoundaryBtn.style.display = "flex";
  
  // Show instruction banner
  showBoundaryInstruction();
  
  // Get the location and calculate an appropriate radius
  let center, radius;
  
  if (place.geometry.viewport) {
    // If the place has a viewport (area), use the center of the viewport
    const bounds = place.geometry.viewport;
    
    // Calculate the center of the bounds
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    // Get the center point
    center = new google.maps.LatLng(
      (ne.lat() + sw.lat()) / 2,
      (ne.lng() + sw.lng()) / 2
    );
    
    // Calculate radius based on the size of the viewport
    // Use the Haversine formula to calculate distance between two points
    const R = 6371000; // Earth's radius in meters
    const lat1 = center.lat() * Math.PI / 180;
    const lat2 = ne.lat() * Math.PI / 180;
    const lon1 = center.lng() * Math.PI / 180;
    const lon2 = ne.lng() * Math.PI / 180;
    
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    // Calculate the distance from center to northeast corner
    radius = R * c;
    
    // Fit the map to the bounds
    map.fitBounds(bounds);
  } else {
    // If the place doesn't have a viewport, use its location
    center = place.geometry.location;
    // Default radius for specific locations
    radius = 500;
  }
  
  // Calculate rectangle bounds from the center and radius
  // Convert radius (in meters) to approximate lat/lng offset
  const latOffset = radius / 111320; // 1 degree latitude ≈ 111,320 meters
  const lngOffset = radius / (111320 * Math.cos(center.lat() * Math.PI / 180));
  
  const bounds = {
    north: center.lat() + latOffset,
    south: center.lat() - latOffset,
    east: center.lng() + lngOffset,
    west: center.lng() - lngOffset
  };
  
  // Create an editable and draggable rectangle
  boundary = new google.maps.Rectangle({
    bounds: bounds,
    strokeColor: "#000000",
    strokeOpacity: 1.0,
    strokeWeight: 10,
    fillColor: "#000000",
    fillOpacity: 0.1,
    map: map,
    editable: true,   // Allow user to resize
    draggable: true   // Allow user to move
  });
}

// Function to remove the boundary
function removeBoundary() {
  if (boundary) {
    boundary.setMap(null);
    boundary = null;
  }
  
  // Hide remove boundary button
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  
  removeBoundaryBtn.style.display = "none";
  
  // Hide instruction banner
  hideBoundaryInstruction();
}

// Function to start drawing mode
function startDrawing() {
  // Hide draw button and remove boundary button, show ONLY drawing controls
  const drawBoundaryBtn = document.getElementById("draw-boundary");
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  const drawingControls = document.getElementById("drawing-controls");
  
  drawBoundaryBtn.style.display = "none";
  removeBoundaryBtn.style.display = "none";
  drawingControls.style.display = "flex";
  
  // Clear any existing boundaries
  if (boundary) {
    boundary.setMap(null);
    boundary = null;
  }
  
  // Clear any previously drawn shape
  if (drawnShape) {
    drawnShape.setMap(null);
    drawnShape = null;
  }
  
  // Add instruction banner
  const instructionDiv = document.createElement('div');
  instructionDiv.className = 'drawing-instruction';
  instructionDiv.id = 'drawing-instruction';
  instructionDiv.textContent = 'Drag to draw a box around the region you would like to live in';
  document.body.appendChild(instructionDiv);
  
  // Disable the standard drawing manager
  if (drawingManager) {
    drawingManager.setMap(null);
  }
  
  // Set up the rectangle drawing listeners
  setupRectangleDrawing();
  
  // Set drawing mode flag
  drawingMode = true;
  hasDrawnShape = false; // Reset the flag when starting a new drawing session
  
  // LOCK map movement but keep it interactive for drawing
  map.setOptions({
    draggable: false,
    zoomControl: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    gestureHandling: 'greedy', // Keep greedy to allow touch events for drawing
    disableDefaultUI: true
  });
  
  // Add class to body to prevent scrolling and lock viewport
  document.body.classList.add('drawing-mode');
}

// Set up listeners for rectangle drawing (crop-style)
function setupRectangleDrawing() {
  // Mouse/Touch down - start drawing rectangle
  const startDrawingRect = function(latLng) {
    if (!drawingMode || hasDrawnShape) return;
    
    isDrawing = true;
    startPoint = latLng;
    
    // Create a rectangle with editable and draggable properties
    drawingRectangle = new google.maps.Rectangle({
      bounds: {
        north: latLng.lat(),
        south: latLng.lat(),
        east: latLng.lng(),
        west: latLng.lng()
      },
      strokeColor: '#000000',
      strokeOpacity: 1.0,
      strokeWeight: 10,
      fillColor: '#000000',
      fillOpacity: 0.1,
      map: map,
      editable: true,  // Make it editable immediately
      draggable: true  // Make it draggable
    });
  };
  
  // Mouse/Touch move - update rectangle
  const updateDrawingRect = function(latLng) {
    if (!isDrawing || !drawingRectangle) return;
    
    // Calculate bounds
    const bounds = {
      north: Math.max(startPoint.lat(), latLng.lat()),
      south: Math.min(startPoint.lat(), latLng.lat()),
      east: Math.max(startPoint.lng(), latLng.lng()),
      west: Math.min(startPoint.lng(), latLng.lng())
    };
    
    drawingRectangle.setBounds(bounds);
  };
  
  // Mouse/Touch up - finish drawing
  const finishDrawingRect = function() {
    if (!isDrawing) return;
    
    isDrawing = false;
    
    if (drawingRectangle) {
      // Set the rectangle as the drawn shape
      drawnShape = drawingRectangle;
      drawingRectangle = null;
      startPoint = null;
      hasDrawnShape = true;
      
      updateInstructionText('Drag or resize the box, then click Apply to confirm or Cancel to redraw');
    }
  };
  
  // Mouse events
  google.maps.event.addListener(map, 'mousedown', function(e) {
    startDrawingRect(e.latLng);
  });
  
  google.maps.event.addListener(map, 'mousemove', function(e) {
    updateDrawingRect(e.latLng);
  });
  
  google.maps.event.addListener(map, 'mouseup', function(e) {
    finishDrawingRect();
  });
  
  // Touch events for mobile
  google.maps.event.addListener(map, 'touchstart', function(e) {
    if (e.domEvent) {
      e.domEvent.preventDefault();
    }
    startDrawingRect(e.latLng);
  });
  
  google.maps.event.addListener(map, 'touchmove', function(e) {
    if (e.domEvent) {
      e.domEvent.preventDefault();
    }
    updateDrawingRect(e.latLng);
  });
  
  google.maps.event.addListener(map, 'touchend', function(e) {
    finishDrawingRect();
  });
}

// Function to cancel drawing
function cancelDrawing() {
  // Remove any drawn shape
  if (drawnShape) {
    drawnShape.setMap(null);
    drawnShape = null;
  }
  
  // Reset the flag
  hasDrawnShape = false;
  
  // Exit drawing mode
  exitDrawingMode();
  
  // Update button visibility - show ONLY Draw button
  const drawBoundaryBtn = document.getElementById("draw-boundary");
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  const drawingControls = document.getElementById("drawing-controls");
  
  drawBoundaryBtn.style.display = "flex";
  removeBoundaryBtn.style.display = "none";
  drawingControls.style.display = "none";
}

// Function to apply the drawn boundary
function applyDrawing() {
  if (drawnShape) {
    // Set the drawn shape as the boundary
    boundary = drawnShape;
    
    // Keep the boundary editable and draggable so user can adjust it
    boundary.setOptions({
      editable: true,
      draggable: true
    });
    
    // Explicitly ensure it's on the map
    if (!boundary.getMap()) {
      boundary.setMap(map);
    }
    
    // Clear the reference to drawnShape since we're now using it as boundary
    drawnShape = null;
  }
  
  // Exit drawing mode (but don't touch the boundary!)
  exitDrawingMode();
  
  // Show ONLY remove boundary button
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  const drawBoundaryBtn = document.getElementById("draw-boundary");
  const drawingControls = document.getElementById("drawing-controls");
  
  removeBoundaryBtn.style.display = "flex";
  drawBoundaryBtn.style.display = "none";
  drawingControls.style.display = "none";
}

// Function to exit drawing mode
function exitDrawingMode() {
  // Disable drawing manager
  if (drawingManager) {
    drawingManager.setMap(null);
    drawingManager.setDrawingMode(null);
  }
  
  // Clean up drawing state
  drawingMode = false;
  isDrawing = false;
  
  // Clean up the drawing rectangle if it exists
  if (drawingRectangle) {
    drawingRectangle.setMap(null);
    drawingRectangle = null;
  }
  
  startPoint = null;
  
  // Re-enable map dragging and interactions
  map.setOptions({
    draggable: true,
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    gestureHandling: 'greedy' // Re-enable one-finger dragging
  });
  
  // Remove drawing-mode class from body to re-enable scrolling
  document.body.classList.remove('drawing-mode');
  
  // Remove instruction banner
  const instructionDiv = document.getElementById('drawing-instruction');
  if (instructionDiv) {
    instructionDiv.remove();
  }
  
  // Remove the event listeners
  google.maps.event.clearListeners(map, 'mousedown');
  google.maps.event.clearListeners(map, 'mousemove');
  google.maps.event.clearListeners(map, 'mouseup');
  google.maps.event.clearListeners(map, 'touchstart');
  google.maps.event.clearListeners(map, 'touchmove');
  google.maps.event.clearListeners(map, 'touchend');
}

// Function to update instruction text
function updateInstructionText(text) {
  const instructionDiv = document.getElementById('drawing-instruction');
  if (instructionDiv) {
    instructionDiv.textContent = text;
  }
}

// Function to show boundary instruction banner
function showBoundaryInstruction() {
  // Remove existing instruction if any
  let instructionDiv = document.getElementById('boundary-instruction');
  if (instructionDiv) {
    instructionDiv.remove();
  }
  
  // Create new instruction banner
  instructionDiv = document.createElement('div');
  instructionDiv.className = 'boundary-instruction';
  instructionDiv.id = 'boundary-instruction';
  instructionDiv.textContent = 'Resize the selected area to refine your search location';
  document.body.appendChild(instructionDiv);
  
  // Trigger animation after a brief delay
  setTimeout(() => {
    instructionDiv.classList.add('show');
  }, 100);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideBoundaryInstruction();
  }, 5000);
}

// Function to hide boundary instruction banner
function hideBoundaryInstruction() {
  const instructionDiv = document.getElementById('boundary-instruction');
  if (instructionDiv) {
    instructionDiv.classList.remove('show');
    // Remove from DOM after animation completes
    setTimeout(() => {
      instructionDiv.remove();
    }, 500);
  }
}
