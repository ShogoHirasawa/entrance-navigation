import { useState, useEffect, useRef } from "react";
import { Destination } from "../types";
import { searchPlaces } from "../lib/mapbox";
import "./SearchForm.css";

interface SearchFormProps {
  onSelectDestination: (destination: Destination) => void;
  isLoading: boolean;
  mapboxToken: string;
}

export function SearchForm({
  onSelectDestination,
  isLoading,
  mapboxToken,
}: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchFormRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(query, mapboxToken);
        console.log(`✓ Found ${results.length} results for "${query}"`);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error("Search error:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, mapboxToken]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchFormRef.current &&
        !searchFormRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectSuggestion = (destination: Destination) => {
    setQuery(destination.name);
    setSuggestions([]);
    setShowSuggestions(false);
    onSelectDestination(destination);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Prevent form submission/page reload on Enter
      e.preventDefault();
      if (suggestions.length > 0) {
        // Select the first suggestion when Enter is pressed
        handleSelectSuggestion(suggestions[0]);
      }
    }
  };

  return (
    <div className="search-form" ref={searchFormRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search places..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        {isSearching && <div className="search-spinner">⏳</div>}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="suggestion-item"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="suggestion-name">{suggestion.name}</div>
              <div className="suggestion-address">{suggestion.address}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
