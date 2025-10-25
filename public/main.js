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

// Variables for freehand drawing
let poly = null;
let path = null;
let isDrawing = false;
let drawingPath = [];

window.initMap = function initMap() {
  const defaultPosition = { lat: 37.7749, lng: -122.4194 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultPosition,
    zoom: 12,
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
  drawBoundaryBtn.addEventListener("click", startDrawing);
  cancelDrawingBtn.addEventListener("click", cancelDrawing);
  applyDrawingBtn.addEventListener("click", applyDrawing);
  
  // Initial button states
  removeBoundaryBtn.style.display = "none";
  drawBoundaryBtn.style.display = "block";
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
  
  // Show the remove boundary button
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  removeBoundaryBtn.style.display = "flex";
  
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
  
  // Create a circle around the location
  boundary = new google.maps.Circle({
    center: center,
    radius: radius,
    strokeColor: "#000000",
    strokeOpacity: 1.0,
    strokeWeight: 10,
    fillColor: "#000000",
    fillOpacity: 0.1,
    map: map
  });
}

// Function to remove the boundary
function removeBoundary() {
  if (boundary) {
    boundary.setMap(null);
    boundary = null;
  }
  
  // Update button visibility
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  const drawBoundaryBtn = document.getElementById("draw-boundary");
  
  removeBoundaryBtn.style.display = "none";
  drawBoundaryBtn.style.display = "block";
}

// Function to start drawing mode
function startDrawing() {
  // Hide draw button, show drawing controls
  const drawBoundaryBtn = document.getElementById("draw-boundary");
  const drawingControls = document.getElementById("drawing-controls");
  
  drawBoundaryBtn.style.display = "none";
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
  instructionDiv.textContent = 'Draw a shape around the region(s) you would like to live in';
  document.body.appendChild(instructionDiv);
  
  // Disable the standard drawing manager
  if (drawingManager) {
    drawingManager.setMap(null);
  }
  
  // Initialize the polygon for freehand drawing
  poly = new google.maps.Polygon({
    strokeColor: '#000000',
    strokeOpacity: 1.0,
    strokeWeight: 10,
    fillColor: '#000000',
    fillOpacity: 0.1,
  });
  
  // Create an empty MVCArray to hold the coordinate path
  path = new google.maps.MVCArray();
  poly.setPath(path);
  poly.setMap(map);
  
  // Set up the drawing listeners
  setupDrawingListeners();
  
  // Set drawing mode flag
  drawingMode = true;
  
  // Disable map dragging while in drawing mode
  map.setOptions({ draggable: false });
}

// Set up listeners for freehand drawing
function setupDrawingListeners() {
  // Mouse down event - start drawing
  google.maps.event.addListener(map, 'mousedown', function(e) {
    if (!drawingMode) return;
    
    // Clear previous path and set up a new drawing polygon if needed
    if (!poly || !poly.getMap()) {
      // Create a new polygon for drawing
      poly = new google.maps.Polygon({
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 10,
        fillColor: '#000000',
        fillOpacity: 0.1,
        map: map
      });
      
      // Create a new path
      path = new google.maps.MVCArray();
      poly.setPath(path);
    } else {
      // Just clear the existing path
      path.clear();
    }
    
    isDrawing = true;
    drawingPath = [];
    
    // Add the first point
    const point = e.latLng;
    path.push(point);
    drawingPath.push(point);
  });
  
  // Mouse move event - continue drawing ONLY if isDrawing is true
  google.maps.event.addListener(map, 'mousemove', function(e) {
    if (!isDrawing || !poly || !poly.getMap()) return;
    
    // Add point to the path
    const point = e.latLng;
    path.push(point);
    drawingPath.push(point);
  });
  
  // Mouse up event - finish drawing
  google.maps.event.addListener(map, 'mouseup', function(e) {
    if (!isDrawing) return;
    
    // Set drawing flag to false to stop drawing
    isDrawing = false;
    
    // Close the polygon
    if (drawingPath.length > 2) {
      // Add the first point again to close the shape
      path.push(drawingPath[0]);
      
      // Create the final polygon
      drawnShape = new google.maps.Polygon({
        paths: drawingPath,
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 10,
        fillColor: '#000000',
        fillOpacity: 0.1,
        editable: true,
        map: map
      });
      
      // Remove the drawing polygon
      poly.setMap(null);
      poly = null;
    } else {
      // If not enough points, just clear the path
      path.clear();
      poly.setMap(null);
      poly = null;
    }
  });
  
  // Touch events for mobile
  google.maps.event.addListener(map, 'touchstart', function(e) {
    if (!drawingMode) return;
    
    // Clear previous path and set up a new drawing polygon if needed
    if (!poly || !poly.getMap()) {
      // Create a new polygon for drawing
      poly = new google.maps.Polygon({
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 10,
        fillColor: '#000000',
        fillOpacity: 0.1,
        map: map
      });
      
      // Create a new path
      path = new google.maps.MVCArray();
      poly.setPath(path);
    } else {
      // Just clear the existing path
      path.clear();
    }
    
    isDrawing = true;
    drawingPath = [];
    
    // Add the first point
    const point = e.latLng;
    path.push(point);
    drawingPath.push(point);
  });
  
  google.maps.event.addListener(map, 'touchmove', function(e) {
    if (!isDrawing || !poly || !poly.getMap()) return;
    
    // Add point to the path
    const point = e.latLng;
    path.push(point);
    drawingPath.push(point);
  });
  
  google.maps.event.addListener(map, 'touchend', function(e) {
    if (!isDrawing) return;
    
    // Set drawing flag to false to stop drawing
    isDrawing = false;
    
    // Close the polygon
    if (drawingPath.length > 2) {
      // Add the first point again to close the shape
      path.push(drawingPath[0]);
      
      // Create the final polygon
      drawnShape = new google.maps.Polygon({
        paths: drawingPath,
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 10,
        fillColor: '#000000',
        fillOpacity: 0.1,
        editable: true,
        map: map
      });
      
      // Remove the drawing polygon
      poly.setMap(null);
      poly = null;
    } else {
      // If not enough points, just clear the path
      path.clear();
      poly.setMap(null);
      poly = null;
    }
  });
}

// Function to cancel drawing
function cancelDrawing() {
  // Remove any drawn shape
  if (drawnShape) {
    drawnShape.setMap(null);
    drawnShape = null;
  }
  
  // Exit drawing mode
  exitDrawingMode();
}

// Function to apply the drawn boundary
function applyDrawing() {
  if (drawnShape) {
    // Set the drawn shape as the boundary
    boundary = drawnShape;
    
    // Keep the drawn shape visible on the map
    boundary.setMap(map);
    
    // Clear the reference to drawnShape since we're now using it as boundary
    drawnShape = null;
  }
  
  // Exit drawing mode
  exitDrawingMode();
  
  // Show remove boundary button
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  removeBoundaryBtn.style.display = "block";
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
  
  // Clean up the drawing polygon if it exists
  if (poly) {
    poly.setMap(null);
  }
  
  // Re-enable map dragging
  map.setOptions({ draggable: true });
  
  // Update button visibility
  const drawBoundaryBtn = document.getElementById("draw-boundary");
  const drawingControls = document.getElementById("drawing-controls");
  
  drawBoundaryBtn.style.display = "block";
  drawingControls.style.display = "none";
  
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
