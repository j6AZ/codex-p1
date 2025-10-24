// Check if API key is defined
if (typeof GOOGLE_MAPS_API_KEY === "undefined" || !GOOGLE_MAPS_API_KEY) {
  console.error("Google Maps API key missing");
  document.getElementById("map").innerHTML = '<div style="text-align: center; padding: 20px;">Error: Google Maps API key is missing</div>';
}

const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
script.async = true;
script.defer = true;
document.head.appendChild(script);

let map;
let marker;
let autocomplete;
let boundary = null; // Will store the boundary polygon

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
  
  // Set up the Remove Boundary button
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  removeBoundaryBtn.addEventListener("click", removeBoundary);
  removeBoundaryBtn.style.display = "none"; // Hide button initially

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
  
  // Hide the remove boundary button
  const removeBoundaryBtn = document.getElementById("remove-boundary");
  removeBoundaryBtn.style.display = "none";
}
