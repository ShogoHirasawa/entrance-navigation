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

  // Stable refs for callbacks to avoid re-creating the map
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onLocationUpdateRef = useRef(onLocationUpdate);
  onLocationUpdateRef.current = onLocationUpdate;

  // Initialize map - runs only once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: SF_CENTER,
      zoom: DEFAULT_ZOOM,
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

    // Listen to geolocate event - update parent state once
    let hasReportedLocation = false;
    geolocateControl.on("geolocate", (e: any) => {
      if (!hasReportedLocation) {
        hasReportedLocation = true;
        const location: LatLng = {
          lat: e.coords.latitude,
          lng: e.coords.longitude,
        };
        onLocationUpdateRef.current(location);
      }
    });

    // Handle map clicks to set destination
    map.on("click", async (e) => {
      if (!onMapClickRef.current) return;
      const { lng, lat } = e.lngLat;
      
      map.getCanvas().style.cursor = "wait";
      
      try {
        const destination = await reverseGeocode(lng, lat, mapboxToken);
        if (destination) {
          onMapClickRef.current(destination);
        }
      } catch (error) {
        console.error("Error handling map click:", error);
      } finally {
        map.getCanvas().style.cursor = "";
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      geolocateControlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

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

      // Fly to entrance point
      mapRef.current.flyTo({
        center: [entrancePoint.lng, entrancePoint.lat],
        zoom: 17,
      });
    }
  }, [entrancePoint]);

  // Fetch and display route - only when entrancePoint changes
  const currentLocationRef = useRef(currentLocation);
  currentLocationRef.current = currentLocation;

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

    const loc = currentLocationRef.current;

    // Only fetch route when we have both location and entrance
    if (loc && entrancePoint) {
      const fetchRoute = async () => {
        try {
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${loc.lng},${loc.lat};${entrancePoint.lng},${entrancePoint.lat}`;
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

          if (!route || !mapRef.current) return;

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

          // Use smaller padding on mobile screens
          const isMobile = window.innerWidth < 768;
          const pad = isMobile ? 40 : 80;
          map.fitBounds(bounds, {
            padding: { top: pad, bottom: pad, left: pad, right: pad },
            maxZoom: 16,
          });
        } catch (error) {
          console.error("Error fetching route:", error);
        }
      };

      fetchRoute();
    }
  }, [entrancePoint, mapboxToken]);

  return <div ref={mapContainerRef} className="map-container" />;
}
