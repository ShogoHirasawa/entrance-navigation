# Entrance Navigator

A single-page web app prototype for delivery drivers that helps find building entrance points for destinations in San Francisco.

## Features

- **Welcome Dialog**: Material Design 3 welcome popup explaining the app's purpose
- **Current Location**: Built-in Mapbox geolocation control with real-time tracking
- **Enhanced Destination Search**: Search for businesses, stores, addresses, and places with intelligent autocomplete
  - Powered by OpenStreetMap (Nominatim) for business/POI search
  - Backed by Mapbox Geocoding for comprehensive address coverage
  - Works like Google Maps - finds Target, Starbucks, Whole Foods, etc.
  - Press Enter to select the first result
- **Smart Entrance Detection**: Automatically finds the building entrance using Naurt API
  - Uses destination coordinates for precise building identification
  - Fallback to destination coordinates if entrance data unavailable
- **Turn-by-Turn Route Navigation**: Displays driving directions from current location to entrance
- **Interactive 3D Map**: View all points on a 3D Mapbox map (pitch: 60°)
  - Custom entrance marker icon
  - 3D buildings layer for better visualization
- **Click-to-Select**: Click any POI on the map to set as destination
- **Fully Responsive**: Optimized for both mobile and desktop devices

## Technology Stack

- **Vite** - Build tool and dev server
- **React** - UI framework
- **TypeScript** - Type safety
- **Mapbox GL JS** - Interactive 3D maps and directions
- **OpenStreetMap Nominatim** - Free business and POI search
- **Mapbox Geocoding API** - Address geocoding (fallback)
- **Naurt API** - Building entrance detection

## Setup

### Prerequisites

- Node.js (v20.19+ or v22.12+)
- npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. (Optional) Configure environment variables:

Create a `.env` file in the project root:

```
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
VITE_NAURT_API_KEY=your_naurt_api_key_here
```

**Note**: The app includes a default Mapbox token for testing. For production use, set your own tokens.

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

### Build

Create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **First Time Access**:
   - A welcome dialog explains the app's purpose and features
   - Click "Get Started" to begin

2. **Search for a Destination**:
   - Type a business name or address in San Francisco in the search box
   - Select a destination from the autocomplete suggestions (or press Enter for the first result)
   - The entrance point will automatically appear as a custom green marker
   - A yellow route line shows the path from your location to the entrance

3. **Get Current Location**:
   - Click the geolocation button in the top-right corner
   - Allow location access when prompted
   - Your location will be tracked in real-time with a blue dot

4. **Alternative: Click to Select**:
   - Click any POI or building on the map to set it as the destination
   - The entrance will be detected automatically

5. **Navigate**:
   - Follow the turn-by-turn route displayed on the 3D map
   - Use map controls to rotate, tilt, and zoom

## Map Elements

- 🔵 **Blue Dot** - Your current location (with heading indicator)
- 🟢 **Custom Green Icon** - Building entrance point (with routing)
- 🗺️ **3D Buildings** - Elevated building visualization
- 📍 **Yellow Route** - Directions from current location to entrance

## Scope

This is a prototype focused on **San Francisco, CA, USA only**:
- All geocoding is limited to San Francisco area
- Initial map center: `37.7749, -122.4194`
- Bounding box: `-122.55,37.70,-122.35,37.83`

## API Documentation

- **Mapbox Geocoding**: [https://docs.mapbox.com/api/search/geocoding/](https://docs.mapbox.com/api/search/geocoding/)
- **Naurt Final Destination v2**: [https://docs.naurt.com/version2/introduction](https://docs.naurt.com/version2/introduction)

## Project Structure

```
src/
├── components/              # React components
│   ├── WelcomePopup.tsx     # Material Design welcome dialog
│   ├── SearchForm.tsx       # Destination search with autocomplete
│   └── MapView.tsx          # Mapbox 3D map with markers & routing
├── hooks/
│   └── useGeolocation.ts    # Browser geolocation hook
├── lib/
│   ├── mapbox.ts            # Hybrid search (Nominatim + Mapbox Geocoding)
│   └── naurt.ts             # Naurt API integration with fallback
├── types/
│   └── index.ts             # TypeScript type definitions
├── App.tsx                  # Main app with state management
├── App.css                  # App-level styles
└── main.tsx                 # Entry point
public/
├── icons/
│   └── entrance-icon.png    # Custom entrance marker
└── popup.png                # Welcome dialog illustration
```

## Error Handling

The app provides user-friendly error messages for:
- Failed geolocation requests
- Geocoding API errors
- Missing entrance data
- Network failures

Errors appear in a dismissible banner at the top of the controls area.

## License

See LICENSE file for details.
