import { Destination } from "../types";

// === Google Places API (New) ===
const GOOGLE_PLACES_ENDPOINT =
  "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACE_DETAILS_ENDPOINT =
  "https://places.googleapis.com/v1/places";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? "";

if (!GOOGLE_API_KEY) {
  console.warn(
    "VITE_GOOGLE_PLACES_API_KEY is not set. Place search will not work."
  );
}

// San Francisco location bias for Google Places
const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

// Google Places Autocomplete response types
interface GoogleAutocompleteSuggestion {
  placePrediction?: {
    placeId: string;
    text: { text: string };
    structuredFormat: {
      mainText: { text: string };
      secondaryText?: { text: string };
    };
  };
}

interface GoogleAutocompleteResponse {
  suggestions?: GoogleAutocompleteSuggestion[];
}

interface GooglePlaceDetailsResponse {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// Main search function using Google Places Autocomplete (New)
export async function searchPlaces(
  query: string,
  _token?: string // kept for API compatibility, unused
): Promise<Destination[]> {
  if (!query.trim() || !GOOGLE_API_KEY) {
    return [];
  }

  try {
    // Step 1: Autocomplete
    const autocompleteBody = {
      input: query,
      locationBias: {
        circle: {
          center: { latitude: SF_LAT, longitude: SF_LNG },
          radius: 10000, // 10 km radius around SF
        },
      },
      includedRegionCodes: ["us"],
      languageCode: "en",
    };

    const acResponse = await fetch(GOOGLE_PLACES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
      },
      body: JSON.stringify(autocompleteBody),
    });

    if (!acResponse.ok) {
      console.error("Google Autocomplete error:", acResponse.status);
      return [];
    }

    const acData: GoogleAutocompleteResponse = await acResponse.json();
    const suggestions = acData.suggestions ?? [];

    if (suggestions.length === 0) {
      return [];
    }

    // Step 2: Fetch details for each suggestion (location coordinates)
    const detailsPromises = suggestions
      .slice(0, 5) // Limit to top 5
      .filter((s) => s.placePrediction?.placeId)
      .map(async (suggestion) => {
        const placeId = suggestion.placePrediction!.placeId;
        const mainText =
          suggestion.placePrediction!.structuredFormat.mainText.text;
        const secondaryText =
          suggestion.placePrediction!.structuredFormat.secondaryText?.text ?? "";

        try {
          const detailResponse = await fetch(
            `${GOOGLE_PLACE_DETAILS_ENDPOINT}/${placeId}`,
            {
              headers: {
                "X-Goog-Api-Key": GOOGLE_API_KEY,
                "X-Goog-FieldMask":
                  "id,displayName,formattedAddress,location",
              },
            }
          );

          if (!detailResponse.ok) {
            return null;
          }

          const detail: GooglePlaceDetailsResponse =
            await detailResponse.json();

          if (!detail.location) {
            return null;
          }

          const dest: Destination = {
            id: placeId,
            name: detail.displayName?.text ?? mainText,
            address: detail.formattedAddress ?? secondaryText,
            location: {
              lat: detail.location.latitude,
              lng: detail.location.longitude,
            },
            countryCode: "US",
          };

          return dest;
        } catch {
          return null;
        }
      });

    const results = await Promise.all(detailsPromises);
    const filtered = results.filter((r): r is Destination => r !== null);

    return filtered;
  } catch (error) {
    console.error("Google Places search error:", error);
    return [];
  }
}

// === Mapbox Reverse Geocoding (kept for map click) ===
const GEOCODING_ENDPOINT =
  "https://api.mapbox.com/geocoding/v5/mapbox.places";

interface MapboxFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
}

interface MapboxResponse {
  features: MapboxFeature[];
}

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
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`);

    if (!response.ok) {
      console.error(
        "Reverse geocoding error:",
        response.status,
        response.statusText
      );
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (data.features.length === 0) {
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
