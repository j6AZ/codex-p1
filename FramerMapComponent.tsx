import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * Google Maps Location Search Component
 * 
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 */
export default function MapComponent(props) {
    const {
        style,
        apiKey,
        defaultLat,
        defaultLng,
        defaultZoom,
    } = props
    const mapRef = useRef<HTMLDivElement>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [boundary, setBoundary] = useState<google.maps.Rectangle | null>(null)
    const [showRemoveButton, setShowRemoveButton] = useState(false)
    const [showInstruction, setShowInstruction] = useState(false)

    // Load Google Maps script
    useEffect(() => {
        if (window.google?.maps) {
            setIsLoaded(true)
            return
        }

        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing`
        script.async = true
        script.defer = true
        script.onload = () => setIsLoaded(true)
        document.head.appendChild(script)

        return () => {
            // Cleanup if needed
        }
    }, [apiKey])

    // Initialize map
    useEffect(() => {
        if (!isLoaded || !mapRef.current || map) return

        const newMap = new google.maps.Map(mapRef.current, {
            center: { lat: defaultLat, lng: defaultLng },
            zoom: defaultZoom,
            gestureHandling: "greedy",
            styles: [
                { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
                { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
                { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
                { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
                { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
                { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
                { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
                { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
                { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
                { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
                { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
            ],
        })

        setMap(newMap)
    }, [isLoaded, defaultLat, defaultLng, defaultZoom])

    // Initialize autocomplete
    useEffect(() => {
        if (!map || !isLoaded) return

        const input = document.getElementById("pac-input") as HTMLInputElement
        if (!input) return

        const autocomplete = new google.maps.places.Autocomplete(input)
        autocomplete.bindTo("bounds", map)

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace()

            if (!place.geometry || !place.geometry.location) {
                return
            }

            // Create boundary
            createBoundary(place)
        })
    }, [map, isLoaded])

    const createBoundary = (place: google.maps.places.PlaceResult) => {
        // Remove existing boundary
        if (boundary) {
            boundary.setMap(null)
        }

        let center: google.maps.LatLng
        let radius: number

        if (place.geometry?.viewport) {
            const bounds = place.geometry.viewport
            const ne = bounds.getNorthEast()
            const sw = bounds.getSouthWest()
            center = new google.maps.LatLng(
                (ne.lat() + sw.lat()) / 2,
                (ne.lng() + sw.lng()) / 2
            )
            const latDiff = ne.lat() - sw.lat()
            const lngDiff = ne.lng() - sw.lng()
            radius = Math.max(latDiff, lngDiff) * 111320 / 2
            map?.fitBounds(bounds)
        } else {
            center = place.geometry!.location!
            radius = 500
        }

        // Calculate rectangle bounds
        const latOffset = radius / 111320
        const lngOffset = radius / (111320 * Math.cos((center.lat() * Math.PI) / 180))

        const rectBounds = {
            north: center.lat() + latOffset,
            south: center.lat() - latOffset,
            east: center.lng() + lngOffset,
            west: center.lng() - lngOffset,
        }

        // Create editable and draggable rectangle
        const newBoundary = new google.maps.Rectangle({
            bounds: rectBounds,
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 10,
            fillColor: "#000000",
            fillOpacity: 0.1,
            map: map,
            editable: true,
            draggable: true,
        })

        setBoundary(newBoundary)
        setShowRemoveButton(true)
        setShowInstruction(true)

        // Auto-hide instruction after 5 seconds
        setTimeout(() => {
            setShowInstruction(false)
        }, 5000)
    }

    const removeBoundary = () => {
        if (boundary) {
            boundary.setMap(null)
            setBoundary(null)
        }
        setShowRemoveButton(false)
        setShowInstruction(false)
    }

    return (
        <div style={{ width: "100%", height: "100%", position: "relative", ...style }}>
            {/* Search Card */}
            <div
                style={{
                    position: "absolute",
                    top: "52px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 5,
                    backgroundColor: "#ffffff",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minWidth: "min(90vw, 360px)",
                }}
            >
                <label
                    style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#5f6368",
                    }}
                >
                    Search for a place
                </label>
                <input
                    id="pac-input"
                    type="text"
                    placeholder="Enter a location"
                    style={{
                        padding: "10px 12px",
                        fontSize: "1rem",
                        border: "1px solid #dadce0",
                        borderRadius: "8px",
                        outline: "none",
                        boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.1)",
                    }}
                />
            </div>

            {/* Remove Boundary Button */}
            {showRemoveButton && (
                <div
                    style={{
                        position: "absolute",
                        top: "152px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 10,
                    }}
                >
                    <button
                        onClick={removeBoundary}
                        style={{
                            backgroundColor: "white",
                            border: "1px solid #dadce0",
                            borderRadius: "4px",
                            color: "#1a73e8",
                            cursor: "pointer",
                            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            padding: "11px",
                            display: "flex",
                            alignItems: "center",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        }}
                    >
                        Remove Boundary
                    </button>
                </div>
            )}

            {/* Instruction Banner */}
            <div
                style={{
                    position: "fixed",
                    bottom: showInstruction ? "0" : "-100px",
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.85)",
                    padding: "20px",
                    textAlign: "center",
                    fontSize: "16px",
                    color: "white",
                    fontWeight: 500,
                    zIndex: 1000,
                    transition: "bottom 0.5s ease-out",
                    boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.3)",
                }}
            >
                Resize the selected area to refine your search location
            </div>

            {/* Map Container */}
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        </div>
    )
}

// Default props
MapComponent.defaultProps = {
    apiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    defaultLat: 37.7749,
    defaultLng: -122.4194,
    defaultZoom: 12,
}

// Framer property controls
addPropertyControls(MapComponent, {
    apiKey: {
        type: ControlType.String,
        title: "API Key",
        description: "Your Google Maps API key with Maps JavaScript API and Places API enabled",
        placeholder: "Enter your API key",
    },
    defaultLat: {
        type: ControlType.Number,
        title: "Latitude",
        description: "Default map center latitude",
        step: 0.0001,
        displayStepper: true,
    },
    defaultLng: {
        type: ControlType.Number,
        title: "Longitude",
        description: "Default map center longitude",
        step: 0.0001,
        displayStepper: true,
    },
    defaultZoom: {
        type: ControlType.Number,
        title: "Zoom",
        description: "Default map zoom level (1-20)",
        min: 1,
        max: 20,
        step: 1,
        displayStepper: true,
    },
})
