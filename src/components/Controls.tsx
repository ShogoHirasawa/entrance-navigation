import "./Controls.css";

interface ControlsProps {
  onRequestCurrentLocation: () => void;
  isLocating: boolean;
}

export function Controls({ onRequestCurrentLocation, isLocating }: ControlsProps) {
  return (
    <div className="controls">
      <button
        className="location-button"
        onClick={onRequestCurrentLocation}
        disabled={isLocating}
      >
        {isLocating ? "Getting location..." : "Get current location"}
      </button>
    </div>
  );
}
