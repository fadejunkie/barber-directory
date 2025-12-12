` `
import { useState, useEffect, useCallback, useRef } from 'react';
import type { School, Coords, Suggestion } from './types';
import { distanceMiles } from "./utils/distance";
import { calculateGeographicSpread } from "./utils/geoUtils";
import { geocodeQuery, getPlaceSuggestions } from './services/geoService';
import { SchoolCard } from './components/SchoolCard';
import { SchoolMap } from './components/SchoolMap';
import { SchoolProfileModal } from './components/SchoolProfileModal';
import { Autocomplete } from './components/Autocomplete';

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
    light: "/fj-banners/top-banner-light.png",
    dark: "/fj-banners/top-banner-dark.png"
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
  const [searchOrigin, setSearchOrigin] = useState<Coords | null>(null); // Persist search location (e.g. "Dripping Springs")

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Theme State
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
  const performSearch = useCallback(async (searchQuery: string, searchRadius: number, searchUserLoc: Coords | null, allowGeocode: boolean = false) => {
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
    let center: Coords | null = null;
    let schools = [...allSchools];
    let isUsingGeocode = false;
    let newOrigin: Coords | null = null;

    schools.forEach(s => delete s._distance);

    try {
      // ---------------------------------------------------------
      // PRIORITY 1: TEXT QUERY (Explicit Location Check)
      // ---------------------------------------------------------
      if (qLower) {
        // 1a. Find matches in our database
        const textMatches = schools.filter(s =>
          s.name.toLowerCase().includes(qLower) ||
          s.address.toLowerCase().includes(qLower) ||
          (s.programs && s.programs.some(p => p.toLowerCase().includes(qLower)))
        );

        // 1a. EXACT NAME/TEXT MATCH (Radius 0)
        // If radius is 0, we simply show the text matches, regardless of clustering.
        // This ensures "Aus" matching "Austin" works without getting confused by location logic.
        if (searchRadius === 0) {
          const sorted = sortSchools(textMatches);
          setFilteredSchools(sorted);
          setMapCenter(null);
          setStatusMessage(sorted.length === 0 ? "No schools match your search." : "");
          return;
        }

        // 1b. Check Geographical Spread of matches
        const spread = calculateGeographicSpread(textMatches.filter(s => s.coords));
        const SPREAD_THRESHOLD = 40; // miles
        const isScattered = spread > SPREAD_THRESHOLD;
        const isClustered = textMatches.length > 0 && !isScattered;

        // SCENARIO A: CLUSTERED MATCHES (e.g. "Austin")
        // Treat as a Location Anchor -> Overrides "User Location"
        if (isClustered) {
          // Radius mode - Calculate Center
          const matchingSchoolsWithCoords = textMatches.filter(s => s.coords);
          const latSum = matchingSchoolsWithCoords.reduce((sum, s) => sum + (s.coords?.lat || 0), 0);
          const lngSum = matchingSchoolsWithCoords.reduce((sum, s) => sum + (s.coords?.lng || 0), 0);
          center = {
            lat: latSum / matchingSchoolsWithCoords.length,
            lng: lngSum / matchingSchoolsWithCoords.length
          };
          newOrigin = center;
          setStatusMessage(`Found ${textMatches.length} schools near "${searchQuery}".`);
        }

        // SCENARIO B: SCATTERED MATCHES (e.g. "Barber")
        // Treat as a Generic Term -> Use User Location if available, else Global
        else if (isScattered) {
          // If we have a user location (Near Me), filter by that
          if (searchUserLoc) {
            center = searchUserLoc; // Will apply radius below
          } else if (searchOrigin) {
            center = searchOrigin; // Fallback to previous origin
          } else {
            // Global Search
            const sorted = sortSchools(textMatches);
            setFilteredSchools(sorted);
            setMapCenter(null);
            setStatusMessage(`Found ${sorted.length} schools matching "${searchQuery}".`);
            return;
          }
        }

        // SCENARIO C: NO MATCHES REQUIRING GEOCODE (e.g. "Dripping Springs")
        // Only trigger if allowGeocode is true (User pressed Enter)
        else if (textMatches.length === 0 && allowGeocode) {
          setIsGeocoding(true);
          const geoResult = await geocodeQuery(searchQuery);
          setIsGeocoding(false);

          if (geoResult) {
            console.log("Geocode Success:", geoResult);
            center = { lat: geoResult.lat, lng: geoResult.lng };
            isUsingGeocode = true;
            newOrigin = center;
          } else {
            setStatusMessage(`Could not find location for "${searchQuery}".`);
            setFilteredSchools([]);
            return;
          }
        }
      }

      // ---------------------------------------------------------
      // PRIORITY 2: USER LOCATION (Fallback if no Text Location)
      // ---------------------------------------------------------
      if (!center) {
        if (searchOrigin) {
          center = searchOrigin;
        } else if (searchUserLoc) {
          center = searchUserLoc;
        }
      }

      // Update Search Origin if we found a new explicit one
      if (newOrigin) {
        setSearchOrigin(newOrigin);
      }

      // ---------------------------------------------------------
      // EXECUTE RADIUS FILTER (If we have a Center)
      // ---------------------------------------------------------
      if (center) {
        // Apply Radius logic
        const effectiveRadius = searchRadius === 0 ? 50 : searchRadius; // Default fallback if 0 but we have a center? Or strict? 
        // Logic correction: If radius is 0, we can't really do a radius search unless we strictly show nearest.
        // Let's assume if Radius is 0 and we have a Center (from Near Me or Geocode), we show closest.
        const r = effectiveRadius;

        const inRadius = schools.map(s => {
          if (!s.coords) return s;
          const dist = distanceMiles(center, s.coords);
          return { ...s, _distance: dist };
        }).filter(s => s._distance !== undefined && s._distance <= r) as School[];

        // Apply Text Filter if not Geocoding (and not using pure location search)
        // Logic: If isUsingGeocode is true, we found location match for the query, so implies query IS location.
        // If we found a NEW origin (Cluster or Geocode), it's a location search.
        const shouldTextFilter = qLower && !isUsingGeocode && !newOrigin;

        // Heuristic fallback: If we are using searchOrigin (radius update) and query matches the origin (e.g. "Dripping Springs"), 
        // we shouldn't filter by text "Dripping Springs". But detecting that is hard without saving the "Origin Query".
        // For now, if "Scattered" logic used searchOrigin, we DO filter (e.g. "Barber" + Origin). 
        // If "Clustered" generated the origin, textMatches were already found, so newOrigin is true? No wait. 
        // If Clustered, we set newOrigin. So shouldTextFilter is false. That means we show ALL schools in radius.
        // BUT wait: If I search "Austin", I want "Austin Barber College". I don't want "San Antonio Barber" (filtered by Radius).
        // But do I want ANY school in Austin radius? "Austin" matches schools.
        // If I strictly use location search, I might show schools that don't match "Austin"?
        // Actually, if "Austin" is the query, and I do a Radius search around Austin, 
        // I PROBABLY want to show everything in that radius? Or only things matching "Austin"?
        // The user intent for "Austin" is ambiguous. Usually means "In Austin".
        // So showing all around Austin is fine.

        // HOWEVER: If I search "Barber" (Scattered), I want only "Barber" schools.
        // newOrigin is null. shouldTextFilter is true. Correct.

        const finalResults = shouldTextFilter
          ? inRadius.filter(s =>
            s.name.toLowerCase().includes(qLower) ||
            s.address.toLowerCase().includes(qLower) ||
            (s.programs && s.programs.some(p => p.toLowerCase().includes(qLower)))
          )
          : inRadius;

        const sorted = sortSchools(finalResults);
        setFilteredSchools(sorted);
        setMapCenter(center);

        if (isUsingGeocode) {
          setStatusMessage(`Found ${sorted.length} schools within ${r} miles of "${searchQuery}".`);
        } else if (searchUserLoc && center === searchUserLoc) {
          setStatusMessage(sorted.length === 0 ? "No schools found nearby." : `Found ${sorted.length} schools near your location.`);
        } else {
          // Clustered
          // Message already set above for Clustered, but might need update if filter happened
        }
        return;
      }

      // If we got here: No Text matches, No Geocode, No User Location
      if (qLower && !isUsingGeocode) {
        const textMatches = schools.filter(s =>
          s.name.toLowerCase().includes(qLower) ||
          s.address.toLowerCase().includes(qLower) ||
          (s.programs && s.programs.some(p => p.toLowerCase().includes(qLower)))
        );
        const sorted = sortSchools(textMatches);
        setFilteredSchools(sorted);
        setMapCenter(null);
        setStatusMessage(sorted.length === 0 ? "No schools match your search." : "");
      }

    } catch (error) {
      console.error("Search error", error);
      setIsGeocoding(false);
      setMapCenter(null);
      setStatusMessage("An error occurred during search.");
    }
  }, [allSchools, loadingData, searchOrigin]);

  useEffect(() => {
    // Immediate search for better UX (No Geocoding on typing)
    performSearch(query, radius, userLoc, false);
  }, [query, radius, userLoc, performSearch]);

  useEffect(() => {
    // Debounce suggestion fetching
    const timer = setTimeout(async () => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);

      // 1. Local Matches (Schools)
      const schoolMatches = allSchools.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 3).map(s => ({
        id: `school-${s.id}`,
        type: 'school' as const,
        label: s.name,
        subLabel: s.address,
        data: s
      }));

      // 2. Local Matches (Unique Cities)
      const cities = new Set<string>();
      const cityMatches: Suggestion[] = [];

      allSchools.forEach(s => {
        // Extract city from address... rough heuristic
        // Address format: "123 St, City, TX 78704"
        const parts = s.address.split(',');
        if (parts.length >= 2) {
          const city = parts[parts.length - 2].trim();
          if (city.toLowerCase().includes(query.toLowerCase()) && !cities.has(city)) {
            cities.add(city);
            cityMatches.push({
              id: `city-local-${city}`,
              type: 'city' as const,
              label: `${city}, TX`, // Assuming Texas for local usage
              data: { lat: 0, lng: 0 } // No coords needed for text search, or we could aggregate? 
              // Actually, for "City" selection, we want to perform a Location Search.
            });
          }
        }
      });
      const topCities = cityMatches.slice(0, 2);

      // 3. Remote Matches (Geo API)
      const remoteMatches = await getPlaceSuggestions(query);
      const remoteSuggestions = remoteMatches.map((r, i) => ({
        id: `geo-${i}`,
        type: 'location' as const,
        label: r.display_name,
        data: r
      }));

      // Merge & Deduplicate
      // Prefer Local Schools > Top Local Cities > Remote Locations
      // We might want to deduplicate Remote Locations against Local Cities if they are the same

      setSuggestions([...schoolMatches, ...topCities, ...remoteSuggestions]);
      setLoadingSuggestions(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, allSchools]);

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    if (suggestion.type === 'school') {
      const school = suggestion.data as School;
      setQuery(school.name);
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSchool(school);
      setMapCenter(school.coords);
    } else {
      // City or Location
      setQuery(suggestion.label);
      setSuggestions([]);
      setShowSuggestions(false);

      if (suggestion.type === 'location') {
        performSearch(suggestion.label, radius, userLoc, true);
      } else {
        performSearch(suggestion.label, radius, userLoc, true);
      }
    }
  };

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
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-gray-50 text-zinc-900'}`}>

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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* LEFT COLUMN: School List */}
          <div className="w-full lg:w-1/2 space-y-6">

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
                        setSearchOrigin(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setShowSuggestions(false);
                          performSearch(query, radius, userLoc, true);
                        }
                      }}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="Search by name, city, or ZIP..."
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:focus:ring-zinc-500 shadow-sm transition-all"
                    />
                    {isGeocoding && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                      </div>
                    )}

                    {showSuggestions && (
                      <Autocomplete
                        suggestions={suggestions}
                        isLoading={loadingSuggestions}
                        onSelect={handleSuggestionSelect}
                      />
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
              <div className="bg-red-100 p-2 text-xs font-mono mb-2 text-red-800">
                DEBUG: MapCenter = {mapCenter ? `${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}` : "NULL"}
              </div>
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
                  searchQuery={query}
                />
              ))}
            </div>

            {!loadingData && filteredSchools.length === 0 && (query || userLoc) ? (
              <div className="mt-12 text-center py-12 px-4 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="mx-auto h-12 w-12 text-zinc-300 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No schools found</h3>
                <p className="mt-1 text-sm text-zinc-500">We couldn't find any matches. Try a different search term.</p>
                <button
                  onClick={handleReset}
                  className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              !loadingData && filteredSchools.length === 0 && !query && !userLoc && (
                <div className="mt-12 text-center py-12 px-4 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="mx-auto h-12 w-12 text-zinc-300 mb-3">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No search active</h3>
                  <p className="mt-1 text-sm text-zinc-500">Start by typing a city, zip, or school name above.</p>
                </div>
              )
            )}
          </div>

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
      </main>

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
  );
}
