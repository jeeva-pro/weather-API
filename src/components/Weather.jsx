import { useEffect, useMemo, useRef, useState } from "react";
import "./Weather.css";

import clear_icon from "../assets/clear.png";
import cloud_icon from "../assets/cloud.png";
import drizzle_icon from "../assets/drizzle.png";
import rain_icon from "../assets/rain.png";
import search_icon from "../assets/search.png";
import snow_icon from "../assets/snow.png";
import wind_icon from "../assets/wind.png";
import humidity_icon from "../assets/humidity.png";

const Weather = () => {
  // https://api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}
  const API_KEY = "24055e17098205e804e150c5608803d3";
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState(
    /** @type {Array<{ name: string, state?: string, country?: string, lat: number, lon: number, label: string }>} */ (
      []
    )
  );
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [city, setCity] = useState(null);
  const [error, setError] = useState(null);
  const suggestionCacheRef = useRef(new Map());
  const [weatherRequest, setWeatherRequest] = useState(
    /** @type {{ type: "coords", lat: number, lon: number } | { type: "q", q: string }} */ ({
      type: "q",
      q: "Chennai",
    })
  );

  const weatherIcon = useMemo(() => {
    const weatherMain = city?.weather?.[0]?.main;
    if (weatherMain === "Clouds") return cloud_icon;
    if (weatherMain === "Drizzle") return drizzle_icon;
    if (weatherMain === "Rain") return rain_icon;
    if (weatherMain === "Snow") return snow_icon;
    return clear_icon;
  }, [city]);

  const countryLabel = useMemo(() => {
    const countryCode = city?.sys?.country;
    if (!countryCode) return null;

    try {
      // e.g. "IN" -> "India"
      const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
      const countryName = displayNames.of(countryCode);
      const cityName = (city?.name || "").trim().toLowerCase();
      const normalizedCountry = (countryName || "").trim().toLowerCase();

      // Avoid "Hong Kong, Hong Kong (HK)" type duplication
      if (cityName && normalizedCountry && cityName === normalizedCountry) {
        return countryCode;
      }

      return `${countryName} (${countryCode})`;
    } catch {
      return countryCode;
    }
  }, [city]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setError(null);
        let url = "";

        if (weatherRequest.type === "coords") {
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(
            String(weatherRequest.lat)
          )}&lon=${encodeURIComponent(
            String(weatherRequest.lon)
          )}&appid=${API_KEY}&units=metric`;
        } else {
          const trimmedQuery = weatherRequest.q.trim();
          if (!trimmedQuery) return;
          url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            trimmedQuery
          )}&appid=${API_KEY}&units=metric`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
          setCity(null);
          setError(result?.message || "Unable to fetch weather for that city.");
          return;
        }

        setCity(result);
      } catch {
        setCity(null);
        setError("Network error. Please try again.");
      }
    };

    fetchWeather();
  }, [weatherRequest]);

  const buildSuggestionLabel = (geoResult) => {
    const parts = [
      geoResult?.name,
      geoResult?.state,
      geoResult?.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  useEffect(() => {
    const value = searchInput.trim();
    if (value.length < 2) {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      return;
    }

    const cached = suggestionCacheRef.current.get(value.toLowerCase());
    if (cached) {
      setSuggestions(cached);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
            value
          )}&limit=8&appid=${API_KEY}`,
          { signal: controller.signal }
        );
        const result = await response.json();
        if (!response.ok || !Array.isArray(result)) {
          setSuggestions([]);
          return;
        }

        const nextSuggestions = result.map((r) => ({
          name: r.name,
          state: r.state,
          country: r.country,
          lat: r.lat,
          lon: r.lon,
          label: buildSuggestionLabel(r),
        }));

        suggestionCacheRef.current.set(value.toLowerCase(), nextSuggestions);
        setSuggestions(nextSuggestions);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setSuggestions([]);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchInput]);

  const submitSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    // Try to resolve to coordinates first for better accuracy, then fallback to city-name query
    (async () => {
      try {
        setError(null);
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
            trimmed
          )}&limit=1&appid=${API_KEY}`
        );
        const result = await response.json();
        if (response.ok && Array.isArray(result) && result[0]?.lat && result[0]?.lon) {
          setWeatherRequest({ type: "coords", lat: result[0].lat, lon: result[0].lon });
          return;
        }
      } catch {
        // ignore and fallback below
      }

      setWeatherRequest({ type: "q", q: trimmed });
    })();

    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  const selectSuggestion = (selectedCity) => {
    setSearchInput(selectedCity.label);
    setWeatherRequest({ type: "coords", lat: selectedCity.lat, lon: selectedCity.lon });
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  const handleInputChange = (value) => {
    setSearchInput(value);
    setActiveSuggestionIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        Math.min(current + 1, suggestions.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (
        activeSuggestionIndex >= 0 &&
        suggestions[activeSuggestionIndex]
      ) {
        selectSuggestion(suggestions[activeSuggestionIndex]);
        return;
      }
      submitSearch();
      return;
    }

    if (event.key === "Escape") {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  };

  return (
    <div className="weather">
      <div className="search-bar">
        <div className="search-input">
          <input
            type="text"
            placeholder="Search city"
            spellCheck="false"
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // allow suggestion click before closing
              setTimeout(() => {
                setSuggestions([]);
                setActiveSuggestionIndex(-1);
              }, 100);
            }}
          />

          {suggestions.length > 0 && (
            <ul
              className="suggestions"
              role="listbox"
              aria-label="City suggestions"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.label}-${suggestion.lat}-${suggestion.lon}`}
                  className={index === activeSuggestionIndex ? "active" : ""}
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                >
                  {suggestion.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <img src={search_icon} alt="Search" onClick={submitSearch} />
      </div>

      {error && <p className="error">{error}</p>}

      <img src={weatherIcon} alt="" className="weather-icon" />
      <p className="temperature">{city?.main?.temp}°C</p>
      <p className="location">
        {city?.name}
        {countryLabel ? (countryLabel.length === 2 ? ` (${countryLabel})` : `, ${countryLabel}`) : ""}
      </p>
      <div className="weather-data">
        <div className="col">
          <img src={humidity_icon} alt="" />
          <div>
            <p>{city?.main?.humidity}%</p>
            <span>Humidity</span>
          </div>
        </div>
        <div className="col">
          <img src={wind_icon} alt="" />
          <div>
            <p>{city?.wind?.speed} Km/h</p>
            <span>Wind Speed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weather;
