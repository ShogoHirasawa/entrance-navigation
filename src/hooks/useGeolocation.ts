import { useState, useCallback } from "react";
import { LatLng } from "../types";

interface UseGeolocationResult {
  requestLocation: () => void;
  isLocating: boolean;
  error: string | null;
}

interface UseGeolocationOptions {
  onSuccess?: (location: LatLng) => void;
  onError?: (error: string) => void;
}

export function useGeolocation(options?: UseGeolocationOptions): UseGeolocationResult {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by your browser";
      setError(errorMsg);
      options?.onError?.(errorMsg);
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const location: LatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        options?.onSuccess?.(location);
      },
      (err) => {
        setIsLocating(false);
        let errorMsg = "Could not get your current location.";
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = "Location permission denied.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = "Location information unavailable.";
            break;
          case err.TIMEOUT:
            errorMsg = "Location request timed out.";
            break;
        }
        
        setError(errorMsg);
        options?.onError?.(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [options]);

  return {
    requestLocation,
    isLocating,
    error,
  };
}
