import { LatLng, EntrancePoint } from "../types";

const NAURT_ENDPOINT = "https://api.naurt.net/final-destination/v2";
const NAURT_API_KEY = import.meta.env.VITE_NAURT_API_KEY;

if (!NAURT_API_KEY) {
  console.warn("VITE_NAURT_API_KEY is not set. Naurt calls will fail.");
}

interface NaurtQuery {
  address_string: string;
  country: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface NaurtRequestBody {
  queries: NaurtQuery[];
  options: {
    geojson_type: string;
  };
}

interface NaurtGeometry {
  type: string;
  coordinates: number[][];
}

interface NaurtGeoJsonFeature {
  geometry?: NaurtGeometry;
}

interface NaurtGeoJson {
  entrance?: NaurtGeoJsonFeature;
  building?: NaurtGeoJsonFeature;
  default_geocode?: NaurtGeoJsonFeature;
  parking?: NaurtGeoJsonFeature;
}

interface NaurtBestMatch {
  geojson?: NaurtGeoJson;
}

interface NaurtResponse {
  best_match?: NaurtBestMatch;
}

interface NaurtApiResponse {
  responses?: NaurtResponse[];
}

export async function fetchEntrancePoint(params: {
  address: string;
  origin?: LatLng;
  destinationCoords?: LatLng;
}): Promise<EntrancePoint | null> {
  const { address, origin, destinationCoords } = params;

  if (!NAURT_API_KEY) {
    console.error("Naurt API key is not configured");
    return null;
  }

  // Use destination coordinates as the location parameter to help Naurt find the correct place
  const query: NaurtQuery = {
    address_string: address,
    country: "US",
  };

  // Prioritize destination coordinates over origin to help Naurt locate the correct building
  if (destinationCoords) {
    query.location = {
      latitude: destinationCoords.lat,
      longitude: destinationCoords.lng,
    };
  } else if (origin) {
    query.location = {
      latitude: origin.lat,
      longitude: origin.lng,
    };
  }

  const body: NaurtRequestBody = {
    queries: [query],
    options: {
      geojson_type: "key_value",
    },
  };

  try {
    const res = await fetch(NAURT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: NAURT_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Naurt API error:", res.status, text);
      
      // Fallback to destination coordinates
      if (destinationCoords) {
        return { location: destinationCoords };
      }
      return null;
    }

    const json: NaurtApiResponse = await res.json();
    const response = json.responses?.[0];
    
    if (!response || !response.best_match) {
      // Fallback to destination coordinates
      if (destinationCoords) {
        return { location: destinationCoords };
      }
      return null;
    }

    const entrance = response.best_match.geojson?.entrance;
    
    if (!entrance?.geometry?.coordinates?.length) {
      // Fallback to destination coordinates
      if (destinationCoords) {
        return { location: destinationCoords };
      }
      return null;
    }

    // entrance.geometry.coordinates is expected to be [[lon, lat], ...] (MultiPoint)
    const first = entrance.geometry.coordinates[0];
    
    if (!first || first.length < 2) {
      // Fallback to destination coordinates
      if (destinationCoords) {
        return { location: destinationCoords };
      }
      return null;
    }

    const [lng, lat] = first;

    return {
      location: { lat, lng },
    };
  } catch (error) {
    console.error("Error fetching entrance point:", error);
    
    // Fallback to destination coordinates
    if (destinationCoords) {
      return { location: destinationCoords };
    }
    return null;
  }
}
