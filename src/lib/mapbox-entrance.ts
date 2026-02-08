import { LatLng, EntrancePoint } from "../types";
import { MAPBOX_TOKEN } from "./config";

// Mapbox Geocoding v6 endpoint
const GEOCODING_V6_ENDPOINT =
  "https://api.mapbox.com/search/geocode/v6/forward";

// v6 response types
interface MapboxV6RoutablePoint {
  name: string; // "default" | "entrance"
  latitude: number;
  longitude: number;
  quality?: string; // "high" | "medium" | "low"
}

interface MapboxV6Coordinates {
  longitude: number;
  latitude: number;
  accuracy?: string;
  routable_points?: MapboxV6RoutablePoint[];
}

interface MapboxV6Properties {
  full_address?: string;
  name?: string;
  coordinates?: MapboxV6Coordinates;
}

interface MapboxV6Feature {
  properties?: MapboxV6Properties;
}

interface MapboxV6Response {
  features?: MapboxV6Feature[];
}

/**
 * Fetch entrance point using Mapbox Geocoding v6 API with entrances=true.
 *
 * Same signature as Naurt's fetchEntrancePoint for easy swap.
 */
export async function fetchEntrancePoint(params: {
  address: string;
  origin?: LatLng;
  destinationCoords?: LatLng;
}): Promise<EntrancePoint | null> {
  const { address, origin, destinationCoords } = params;

  if (!address) {
    return destinationCoords ? { location: destinationCoords } : null;
  }

  try {
    const queryParams = new URLSearchParams({
      q: address,
      access_token: MAPBOX_TOKEN,
      country: "US",
      limit: "1",
      entrances: "true",
    });

    // Add proximity bias: prefer destinationCoords, fallback to origin
    const proximity = destinationCoords ?? origin;
    if (proximity) {
      queryParams.set("proximity", `${proximity.lng},${proximity.lat}`);
    }

    const url = `${GEOCODING_V6_ENDPOINT}?${queryParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Mapbox Geocoding v6 error:", response.status);
      return destinationCoords ? { location: destinationCoords } : null;
    }

    const data: MapboxV6Response = await response.json();
    const feature = data.features?.[0];

    if (!feature?.properties?.coordinates) {
      console.warn("No geocoding result found");
      return destinationCoords ? { location: destinationCoords } : null;
    }

    const { routable_points } = feature.properties.coordinates;

    // Look for entrance point in routable_points
    if (routable_points && routable_points.length > 0) {
      const entrance = routable_points.find((p) => p.name === "entrance");

      if (entrance) {
        return {
          location: {
            lat: entrance.latitude,
            lng: entrance.longitude,
          },
        };
      }
    }

    // Fallback: use rooftop coordinates from the geocoding result
    const coords = feature.properties.coordinates;
    console.warn("No entrance data available, using rooftop coordinates");
    return {
      location: {
        lat: coords.latitude,
        lng: coords.longitude,
      },
    };
  } catch (error) {
    console.error("Error fetching Mapbox entrance:", error);
    return destinationCoords ? { location: destinationCoords } : null;
  }
}
