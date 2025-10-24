if (typeof GOOGLE_MAPS_API_KEY === "undefined" || !GOOGLE_MAPS_API_KEY) {
  throw new Error(
    "Google Maps API key missing. Copy config.js.example to config.js and fill in your key."
  );
}

const script = document.createElement("script");
script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
script.async = true;
script.defer = true;
document.head.appendChild(script);

let map;
let marker;
let autocomplete;

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
  });
};
