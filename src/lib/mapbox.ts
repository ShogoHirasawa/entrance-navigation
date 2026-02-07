import { Destination } from "../types";

// API endpoints
const GEOCODING_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

// San Francisco bounding box and center
const SF_BBOX = "-122.55,37.70,-122.35,37.83";
const SF_CENTER = "-122.4194,37.7749";
const SF_VIEWBOX = "-122.55,37.70,-122.35,37.83"; // viewbox for Nominatim (minLon,minLat,maxLon,maxLat)

// Mapbox Geocoding API interfaces
interface MapboxFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties?: {
    category?: string;
  };
  place_type?: string[];
}

interface MapboxResponse {
  features: MapboxFeature[];
}

// Nominatim (OpenStreetMap) API interfaces
interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type: string;
  class: string;
  importance: number;
}

// Search from Nominatim (OpenStreetMap) - good for businesses and POIs
async function searchNominatim(query: string): Promise<Destination[]> {
  const params = new URLSearchParams({
    q: `${query} San Francisco`,
    format: "json",
    addressdetails: "1",
    limit: "15",
    viewbox: SF_VIEWBOX,
    bounded: "1", // Restrict results to viewbox
    countrycodes: "us",
  });

  const url = `${NOMINATIM_ENDPOINT}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EntranceNavigator/1.0", // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.error("Nominatim API error:", response.status);
      return [];
    }

    const data: NominatimResult[] = await response.json();
    console.log(`Nominatim returned ${data.length} results`);

    type DestinationWithImportance = Destination & { importance: number };

    const filtered: DestinationWithImportance[] = data
      .filter((result) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        // Verify results are within San Francisco bounds
        const inBounds =
          lat >= 37.7 &&
          lat <= 37.83 &&
          lon >= -122.55 &&
          lon <= -122.35;
        
        // Filter out less relevant types
        const relevantTypes = ["shop", "amenity", "building", "place", "tourism", "leisure"];
        const isRelevant = relevantTypes.includes(result.class);
        
        return inBounds && (isRelevant || result.name);
      })
      .map((result) => ({
        id: `nominatim-${result.place_id}`,
        name: result.name || result.display_name.split(",")[0],
        address: result.display_name,
        location: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        },
        countryCode: "US",
        importance: result.importance,
      }));

    // Sort by importance (higher is better)
    return filtered.sort((a, b) => b.importance - a.importance) as Destination[];
  } catch (error) {
    console.error("Nominatim search error:", error);
    return [];
  }
}

// Search from Mapbox Geocoding API - good for addresses
async function searchMapbox(
  query: string,
  token: string
): Promise<Destination[]> {
  const encodedQuery = encodeURIComponent(query);
  const params = new URLSearchParams({
    access_token: token,
    proximity: SF_CENTER,
    bbox: SF_BBOX,
    limit: "10",
    country: "US",
  });

  const url = `${GEOCODING_ENDPOINT}/${encodedQuery}.json?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Mapbox geocoding error:", response.status);
      return [];
    }

    const data: MapboxResponse = await response.json();
    console.log(`Mapbox returned ${data.features.length} results`);

    return data.features.map((feature) => ({
      id: feature.id,
      name: feature.text,
      address: feature.place_name,
      location: {
        lat: feature.center[1],
        lng: feature.center[0],
      },
      countryCode: "US",
    }));
  } catch (error) {
    console.error("Mapbox search error:", error);
    return [];
  }
}

// Main search function - combines results from multiple sources
export async function searchPlaces(
  query: string,
  token: string
): Promise<Destination[]> {
  if (!query.trim()) {
    return [];
  }

  console.log("Searching for:", query);

  // Search from both APIs in parallel
  const [nominatimResults, mapboxResults] = await Promise.all([
    searchNominatim(query),
    searchMapbox(query, token),
  ]);

  // Combine results, prioritizing Nominatim for businesses
  const allResults = [...nominatimResults, ...mapboxResults];

  // Remove duplicates based on proximity (within ~100m)
  const uniqueResults: Destination[] = [];
  const seen = new Set<string>();

  for (const result of allResults) {
    const key = `${result.location.lat.toFixed(3)},${result.location.lng.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(result);
    }
  }

  // Sort by relevance (Nominatim results first as they're better for businesses)
  const sorted = uniqueResults.sort((a, b) => {
    const aIsNominatim = a.id.startsWith("nominatim");
    const bIsNominatim = b.id.startsWith("nominatim");
    if (aIsNominatim && !bIsNominatim) return -1;
    if (!aIsNominatim && bIsNominatim) return 1;
    return 0;
  });

  const finalResults = sorted.slice(0, 8); // Top 8 results
  console.log(`✓ Returning ${finalResults.length} results (${nominatimResults.length} from Nominatim, ${mapboxResults.length} from Mapbox)`);
  return finalResults;
}

// Reverse geocoding: Convert coordinates to a destination
export async function reverseGeocode(
  lng: number,
  lat: number,
  token: string
): Promise<Destination | null> {
  const url = `${GEOCODING_ENDPOINT}/${lng},${lat}.json`;
  const params = new URLSearchParams({
    access_token: token,
    country: "US",
    limit: "1",
    // types removed to allow all feature types
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`);

    if (!response.ok) {
      console.error("Reverse geocoding error:", response.status, response.statusText);
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (data.features.length === 0) {
      // No feature found, create a basic destination with coordinates
      return {
        id: `${lng},${lat}`,
        name: "Selected Location",
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        location: { lat, lng },
        countryCode: "US",
      };
    }

    const feature = data.features[0];
    return {
      id: feature.id,
      name: feature.text,
      address: feature.place_name,
      location: {
        lat: feature.center[1],
        lng: feature.center[0],
      },
      countryCode: "US",
    };
  } catch (error) {
    console.error("Error in reverse geocoding:", error);
    return null;
  }
}
