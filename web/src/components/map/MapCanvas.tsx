'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '@/store/map-store';
import { HazardMarker } from './HazardMarker';
import { createPortal } from 'react-dom';
import { Search, MapPin, Navigation, Undo2, RotateCcw, X, Loader2, Compass } from 'lucide-react';

interface MapCanvasProps {
  theme?: 'dark' | 'light';
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  distanceKm?: number;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ theme = 'dark' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const crosshairMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userGpsMarkerRef = useRef<maplibregl.Marker | null>(null);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const hazardMarkersRef = useRef<{ id: string; marker: maplibregl.Marker; container: HTMLDivElement }[]>([]);

  const {
    waypoints,
    activeRoute,
    hazards,
    hoveredDistance,
    isRoundTrip,
    flyToLocation,
    userLocation,
    setUserLocation,
    addWaypoint,
    undoWaypoint,
    clearWaypoints,
    setWaypoints,
  } = useMapStore();

  const [activeHazardOpenId, setActiveHazardOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const routeLineColor = isDark ? '#ccff00' : '#10b981';

  // CARTO API key support
  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || '';

  const getMapStyle = (dark: boolean): string | maplibregl.StyleSpecification => {
    if (cartoApiKey) {
      return dark
        ? `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=${cartoApiKey}`
        : `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json?key=${cartoApiKey}`;
    }

    return dark
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/positron';
  };

  const addRouteLayers = (map: maplibregl.Map) => {
    if (map.getSource('route-source')) return;

    map.addSource('route-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: activeRoute ? [activeRoute as any] : [],
      },
    });

    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route-source',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': routeLineColor,
        'line-width': 10,
        'line-opacity': isDark ? 0.35 : 0.25,
        'line-blur': 6,
      },
    });

    map.addLayer({
      id: 'route-core',
      type: 'line',
      source: 'route-source',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': routeLineColor,
        'line-width': 4.5,
        'line-opacity': 0.95,
      },
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = waypoints.length > 0 ? [waypoints[0][1], waypoints[0][0]] : [31.0125, -29.8245];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(isDark),
      center: initialCenter as [number, number],
      zoom: 14.2,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      addRouteLayers(map);
    });

    map.on('style.load', () => {
      addRouteLayers(map);
    });

    map.on('click', (e) => {
      setActiveHazardOpenId(null);
      setShowSearchResults(false);
      const clicked: [number, number] = [e.lngLat.lat, e.lngLat.lng];
      const state = useMapStore.getState();
      if (state.waypoints.length <= 1 && state.isRoundTrip) {
        state.setUserLocation(clicked, 'Selected Map Location');
      } else {
        state.addWaypoint(clicked);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(getMapStyle(isDark));
  }, [isDark]);

  // Sync Fly To Location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToLocation) return;
    map.flyTo({
      center: flyToLocation,
      zoom: 15.5,
      essential: true,
    });
  }, [flyToLocation]);

  // Sync Active Route GeoJSON Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('route-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      if (activeRoute && (waypoints.length >= 2 || (isRoundTrip && waypoints.length >= 1))) {
        source.setData({
          type: 'FeatureCollection',
          features: [activeRoute as any],
        });

        const coords = activeRoute.geometry.coordinates;
        if (coords && coords.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          coords.forEach((coord: any) => bounds.extend(coord as [number, number]));
          map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
        }
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, [activeRoute, waypoints, isRoundTrip]);

  // Sync Waypoint Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    waypoints.forEach(([lat, lng], idx) => {
      const el = document.createElement('div');
      const isStart = idx === 0;
      const isEnd = idx === waypoints.length - 1 && waypoints.length > 1;

      el.className = `flex items-center justify-center w-7 h-7 rounded-full shadow-xl cursor-pointer transform -translate-x-1/2 -translate-y-1/2 border-2 border-white transition-all hover:scale-125 ${
        isStart
          ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
          : isEnd
          ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
          : 'bg-[#ccff00] text-black font-extrabold ring-4 ring-[#ccff00]/30'
      }`;

      el.innerHTML = `<span class="text-[11px] font-bold leading-none">${
        isStart ? 'S' : isEnd ? 'F' : idx
      }</span>`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      waypointMarkersRef.current.push(marker);
    });
  }, [waypoints]);

  // Sync Hazard Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    hazardMarkersRef.current.forEach((h) => h.marker.remove());
    hazardMarkersRef.current = [];

    hazards.forEach((hazard) => {
      const container = document.createElement('div');
      const marker = new maplibregl.Marker({ element: container })
        .setLngLat([hazard.coord[1], hazard.coord[0]])
        .addTo(map);

      hazardMarkersRef.current.push({
        id: hazard.id,
        marker,
        container,
      });
    });
  }, [hazards]);

  // Sync Telemetry Scrubber Crosshair Indicator on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || hoveredDistance === null || !activeRoute) {
      if (crosshairMarkerRef.current) {
        crosshairMarkerRef.current.remove();
        crosshairMarkerRef.current = null;
      }
      return;
    }

    const coords = activeRoute.geometry.coordinates;
    if (!coords || coords.length === 0) return;

    const totalDistance = (activeRoute.properties as any)?.distanceKm || 1;
    const progress = Math.min(1.0, Math.max(0.0, hoveredDistance / totalDistance));
    const targetIdx = Math.min(coords.length - 1, Math.floor(progress * (coords.length - 1)));
    const targetCoord = coords[targetIdx];

    if (!crosshairMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full border-2 border-white bg-dark-accent shadow-neon-glow flex items-center justify-center animate-bounce';
      el.innerHTML = '<div class="w-2 h-2 rounded-full bg-black"></div>';

      crosshairMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(targetCoord as [number, number])
        .addTo(map);
    } else {
      crosshairMarkerRef.current.setLngLat(targetCoord as [number, number]);
    }
  }, [hoveredDistance, activeRoute]);

  // Proximity distance helper (haversine)
  const haversineDistKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Search places via OpenStreetMap Nominatim with strict Proximity Biasing
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // Reference coordinates for proximity: user location, or start waypoint, or map center
      let refLat = -1.282;
      let refLon = 36.82;
      if (userLocation) {
        refLat = userLocation[0];
        refLon = userLocation[1];
      } else if (waypoints.length > 0) {
        refLat = waypoints[0][0];
        refLon = waypoints[0][1];
      } else if (mapRef.current) {
        const c = mapRef.current.getCenter();
        refLat = c.lat;
        refLon = c.lng;
      }

      // Viewbox bounding box (~100km around user) to bias search towards closest locations
      const minLon = (refLon - 1.2).toFixed(4);
      const maxLon = (refLon + 1.2).toFixed(4);
      const minLat = (refLat - 1.2).toFixed(4);
      const maxLat = (refLat + 1.2).toFixed(4);

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchQuery
      )}&format=json&limit=8&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=0`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'SafeStride-Web/1.0' },
      });
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        // Calculate haversine distance and sort strictly by proximity
        const withDist = data.map((item) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const d = haversineDistKm(refLat, refLon, lat, lon);
          return { ...item, distanceKm: parseFloat(d.toFixed(1)) };
        });
        withDist.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
        setSearchResults(withDist);
      }
    } catch (err) {
      console.error('Geocoding search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Fly to location and optionally set as Start
  const selectLocation = (result: SearchResult, setAsStart = true) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const map = mapRef.current;

    setShowSearchResults(false);
    setSearchQuery(result.display_name.split(',')[0]);

    if (map) {
      map.flyTo({
        center: [lon, lat],
        zoom: 15,
        essential: true,
      });
    }

    if (setAsStart) {
      setUserLocation([lat, lon], result.display_name.split(',')[0]);
    }
  };

  // Browser GPS Locate Me
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const map = mapRef.current;

        if (map) {
          map.flyTo({
            center: [lon, lat],
            zoom: 15.5,
            essential: true,
          });

          // Show GPS pulse marker
          if (userGpsMarkerRef.current) {
            userGpsMarkerRef.current.remove();
          }
          const el = document.createElement('div');
          el.className = 'w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse';
          userGpsMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lon, lat])
            .addTo(map);
        }

        // Set as User Location and Start point
        setUserLocation([lat, lon], 'My GPS Location');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Could not retrieve your location. Please check your browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex-1 overflow-hidden select-none bg-dark-mapBase">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Bar: Location Search & Waypoints Controls */}
      <div className="absolute top-4 left-4 right-16 z-10 flex flex-col sm:flex-row gap-2 max-w-xl">
        {/* Search Bar */}
        <div className="relative flex-1">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
              placeholder="Search places, streets, or cities..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-ui bg-dark-surfaceSolid/95 backdrop-blur-md border border-dark-border text-dark-metricText placeholder-dark-labelText shadow-2xl focus:outline-none focus:border-dark-accent focus:ring-1 focus:ring-dark-accent transition-all"
            />
            <Search className="w-4 h-4 text-dark-labelText absolute left-3 pointer-events-none" />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-dark-accent absolute right-3 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-2.5 p-0.5 text-dark-labelText hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </form>

          {/* Autocomplete Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 py-1 rounded-xl bg-dark-surfaceSolid/95 backdrop-blur-lg border border-dark-border shadow-2xl max-h-60 overflow-y-auto z-50">
              {searchResults.map((item) => (
                <div
                  key={item.place_id}
                  className="px-3 py-2 hover:bg-dark-accent/10 border-b border-zinc-800/50 last:border-0 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  onClick={() => selectLocation(item, true)}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <MapPin className="w-3.5 h-3.5 text-dark-accent shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-dark-metricText font-ui truncate">
                        {item.display_name}
                      </span>
                      {typeof item.distanceKm === 'number' && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {item.distanceKm < 1
                            ? `${Math.round(item.distanceKm * 1000)}m away`
                            : `${item.distanceKm} km away`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-dark-accent bg-dark-accent/15 px-2 py-0.5 rounded shrink-0">
                    Set Start
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons: Locate Me & Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Locate my position (GPS)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-ui font-medium bg-dark-surfaceSolid/95 backdrop-blur-md border border-dark-border text-dark-metricText hover:text-white hover:border-dark-accent shadow-lg transition-all cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 text-dark-accent animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-dark-accent" />
            )}
            <span className="hidden sm:inline">My Location</span>
          </button>

          {waypoints.length > 0 && (
            <>
              <button
                type="button"
                onClick={undoWaypoint}
                title="Undo last waypoint"
                className="p-2 rounded-xl text-xs bg-dark-surfaceSolid/95 backdrop-blur-md border border-dark-border text-dark-labelText hover:text-white hover:border-dark-border/80 shadow-lg transition-all cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearWaypoints}
                title="Clear all waypoints & start fresh"
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-ui bg-dark-surfaceSolid/95 backdrop-blur-md border border-dark-border text-rose-400 hover:text-rose-300 hover:border-rose-500/40 shadow-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floating Status & Instruction Banner */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="px-3.5 py-1.5 rounded-full bg-dark-surfaceSolid/90 backdrop-blur-glass border border-dark-border/60 text-xs font-ui text-dark-metricText shadow-lg flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${waypoints.length >= 2 ? 'bg-[#ccff00]' : 'bg-emerald-400 animate-pulse'}`} />
          <span>
            {waypoints.length === 0
              ? 'Click anywhere on the map to set Start (S)'
              : waypoints.length === 1
              ? 'Click to set Finish (F) & calculate route'
              : `${waypoints.length} waypoints • Click to add intermediate stops`}
          </span>
        </div>
      </div>

      {/* Render Hazard Marker Portals */}
      {hazards.map((h) => {
        const item = hazardMarkersRef.current.find((m) => m.id === h.id);
        if (!item) return null;
        return createPortal(
          <HazardMarker
            key={h.id}
            hazard={h}
            isOpen={activeHazardOpenId === h.id}
            onToggle={() =>
              setActiveHazardOpenId((prev) => (prev === h.id ? null : h.id))
            }
            onClose={() => setActiveHazardOpenId(null)}
          />,
          item.container
        );
      })}
    </div>
  );
};
