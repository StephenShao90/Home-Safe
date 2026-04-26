import { useEffect, useRef, useState } from 'react';
import { getSafetyCells } from '../services/api.js';
import { loadGoogleMaps } from '../utils/googleMapsLoader.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t))
  ];
}

function getHeatColor(avgRating) {
  const value = Math.max(1, Math.min(10, Number(avgRating) || 1));
  const t = (value - 1) / 9;

  const red = [239, 68, 68];
  const orange = [249, 115, 22];
  const yellow = [250, 204, 21];
  const green = [34, 197, 94];

  if (t <= 0.33) {
    const [r, g, b] = lerpColor(red, orange, t / 0.33);
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (t <= 0.66) {
    const [r, g, b] = lerpColor(orange, yellow, (t - 0.33) / 0.33);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const [r, g, b] = lerpColor(yellow, green, (t - 0.66) / 0.34);
  return `rgb(${r}, ${g}, ${b})`;
}

function getBlobLayers(cell, google, map) {
  const center = {
    lat: Number(cell.center_lat),
    lng: Number(cell.center_lng)
  };

  const reportCount = Number(cell.report_count) || 0;
  const fillColor = getHeatColor(Number(cell.avg_rating));

  const baseRadius =
    reportCount >= 8 ? 180 :
    reportCount >= 5 ? 150 :
    reportCount >= 3 ? 130 :
    110;

  return [
    new google.maps.Circle({
      strokeOpacity: 0,
      fillColor,
      fillOpacity: 0.05,
      map,
      center,
      radius: baseRadius * 4.2,
      zIndex: 1
    }),
    new google.maps.Circle({
      strokeOpacity: 0,
      fillColor,
      fillOpacity: 0.08,
      map,
      center,
      radius: baseRadius * 3.4,
      zIndex: 1
    }),
    new google.maps.Circle({
      strokeOpacity: 0,
      fillColor,
      fillOpacity: 0.12,
      map,
      center,
      radius: baseRadius * 2.6,
      zIndex: 1
    }),
    new google.maps.Circle({
      strokeOpacity: 0,
      fillColor,
      fillOpacity: 0.17,
      map,
      center,
      radius: baseRadius * 1.9,
      zIndex: 1
    }),
    new google.maps.Circle({
      strokeOpacity: 0,
      fillColor,
      fillOpacity: 0.22,
      map,
      center,
      radius: baseRadius * 1.3,
      zIndex: 1
    }),
    new google.maps.Circle({
      strokeOpacity: 0,
      fillColor,
      fillOpacity: 0.28,
      map,
      center,
      radius: baseRadius * 0.9,
      zIndex: 1
    })
  ];
}

function getStepNavigationInstruction(steps, userLatLng, google) {
  if (!steps || steps.length === 0) {
    return 'Route selected.';
  }

  let closestStep = null;
  let minDistance = Infinity;

  for (const step of steps) {
    if (!step.polyline) {
      continue;
    }

    const decoded = google.maps.geometry.encoding.decodePath(step.polyline);

    for (const point of decoded) {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        userLatLng,
        point
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestStep = step;
      }
    }
  }

  if (!closestStep) {
    return 'Continue on route.';
  }

  const meters = Math.round(minDistance);
  const plainInstruction = String(closestStep.instruction || '').replace(/<[^>]+>/g, '');
  return `${meters} m • ${plainInstruction}`;
}

function getStartMarkerPosition(routeData, decodedPath, userLocation, startMode) {
  if (startMode === 'user' && userLocation) {
    return userLocation;
  }

  if (
    routeData?.origin &&
    typeof routeData.origin === 'object' &&
    typeof routeData.origin.lat === 'number' &&
    typeof routeData.origin.lng === 'number'
  ) {
    return routeData.origin;
  }

  if (decodedPath.length > 0) {
    const first = decodedPath[0];
    return {
      lat: typeof first.lat === 'function' ? first.lat() : first.lat,
      lng: typeof first.lng === 'function' ? first.lng() : first.lng
    };
  }

  return null;
}

function getEndMarkerPosition(routeData, decodedPath) {
  if (
    routeData?.destination &&
    typeof routeData.destination === 'object' &&
    typeof routeData.destination.lat === 'number' &&
    typeof routeData.destination.lng === 'number'
  ) {
    return routeData.destination;
  }

  if (decodedPath.length > 0) {
    const last = decodedPath[decodedPath.length - 1];
    return {
      lat: typeof last.lat === 'function' ? last.lat() : last.lat,
      lng: typeof last.lng === 'function' ? last.lng() : last.lng
    };
  }

  return null;
}

function getIdleBannerMessage(routeData, locationEnabled, userLocation) {
  if (routeData?.polyline) {
    if (locationEnabled && userLocation) {
      return 'Live navigation is active.';
    }

    return 'Route selected. Enable live location for turn guidance.';
  }

  if (locationEnabled && userLocation) {
    return 'Choose a route to begin navigation.';
  }

  return 'Enable live location or choose a route to begin.';
}

function clearMapObjects({
  polylineRef,
  startMarkerRef,
  endMarkerRef,
  heatCirclesRef
}) {
  if (polylineRef.current) {
    polylineRef.current.setMap(null);
    polylineRef.current = null;
  }

  if (startMarkerRef.current) {
    startMarkerRef.current.setMap(null);
    startMarkerRef.current = null;
  }

  if (endMarkerRef.current) {
    endMarkerRef.current.setMap(null);
    endMarkerRef.current = null;
  }

  heatCirclesRef.current.forEach((circle) => circle.setMap(null));
  heatCirclesRef.current = [];
}

function getRouteColor(type) {
  if (type === 'safest') return '#16a34a';
  if (type === 'balanced') return '#eab308';
  if (type === 'quickest') return '#2563eb';
  return '#16a34a';
}

function MapView({
  routeData,
  selectedRouteType,
  onUseCurrentLocation,
  startMode = 'manual'
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const heatCirclesRef = useRef([]);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const decodedPathRef = useRef([]);
  const onUseCurrentLocationRef = useRef(onUseCurrentLocation);
  const routeStepsRef = useRef(routeData?.steps || []);

  const [mapStatus, setMapStatus] = useState('loading');
  const [mapError, setMapError] = useState('');
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [navInstruction, setNavInstruction] = useState(
    'Enable live location or choose a route to begin.'
  );

  useEffect(() => {
    onUseCurrentLocationRef.current = onUseCurrentLocation;
  }, [onUseCurrentLocation]);

  useEffect(() => {
    routeStepsRef.current = routeData?.steps || [];
  }, [routeData?.steps]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setMapStatus('error');
      setMapError('Missing VITE_GOOGLE_MAPS_API_KEY');
      return;
    }

    let isMounted = true;

    async function initializeBaseMap() {
      try {
        const google = await loadGoogleMaps(apiKey);

        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapContainerRef.current, {
            center: userLocation || { lat: 43.4723, lng: -80.5449 },
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });
        }

        setMapStatus('ready');
        setMapError('');
      } catch (error) {
        console.error('Map initialization error:', error.message);
        if (!isMounted) return;
        setMapStatus('error');
        setMapError(error.message);
      }
    }

    initializeBaseMap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapStatus !== 'ready') {
      return;
    }

    let cancelled = false;

    async function renderRouteAndHeatmap() {
      try {
        const google = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

        if (cancelled || !mapRef.current) {
          return;
        }

        clearMapObjects({
          polylineRef,
          startMarkerRef,
          endMarkerRef,
          heatCirclesRef
        });

        decodedPathRef.current = [];

        if (!routeData?.polyline) {
          if (userLocation) {
            mapRef.current.setCenter(userLocation);
            mapRef.current.setZoom(15);
          }

          setNavInstruction(getIdleBannerMessage(routeData, locationEnabled, userLocation));
          return;
        }

        const decodedPath = google.maps.geometry.encoding.decodePath(routeData.polyline);
        decodedPathRef.current = decodedPath;

        polylineRef.current = new google.maps.Polyline({
          path: decodedPath,
          geodesic: true,
          strokeColor: getRouteColor(selectedRouteType),
          strokeOpacity: 1,
          strokeWeight: 6,
          zIndex: 999
        });

        polylineRef.current.setMap(mapRef.current);

        const bounds = new google.maps.LatLngBounds();
        decodedPath.forEach((point) => bounds.extend(point));

        const startMarkerPosition = getStartMarkerPosition(
          routeData,
          decodedPath,
          userLocation,
          startMode
        );
        const endMarkerPosition = getEndMarkerPosition(routeData, decodedPath);

        if (startMarkerPosition) {
          bounds.extend(startMarkerPosition);
          startMarkerRef.current = new google.maps.Marker({
            position: startMarkerPosition,
            map: mapRef.current,
            label: 'A',
            zIndex: 1000
          });
        }

        if (endMarkerPosition) {
          bounds.extend(endMarkerPosition);
          endMarkerRef.current = new google.maps.Marker({
            position: endMarkerPosition,
            map: mapRef.current,
            label: 'B',
            zIndex: 1000
          });
        }

        if (startMode === 'user' && userLocation) {
          bounds.extend(userLocation);
        }

        mapRef.current.fitBounds(bounds);

        const cellsResponse = await getSafetyCells({
          minLat: bounds.getSouthWest().lat(),
          maxLat: bounds.getNorthEast().lat(),
          minLng: bounds.getSouthWest().lng(),
          maxLng: bounds.getNorthEast().lng()
        });

        if (cancelled || !mapRef.current) {
          return;
        }

        const cells = Array.isArray(cellsResponse)
          ? cellsResponse
          : Array.isArray(cellsResponse?.cells)
          ? cellsResponse.cells
          : [];

        if (heatmapEnabled) {
          heatCirclesRef.current = cells.flatMap((cell) =>
            getBlobLayers(cell, google, mapRef.current)
          );
        }

        setNavInstruction(getIdleBannerMessage(routeData, locationEnabled, userLocation));
      } catch (error) {
        console.error('Route render error:', error.message);
      }
    }

    renderRouteAndHeatmap();

    return () => {
      cancelled = true;
    };
  }, [mapStatus, routeData, selectedRouteType, heatmapEnabled, startMode, userLocation, locationEnabled]);

  useEffect(() => {
    if (!locationEnabled) {
      setLocationError('');

      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }

      setNavInstruction(getIdleBannerMessage(routeData, false, null));
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.');
      setLocationEnabled(false);
      return;
    }

    setLocationError('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const google = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

          if (!mapRef.current) return;

          const userPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          setUserLocation((prev) => {
            if (
              prev &&
              prev.lat === userPosition.lat &&
              prev.lng === userPosition.lng
            ) {
              return prev;
            }

            return userPosition;
          });

          if (typeof onUseCurrentLocationRef.current === 'function') {
            onUseCurrentLocationRef.current(userPosition);
          }

          if (!userMarkerRef.current) {
            userMarkerRef.current = new google.maps.Marker({
              position: userPosition,
              map: mapRef.current,
              title: 'Your location',
              zIndex: 2000,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#111827',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3
              }
            });
          } else {
            userMarkerRef.current.setPosition(userPosition);
            userMarkerRef.current.setMap(mapRef.current);
          }

          if (decodedPathRef.current.length > 1) {
            const userLatLng = new google.maps.LatLng(
              userPosition.lat,
              userPosition.lng
            );

            const nextInstruction = getStepNavigationInstruction(
              routeStepsRef.current,
              userLatLng,
              google
            );

            setNavInstruction(nextInstruction);
          } else {
            setNavInstruction(getIdleBannerMessage(routeData, true, userPosition));
          }
        } catch {
          setLocationError('Failed to update live location.');
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location information is unavailable.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out.');
        } else {
          setLocationError('Failed to access location.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 100000
      }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [locationEnabled, routeData]);

  const styles = {
    root: {
      marginTop: '26px'
    },
    controls: {
      display: 'flex',
      gap: '12px',
      marginBottom: '14px',
      flexWrap: 'wrap'
    },
    toggleButton: (activeColor, isActive) => ({
      height: '44px',
      padding: '0 16px',
      borderRadius: '14px',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      background: isActive ? activeColor : '#1f2937',
      color: 'white',
      cursor: 'pointer',
      fontWeight: '700'
    }),
    layout: {
      display: 'grid',
      gridTemplateColumns: '320px minmax(0, 1fr)',
      gap: '16px',
      alignItems: 'stretch'
    },
    directionsPanel: {
      minHeight: '450px',
      maxHeight: '450px',
      overflowY: 'auto',
      background: '#0f172a',
      color: 'white',
      padding: '1rem',
      borderRadius: '18px',
      boxSizing: 'border-box',
      border: '1px solid rgba(148, 163, 184, 0.14)'
    },
    directionsTitle: {
      marginTop: 0,
      marginBottom: '0.75rem',
      fontSize: '1.15rem'
    },
    instructionBanner: {
      marginBottom: '1rem',
      padding: '0.9rem',
      background: '#172033',
      borderRadius: '14px',
      fontSize: '0.94rem',
      lineHeight: 1.45,
      border: '1px solid rgba(148, 163, 184, 0.12)'
    },
    errorBanner: {
      marginBottom: '1rem',
      padding: '0.75rem',
      background: 'rgba(220, 38, 38, 0.15)',
      border: '1px solid rgba(248, 113, 113, 0.35)',
      color: '#fecaca',
      borderRadius: '12px',
      fontSize: '0.9rem'
    },
    stepCard: {
      marginBottom: '0.75rem',
      padding: '0.85rem',
      background: '#172033',
      borderRadius: '14px',
      border: '1px solid rgba(148, 163, 184, 0.08)'
    },
    mapWrap: {
      minWidth: '320px',
      height: '450px',
      border: '1px solid rgba(148, 163, 184, 0.18)',
      borderRadius: '18px',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#ffffff'
    },
    footnote: {
      marginTop: '12px',
      fontSize: '0.9rem',
      color: '#94a3b8',
      lineHeight: 1.5
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '1rem',
      backgroundColor: 'rgba(255,255,255,0.92)',
      color: '#111827',
      fontFamily: 'Arial, sans-serif'
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.controls}>
        <button
          onClick={() => setHeatmapEnabled((prev) => !prev)}
          style={styles.toggleButton('#2563eb', heatmapEnabled)}
          type="button"
        >
          {heatmapEnabled ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>

        <button
          onClick={() => setLocationEnabled((prev) => !prev)}
          style={styles.toggleButton('#10b981', locationEnabled)}
          type="button"
        >
          {locationEnabled ? 'Stop Live Location' : 'Enable Live Location'}
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.directionsPanel}>
          <h3 style={styles.directionsTitle}>Directions</h3>

          <div style={styles.instructionBanner}>{navInstruction}</div>

          {locationError && <div style={styles.errorBanner}>{locationError}</div>}

          {routeData?.steps?.length > 0 ? (
            routeData.steps.map((step, index) => (
              <div key={index} style={styles.stepCard}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    opacity: 0.7,
                    marginBottom: '0.35rem'
                  }}
                >
                  Step {index + 1}
                </div>
                <div
                  dangerouslySetInnerHTML={{ __html: step.instruction }}
                  style={{ fontSize: '0.95rem', lineHeight: 1.4 }}
                />
              </div>
            ))
          ) : (
            <p style={{ opacity: 0.7, margin: 0 }}>
              Select a route to see directions.
            </p>
          )}
        </div>

        <div style={styles.mapWrap}>
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%'
            }}
          />

          {mapStatus === 'loading' && (
            <div style={styles.overlay}>Loading map...</div>
          )}

          {mapStatus === 'error' && (
            <div style={styles.overlay}>
              <div>
                <p><strong>Map failed to load.</strong></p>
                <p>{mapError}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.footnote}>
        <div>
          Walking routes may occasionally miss some pedestrian paths or sidewalks.
        </div>
        <div>
          Heat zones: green = safer, yellow = neutral, orange/red = lower-rated, white = no data.
        </div>
      </div>
    </div>
  );
}

export default MapView;