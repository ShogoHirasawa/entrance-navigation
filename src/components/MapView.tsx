import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { LatLng, Destination } from "../types";
import { reverseGeocode } from "../lib/mapbox";
import "./MapView.css";

interface MapViewProps {
  mapboxToken: string;
  currentLocation: LatLng | null;
  entrancePoint: LatLng | null;
  onMapClick?: (destination: Destination) => void;
  onLocationUpdate: (location: LatLng) => void;
}

const SF_CENTER: [number, number] = [-122.4194, 37.7749];
const DEFAULT_ZOOM = 12;
const DEFAULT_PITCH = 60; // Tilt angle for 3D view
const DEFAULT_BEARING = 0; // Rotation angle

export function MapView({
  mapboxToken,
  currentLocation,
  entrancePoint,
  onMapClick,
  onLocationUpdate,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const entranceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: SF_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      antialias: true, // Enable antialiasing for smoother 3D rendering
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add standard Mapbox geolocate control
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
    });

    map.addControl(geolocateControl, "top-right");
    geolocateControlRef.current = geolocateControl;

    // Listen to geolocate event to update parent state
    // This fires when the user's location is successfully obtained
    geolocateControl.on("geolocate", (e: any) => {
      const location: LatLng = {
        lat: e.coords.latitude,
        lng: e.coords.longitude,
      };
      // Update parent component's currentLocation state
      onLocationUpdate(location);
    });

    // Add 3D buildings layer when the map loads
    map.on("load", () => {
      // Insert the 3D building layer
      const layers = map.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === "symbol" && layer.layout?.["text-field"]
      )?.id;

      // Add 3D building layer
      if (!map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId
        );
      }
    });

    // Handle map clicks to set destination
    if (onMapClick) {
      map.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        
        // Change cursor to indicate loading
        map.getCanvas().style.cursor = "wait";
        
        try {
          const destination = await reverseGeocode(lng, lat, mapboxToken);
          if (destination) {
            onMapClick(destination);
          }
        } catch (error) {
          console.error("Error handling map click:", error);
        } finally {
          map.getCanvas().style.cursor = "";
        }
      });

      // Change cursor on hover to indicate clickability
      map.on("mouseenter", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      geolocateControlRef.current = null;
    };
  }, [mapboxToken, onLocationUpdate]);

  // Note: Current location marker is handled by GeolocateControl
  // No need for custom current location marker

  // Update entrance marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (entranceMarkerRef.current) {
      entranceMarkerRef.current.remove();
      entranceMarkerRef.current = null;
    }

    if (entrancePoint) {
      const el = document.createElement("div");
      el.className = "marker-entrance-icon";
      
      // Create image element for custom entrance icon
      const img = document.createElement("img");
      img.src = `${import.meta.env.BASE_URL}icons/entrance-icon.png`;
      img.alt = "Entrance";
      img.style.width = "40px";
      img.style.height = "40px";
      img.style.display = "block";

      el.appendChild(img);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([entrancePoint.lng, entrancePoint.lat])
        .addTo(mapRef.current);

      entranceMarkerRef.current = marker;
    }
  }, [entrancePoint]);

  // Fetch and display route from current location to entrance
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing route layer and source
    if (map.getLayer("route")) {
      map.removeLayer("route");
    }
    if (map.getSource("route")) {
      map.removeSource("route");
    }

    // If we have both current location and entrance, fetch the route
    if (currentLocation && entrancePoint) {
      const fetchRoute = async () => {
        try {
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLocation.lng},${currentLocation.lat};${entrancePoint.lng},${entrancePoint.lat}`;
          const params = new URLSearchParams({
            access_token: mapboxToken,
            geometries: "geojson",
            overview: "full",
          });

          const response = await fetch(`${url}?${params.toString()}`);
          if (!response.ok) {
            console.error("Directions API error:", response.status);
            return;
          }

          const data = await response.json();
          const route = data.routes[0];

          if (!route) {
            console.warn("No route found");
            return;
          }

          // Add route source and layer
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
          });

          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#1a73e8",
              "line-width": 5,
              "line-opacity": 0.8,
            },
          });

          // Fit bounds to show the route
          const coordinates = route.geometry.coordinates;
          const bounds = new mapboxgl.LngLatBounds();
          coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });

          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 80 },
            maxZoom: 16,
            pitch: DEFAULT_PITCH,
            bearing: DEFAULT_BEARING,
          });
        } catch (error) {
          console.error("Error fetching route:", error);
        }
      };

      fetchRoute();
    } else {
      // No route to display, just fit to visible markers
      const points: LatLng[] = [];
      if (currentLocation) points.push(currentLocation);
      if (entrancePoint) points.push(entrancePoint);

      if (points.length === 0) {
        // No markers, reset to SF center
        map.flyTo({
          center: SF_CENTER,
          zoom: DEFAULT_ZOOM,
          pitch: DEFAULT_PITCH,
          bearing: DEFAULT_BEARING,
        });
      } else if (points.length === 1) {
        // Single marker, center on it
        map.flyTo({
          center: [points[0].lng, points[0].lat],
          zoom: 16,
          pitch: DEFAULT_PITCH,
          bearing: DEFAULT_BEARING,
        });
      }
    }
  }, [currentLocation, entrancePoint, mapboxToken]);

  return <div ref={mapContainerRef} className="map-container" />;
}
