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
  
  // Create the boundary based on the viewport or location
  if (place.geometry.viewport) {
    // If the place has a viewport (area), use that
    const bounds = place.geometry.viewport;
    
    // Create a polygon that follows the bounds
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const nw = new google.maps.LatLng(ne.lat(), sw.lng());
    const se = new google.maps.LatLng(sw.lat(), ne.lng());
    
    boundary = new google.maps.Polygon({
      paths: [ne, se, sw, nw],
      strokeColor: "#000000",
      strokeOpacity: 1.0,
      strokeWeight: 10,
      fillColor: "#000000",
      fillOpacity: 0.1,
      map: map
    });
    
    // Fit the map to the bounds
    map.fitBounds(bounds);
  } else {
    // If the place doesn't have a viewport, create a circle around the location
    const location = place.geometry.location;
    
    // Create a circle with a radius of approximately 500 meters
    boundary = new google.maps.Circle({
      center: location,
      radius: 500,
      strokeColor: "#000000",
      strokeOpacity: 1.0,
      strokeWeight: 10,
      fillColor: "#000000",
      fillOpacity: 0.1,
      map: map
    });
  }
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
