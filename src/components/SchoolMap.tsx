import React, { useEffect, useRef } from 'react';
import type { School, Coords } from '../types';

// Declare Leaflet global
declare const L: any;

interface SchoolMapProps {
  schools: School[];
  center: Coords | null;
  isUserLocation: boolean;
}

export const SchoolMap: React.FC<SchoolMapProps> = ({ schools, center, isUserLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const centerMarkerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      // Default view roughly centered on Texas
      // Initialize with minimal controls (Zoom is kept by default)
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true, // Required for tile attribution
        scrollWheelZoom: true,
        dragging: true
      }).setView([31.9686, -99.9018], 6);
      
      // Use CartoDB Positron for a clean, minimal, grayscale street map style.
      // This removes terrain shading, satellite imagery, and loud colors.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing school markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear center marker
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    // Add Center Marker if present
    if (center) {
      const color = isUserLocation ? '#10b981' : '#3b82f6'; // Emerald for user, Blue for search
      
      const icon = L.divIcon({
        className: 'custom-center-marker',
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      centerMarkerRef.current = L.marker([center.lat, center.lng], { icon })
        .addTo(map)
        .bindPopup(isUserLocation ? 'Your Location' : 'Search Center');
      
      bounds.extend([center.lat, center.lng]);
      hasPoints = true;
    }

    // Add School Markers
    schools.forEach((school) => {
      if (school.coords) {
        // Simple default marker, or custom if preferred. Using default for now.
        const marker = L.marker([school.coords.lat, school.coords.lng])
          .addTo(map)
          .bindPopup(`
            <div class="font-sans text-sm min-w-[150px]">
              <div class="font-bold text-zinc-900">${school.name}</div>
              <div class="text-xs mt-1 text-zinc-600">${school.address}</div>
              ${school._distance ? `<div class="mt-2 text-emerald-600 font-semibold text-xs">${school._distance.toFixed(1)} miles away</div>` : ''}
            </div>
          `);
        
        markersRef.current.push(marker);
        bounds.extend([school.coords.lat, school.coords.lng]);
        hasPoints = true;
      }
    });

    // Fit bounds
    if (hasPoints) {
      // If only one point (e.g. just center or just 1 school), fitBounds might zoom in too far.
      // maxZoom handles that.
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else {
      // Default view if no points
      map.setView([31.9686, -99.9018], 6);
    }

    // Fix for map not rendering correctly if container size changes (hidden/shown)
    map.invalidateSize();

  }, [schools, center, isUserLocation]);

  return (
    <div className="w-full h-64 sm:h-96 rounded-2xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700 z-0 relative bg-zinc-100 dark:bg-zinc-800">
      <div ref={mapContainerRef} className="w-full h-full" id="schoolsMap" />
    </div>
  );
};