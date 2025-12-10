` `
import { useState, useEffect, useCallback, useRef } from 'react';
import type { School, Coords } from './types';
import { distanceMiles } from "./utils/distance";
import { geocodeQuery } from './services/geoService';
import { SchoolCard } from './components/SchoolCard';
import { SchoolMap } from './components/SchoolMap';
import { SchoolProfileModal } from './components/SchoolProfileModal';

// CONFIG: Define available data sources here.
const DATA_SOURCES = [
  {
    id: "texas",
    label: "All Texas",
    url: "https://raw.githubusercontent.com/barefoottico/fadejunkie/430211070b8512c117a07136e34b087971666571/texas_barber_schools.json"
  },
];

const RADIUS_OPTIONS = [
  { value: 0, label: "Exact match" },
  { value: 10, label: "Within 10 mi" },
  { value: 25, label: "Within 25 mi" },
  { value: 50, label: "Within 50 mi" },
  { value: 100, label: "Within 100 mi" },
];

// AD CONFIGURATION
const AD_CONFIG = {
  topBanner: {
    light: "/fj-banners/fj-display-ad-light.png",
    dark: "/fj-banners/fj-display-ad-dark.png"
  },
  sideColumn: {
    light: "/babyliss-tomb45-display-ad.png",
    dark: "/babyliss-tomb45-display-ad.png"
  },
  sideSquare: {
    light: "https://placehold.co/300x250/f4f4f5/52525b?text=Square+Ad+(Light)",
    dark: "https://placehold.co/300x250/27272a/a1a1aa?text=Square+Ad+(Dark)"
  },
  bottomBanner: {
    light: "/fj-ultimate-tool-banner.png",
    dark: "/fj-ultimate-tool-banner.png"
  }
};

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fj_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  // Data State
  const [currentSourceId, setCurrentSourceId] = useState(DATA_SOURCES[0].id);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Search State
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(0);
  const [userLoc, setUserLoc] = useState<Coords | null>(null);
  const [mapCenter, setMapCenter] = useState<Coords | null>(null);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Refs for debouncing
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fj_theme', theme);
  }, [theme]);

  // 1. Data Load Effect
  useEffect(() => {
    const loadDataSource = async () => {
      setLoadingData(true);
      setFilteredSchools([]);
      setMapCenter(null);

      const sourceConfig = DATA_SOURCES.find(s => s.id === currentSourceId) || DATA_SOURCES[0];

      try {
        const res = await fetch(sourceConfig.url);
        if (!res.ok) throw new Error(`Failed to load data for ${sourceConfig.label}`);
        const data: any[] = await res.json();

        // Patch data with status
        const patchedData: School[] = data.map(s => {
          let status: "regular" | "verified" | "featured" = "regular";

          // Hard-coded rules for Verified and Featured examples
          if (s.name.includes("Texas Barber & Beauty Academy") && s.address.includes("San Antonio")) {
            status = "featured";
          } else if (s.name.includes("Deluxe Barber College") && s.address.includes("San Antonio")) {
            status = "verified";
          }

          return { ...s, status };
        });

        setAllSchools(patchedData);
        setStatusMessage(`Loaded directory for ${sourceConfig.label}`);
      } catch (err) {
        console.error(err);
        setAllSchools([]);
        setStatusMessage(`Error loading directory for ${sourceConfig.label}.`);
      } finally {
        setLoadingData(false);
      }
    };

    loadDataSource();
  }, [currentSourceId]);

  // Helper sort function
  const sortSchools = (list: School[]) => {
    return list.sort((a, b) => {
      const rank = { featured: 3, verified: 2, regular: 1 };
      const scoreA = rank[a.status];
      const scoreB = rank[b.status];

      // Primary Sort: Status
      if (scoreA !== scoreB) return scoreB - scoreA;

      // Secondary Sort: Distance (if available)
      if (typeof a._distance === 'number' && typeof b._distance === 'number') {
        return a._distance - b._distance;
      }

      // Tertiary Sort: Name
      return a.name.localeCompare(b.name);
    });
  };

  // 2. Main Filtering Logic
  const performSearch = useCallback(async (searchQuery: string, searchRadius: number, searchUserLoc: Coords | null) => {
    if (allSchools.length === 0 && !loadingData) {
      setFilteredSchools([]);
      return;
    }

    if (!searchQuery && !searchUserLoc) {
      setFilteredSchools([]);
      setMapCenter(null);
      setStatusMessage("");
      return;
    }

    const qLower = searchQuery.toLowerCase().trim();
    let center: Coords | null = searchUserLoc;
    let schools = [...allSchools];
    let isUsingGeocode = false;

    schools.forEach(s => delete s._distance);

    try {
      if (searchUserLoc) {
        const effectiveRadius = searchRadius === 0 ? 50 : searchRadius;

        const withDist = schools.map(s => {
          if (!s.coords) return s;
          const dist = distanceMiles(searchUserLoc, s.coords);
          return { ...s, _distance: dist };
        }).filter(s => s._distance !== undefined && s._distance <= effectiveRadius) as School[];

        const sorted = sortSchools(withDist);

        setFilteredSchools(sorted);
        setMapCenter(searchUserLoc);
        setStatusMessage(sorted.length === 0 ? "No schools found nearby." : `Found ${sorted.length} schools near your location.`);
        return;
      }

      if (qLower) {
        const textMatches = schools.filter(s =>
          s.name.toLowerCase().includes(qLower) ||
          s.address.toLowerCase().includes(qLower)
        );

        if (searchRadius === 0) {
          const sorted = sortSchools(textMatches);
          setFilteredSchools(sorted);
          setMapCenter(null);
          setStatusMessage(sorted.length === 0 ? "No schools match your search." : "");
          return;
        }

        const matchingSchoolsWithCoords = textMatches.filter(s => s.coords);

        if (matchingSchoolsWithCoords.length > 0) {
          const latSum = matchingSchoolsWithCoords.reduce((sum, s) => sum + (s.coords?.lat || 0), 0);
          const lngSum = matchingSchoolsWithCoords.reduce((sum, s) => sum + (s.coords?.lng || 0), 0);
          center = {
            lat: latSum / matchingSchoolsWithCoords.length,
            lng: lngSum / matchingSchoolsWithCoords.length
          };
        } else {
          setIsGeocoding(true);
          const geoResult = await geocodeQuery(searchQuery);
          setIsGeocoding(false);

          if (geoResult) {
            center = { lat: geoResult.lat, lng: geoResult.lng };
            isUsingGeocode = true;
          }
        }

        if (center) {
          const inRadius = schools.map(s => {
            if (!s.coords) return s;
            const dist = distanceMiles(center, s.coords);
            return { ...s, _distance: dist };
          }).filter(s => s._distance !== undefined && s._distance <= searchRadius) as School[];

          const sorted = sortSchools(inRadius);
          setFilteredSchools(sorted);
          setMapCenter(center);

          if (sorted.length === 0) {
            setStatusMessage(`No schools found within ${searchRadius} miles of "${searchQuery}".`);
          } else if (isUsingGeocode) {
            setStatusMessage(`Found ${sorted.length} schools within ${searchRadius} miles of "${searchQuery}".`);
          } else {
            setStatusMessage("");
          }
        } else {
          setFilteredSchools([]);
          setMapCenter(null);
          setStatusMessage(`Could not determine location for "${searchQuery}". Try a valid Zip or City.`);
        }
      }
    } catch (error) {
      console.error("Search error", error);
      setIsGeocoding(false);
      setMapCenter(null);
      setStatusMessage("An error occurred during search.");
    }
  }, [allSchools, loadingData]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (!query && !userLoc) {
      setFilteredSchools([]);
      setMapCenter(null);
      setStatusMessage("");
      return;
    }
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query, radius, userLoc);
    }, 600);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [query, radius, userLoc, performSearch]);

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setQuery("");
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGeocoding(false);
        setUserLoc({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        if (radius === 0) setRadius(25);
      },
      (error) => {
        setIsGeocoding(false);
        console.error(error);
        alert("Unable to retrieve your location. Please check browser permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleReset = () => {
    setQuery("");
    setRadius(0);
    setUserLoc(null);
    setMapCenter(null);
    setFilteredSchools([]);
    setStatusMessage("");
    setSelectedSchool(null);
  };

  return (
    <div className="min-h-screen font-sans bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div id="adTopBanner" className="w-full mb-8">
          <div className="ad-slot ad-slot--top w-full 
              bg-zinc-100 dark:bg-zinc-800 
              border border-zinc-200 dark:border-zinc-700 
              rounded-lg overflow-hidden shadow-sm">
            <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full">
              <img src={AD_CONFIG.topBanner.light} alt="Top Banner Ad" className="w-full h-auto object-contain block dark:hidden" loading="lazy" />
              <img src={AD_CONFIG.topBanner.dark} alt="Top Banner Ad" className="w-full h-auto object-contain hidden dark:block" loading="lazy" />
            </a>
          </div>
        </div>

        <div className="w-full relative flex justify-center items-center py-6 mb-2">
          <img src="/black fj logo.png" alt="FadeJunkie" className="h-20 sm:h-24 w-auto block dark:hidden" />
          <img src="/white fj logo.png" alt="FadeJunkie" className="h-20 sm:h-24 w-auto hidden dark:block" />
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="absolute right-0 p-2.5 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-all"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          <main className="flex-1 w-full min-w-0">
            <header className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Barber Schools Directory
              </h1>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 max-w-xl">
                Search the directory by name, city, or ZIP. Enable location services or specify a search radius to find schools near you.
              </p>
            </header>

            <section className="bg-white dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm backdrop-blur-sm sticky top-4 z-10">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setUserLoc(null);
                      }}
                      placeholder="Search by name, city, or ZIP..."
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:focus:ring-zinc-500 shadow-sm transition-all"
                    />
                    {isGeocoding && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLocationClick}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium transition-colors
                      ${userLoc
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
                    </svg>
                    {userLoc ? 'Locating...' : 'Near Me'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label htmlFor="dataSourceSelect" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400 whitespace-nowrap">
                        Region
                      </label>
                      <select
                        id="dataSourceSelect"
                        value={currentSourceId}
                        onChange={(e) => setCurrentSourceId(e.target.value)}
                        className="bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm py-1.5 px-3 rounded-lg border-r-[10px] border-r-transparent border-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      >
                        {DATA_SOURCES.map(source => (
                          <option key={source.id} value={source.id}>{source.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 hidden sm:block"></div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Radius
                      </span>
                      <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg">
                        <input
                          type="range"
                          min="0"
                          max={RADIUS_OPTIONS.length - 1}
                          step="1"
                          value={RADIUS_OPTIONS.findIndex(o => o.value === radius) === -1 ? 0 : RADIUS_OPTIONS.findIndex(o => o.value === radius)}
                          onChange={(e) => setRadius(RADIUS_OPTIONS[parseInt(e.target.value)].value)}
                          className="w-24 sm:w-32 h-1.5 bg-zinc-300 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-zinc-900 dark:accent-zinc-100"
                        />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[6rem]">
                          {RADIUS_OPTIONS.find(o => o.value === radius)?.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(query || userLoc || radius > 0) && (
                    <button
                      onClick={handleReset}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline underline-offset-2 transition-colors self-end sm:self-auto"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-8 mb-4">
              <SchoolMap
                schools={filteredSchools}
                center={mapCenter}
                isUserLocation={!!userLoc}
              />
            </div>

            <div className="mt-4 min-h-[1.5rem] flex items-center justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                {isGeocoding ? "Identifying location..." : statusMessage || (filteredSchools.length > 0 ? "" : "Enter a search term to begin.")}
              </span>
              {filteredSchools.length > 0 && (
                <span className="font-medium text-zinc-900 dark:text-white">
                  {filteredSchools.length} Result{filteredSchools.length !== 1 && 's'}
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredSchools.map((school) => (
                <SchoolCard
                  key={school.id}
                  school={school}
                  onSelect={setSelectedSchool}
                />
              ))}
            </div>

            {!loadingData && filteredSchools.length === 0 && !query && !userLoc && (
              <div className="mt-12 text-center py-12 px-4 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="mx-auto h-12 w-12 text-zinc-300 mb-3">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No search active</h3>
                <p className="mt-1 text-sm text-zinc-500">Start by typing a city, zip, or school name above.</p>
              </div>
            )}
          </main>

          <aside id="adSideColumn" className="w-full lg:w-80 flex-shrink-0 space-y-6 sticky top-6">
            <div className="ad-slot ad-slot--side 
                bg-zinc-100 dark:bg-zinc-800 
                border border-zinc-200 dark:border-zinc-700 
                rounded-lg overflow-hidden shadow-sm">
              <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full">
                <img src={AD_CONFIG.sideColumn.light} alt="Side Display Ad" className="w-full h-auto object-contain block dark:hidden" loading="lazy" />
                <img src={AD_CONFIG.sideColumn.dark} alt="Side Display Ad" className="w-full h-auto object-contain hidden dark:block" loading="lazy" />
              </a>
            </div>

            <div className="ad-slot ad-slot--side-2 
                        bg-zinc-100 dark:bg-zinc-800 
                        border border-zinc-200 dark:border-zinc-700 
                        rounded-lg overflow-hidden shadow-sm">
              <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full">
                <img src={AD_CONFIG.sideSquare.light} alt="Square Ad" className="w-full h-auto object-contain block dark:hidden" loading="lazy" />
                <img src={AD_CONFIG.sideSquare.dark} alt="Square Ad" className="w-full h-auto object-contain hidden dark:block" loading="lazy" />
              </a>
            </div>
          </aside>

        </div>

        <div id="adBottomBanner" className="w-full mt-12">
          <div className="ad-slot ad-slot--bottom w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm">
            <a href="#" target="_blank" rel="noopener noreferrer" className="block w-full">
              <img src={AD_CONFIG.bottomBanner.light} alt="Bottom Banner Ad" className="w-full h-auto object-contain block dark:hidden" loading="lazy" />
              <img src={AD_CONFIG.bottomBanner.dark} alt="Bottom Banner Ad" className="w-full h-auto object-contain hidden dark:block" loading="lazy" />
            </a>
          </div>
        </div>

        <footer className="mt-12 py-12 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="flex justify-center items-center">
              <img src="/black fj logo.png" alt="FadeJunkie" className="h-12 w-auto block dark:hidden opacity-80 hover:opacity-100 transition-opacity" />
              <img src="/white fj logo.png" alt="FadeJunkie" className="h-12 w-auto hidden dark:block opacity-80 hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                &copy; {new Date().getFullYear()} FadeJunkie. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

        {selectedSchool && (
          <SchoolProfileModal
            school={selectedSchool}
            onClose={() => setSelectedSchool(null)}
          />
        )}

      </div>
    </div>
  );
}
