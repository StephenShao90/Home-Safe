import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../utils/googleMapsLoader.js';

function LocationAutocompleteInput({id, value, onChange, placeholder = 'Search for a place'}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isReady, setIsReady] = useState(false);

  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const debounceRef = useRef(null);
  const rootRef = useRef(null);
  const placesDivRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const google = await loadGoogleMaps(apiKey);

        if (!mounted || !google?.maps?.places) {
          return;
        }

        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        placesServiceRef.current = new google.maps.places.PlacesService(
          placesDivRef.current
        );
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize autocomplete:', error);
      }
    }

    setup();

    return () => {
      mounted = false;
      clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isReady || !value || !value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current || !window.google?.maps?.places) {
        setSuggestions([]);
        setIsOpen(false);
        setActiveIndex(-1);
        return;
      }

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value.trim(),
          componentRestrictions: { country: 'ca' },
        },
        (predictions, status) => {
          if ( status !== window.google.maps.places.PlacesServiceStatus.OK || !Array.isArray(predictions) ) {
            setSuggestions([]);
            setIsOpen(false);
            setActiveIndex(-1);
            return;
          }

          const topFive = predictions.slice(0, 5);
          setSuggestions(topFive);
          setIsOpen(topFive.length > 0);
          setActiveIndex(-1);
        }
      );
    }, 220);

    return () => clearTimeout(debounceRef.current);
  }, [value, isReady]);

  function selectPrediction(prediction) {
    if (!prediction || !placesServiceRef.current || !window.google?.maps?.places) {
      return;
    }

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'name', 'geometry']
      },
      (place, status) => {
        if ( status === window.google.maps.places.PlacesServiceStatus.OK && place ) {
          const text = place.formatted_address || place.name || prediction.description;

          const location = place.geometry?.location;
          const coords = location && typeof location.lat === 'function'? {
                  lat: location.lat(),
                  lng: location.lng()
                }
              : null;

          onChange(text, coords);
        } else {
          onChange(prediction.description, null);
        }

        setSuggestions([]);
        setIsOpen(false);
        setActiveIndex(-1);
      }
    );
  }

  function handleKeyDown(event) {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectPrediction(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const styles = {
    wrapper: {
      position: 'relative',
      width: '100%'
    },
    input: {
      width: '100%',
      height: '48px',
      borderRadius: '14px',
      border: '1px solid rgba(148, 163, 184, 0.22)',
      background: '#0f172a',
      color: '#f8fafc',
      padding: '0 14px',
      outline: 'none',
      fontSize: '0.98rem',
      boxSizing: 'border-box'
    },
    dropdown: {
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: 0,
      right: 0,
      background: '#0f172a',
      border: '1px solid rgba(148, 163, 184, 0.22)',
      borderRadius: '16px',
      overflow: 'hidden',
      zIndex: 5000,
      boxShadow: '0 18px 42px rgba(0,0,0,0.35)'
    },
    item: (active) => ({
      width: '100%',
      padding: '12px 14px',
      border: 'none',
      borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
      background: active ? '#172033' : 'transparent',
      color: '#f8fafc',
      textAlign: 'left',
      cursor: 'pointer'
    }),
    mainText: {
      fontSize: '0.95rem',
      fontWeight: 700
    },
    subText: {
      fontSize: '0.82rem',
      color: '#94a3b8',
      marginTop: '3px'
    },
    hiddenDiv: {
      display: 'none'
    }
  };

  return (
    <div ref={rootRef} style={styles.wrapper}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value, null)}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={styles.input}
      />

      <div ref={placesDivRef} style={styles.hiddenDiv} />

      {isOpen && suggestions.length > 0 && (
        <div style={styles.dropdown}>
          {suggestions.map((prediction, index) => {
            const parts = prediction.description.split(',');

            return (
              <button
                key={prediction.place_id}
                type="button"
                style={styles.item(index === activeIndex)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPrediction(prediction)}
              >
                <div style={styles.mainText}>{parts[0]}</div>
                <div style={styles.subText}>
                  {parts.slice(1).join(',').trim()}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!isReady && (
        <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>
          Loading location search...
        </div>
      )}
    </div>
  );
}

export default LocationAutocompleteInput;