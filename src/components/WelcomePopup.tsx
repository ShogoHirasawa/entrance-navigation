import { useEffect, useState } from "react";
import "./WelcomePopup.css";

interface WelcomePopupProps {
  onClose: () => void;
}

export function WelcomePopup({ onClose }: WelcomePopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className={`popup-overlay ${isVisible ? "visible" : ""}`}>
      <div className={`popup-container ${isVisible ? "visible" : ""}`}>
        <button className="popup-close" onClick={handleClose} aria-label="Close">
          ×
        </button>
        
        <div className="popup-content">
          {/* Compact Hero Section */}
          <div className="popup-hero">
            <div className="hero-icon-wrapper">
              <svg className="hero-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Simplified Building Icon */}
                <rect x="14" y="16" width="20" height="22" fill="#E8F0FE" stroke="#1A73E8" strokeWidth="2" rx="1"/>
                <rect x="18" y="20" width="3" height="3" fill="#FFFFFF"/>
                <rect x="23" y="20" width="3" height="3" fill="#FFFFFF"/>
                <rect x="28" y="20" width="3" height="3" fill="#FFFFFF"/>
                <rect x="18" y="26" width="3" height="3" fill="#FFFFFF"/>
                <rect x="23" y="26" width="3" height="3" fill="#FFFFFF"/>
                <rect x="28" y="26" width="3" height="3" fill="#FFFFFF"/>
                <rect x="21" y="32" width="6" height="6" fill="#1A73E8"/>
                
                {/* Entrance Marker */}
                <circle cx="24" cy="12" r="5" fill="#34A853"/>
                <path d="M24 9.5 L24 14.5 M21.5 12 L26.5 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            
            <h1 className="popup-title">Find exact entrances</h1>
            <div className="popup-location-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>San Francisco only</span>
            </div>
          </div>
          
          {/* Features Section - Content First */}
          <div className="popup-body">
            <p className="popup-description">
              Navigate delivery drivers to the right door, every time
            </p>
            
            <div className="popup-features">
              <div className="popup-feature">
                <div className="feature-number">1</div>
                <div className="feature-content">
                  <div className="feature-title">Search any business</div>
                  <div className="feature-description">Type a name or address</div>
                </div>
              </div>

              <div className="popup-feature">
                <div className="feature-number">2</div>
                <div className="feature-content">
                  <div className="feature-title">Get the entrance</div>
                  <div className="feature-description">AI finds the exact door</div>
                </div>
              </div>

              <div className="popup-feature">
                <div className="feature-number">3</div>
                <div className="feature-content">
                  <div className="feature-title">Navigate there</div>
                  <div className="feature-description">Follow the 3D map route</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="popup-actions">
            <button className="popup-button" onClick={handleClose}>
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
