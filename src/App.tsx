import { useState, useEffect, useCallback } from "react";
import { SearchForm } from "./components/SearchForm";
import { MapView } from "./components/MapView";
import { WelcomePopup } from "./components/WelcomePopup";
// Mapbox Geocoding v6 entrance (replaces Naurt for testing)
import { fetchEntrancePoint } from "./lib/mapbox-entrance";
import { LatLng, Destination, EntrancePoint } from "./types";
import "./App.css";

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ??
  "pk.eyJ1Ijoic2hvZ29oaXJhc2F3YSIsImEiOiJjazFhbzVrMG0yNmxjM2xuaTBmM3h0dW4wIn0.Bxjy09jy_cwOQVexF1xBfg";

const WELCOME_POPUP_KEY = "entrance-navigator-welcome-shown";

function App() {
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [entrancePoint, setEntrancePoint] = useState<EntrancePoint | null>(null);
  const [isFetchingEntrance, setIsFetchingEntrance] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  // Check if welcome popup should be shown
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_POPUP_KEY);
    if (!hasSeenWelcome) {
      setShowWelcomePopup(true);
    }
  }, []);

  // Handle geolocation from Mapbox GeolocateControl
  const handleLocationUpdate = useCallback((location: LatLng) => {
    setCurrentLocation(location);
  }, []);

  // Fetch entrance point when destination changes
  useEffect(() => {
    async function updateEntrance() {
      if (!destination) {
        setEntrancePoint(null);
        return;
      }

      setIsFetchingEntrance(true);

      try {
        const point = await fetchEntrancePoint({
          address: destination.address,
          origin: currentLocation ?? undefined,
          destinationCoords: destination.location,
        });

        setEntrancePoint(point);
      } catch (e) {
        console.error(e);
        setEntrancePoint(null);
      } finally {
        setIsFetchingEntrance(false);
      }
    }

    updateEntrance();
    // currentLocationを依存配列から削除 - destinationが変わった時だけ実行
  }, [destination]);

  const handleSelectDestination = (dest: Destination) => {
    setDestination(dest);
  };

  const handleCloseWelcome = () => {
    setShowWelcomePopup(false);
    localStorage.setItem(WELCOME_POPUP_KEY, "true");
  };

  return (
    <div className="app-container">
      {showWelcomePopup && <WelcomePopup onClose={handleCloseWelcome} />}

      <div className="search-overlay">
        <SearchForm
          onSelectDestination={handleSelectDestination}
          isLoading={isFetchingEntrance}
          mapboxToken={MAPBOX_TOKEN}
        />
      </div>

      <MapView
        mapboxToken={MAPBOX_TOKEN}
        currentLocation={currentLocation}
        entrancePoint={entrancePoint?.location ?? null}
        onMapClick={handleSelectDestination}
        onLocationUpdate={handleLocationUpdate}
      />
    </div>
  );
}

export default App;
