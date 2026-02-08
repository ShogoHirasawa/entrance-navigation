/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
  readonly VITE_NAURT_API_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
