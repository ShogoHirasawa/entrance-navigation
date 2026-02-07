export type LatLng = {
  lat: number;
  lng: number;
};

export type Destination = {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  countryCode?: string;
};

export type EntrancePoint = {
  location: LatLng;
};

export type AppState = {
  currentLocation: LatLng | null;
  destination: Destination | null;
  entrancePoint: EntrancePoint | null;
  isFetchingGeocode: boolean;
  isFetchingEntrance: boolean;
  errorMessage: string | null;
};
