import { useState, useEffect, useRef, useCallback } from "react";
import { searchAddress } from "../services/geocode";

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AddressSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debouncing, setDebouncing] = useState(false);
  const [error, setError] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchResults = useCallback(async (q) => {
    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setError("");
    setOpen(true);
    try {
      const data = await searchAddress(q);
      setResults(data);
      setActiveIdx(-1);
    } catch {
      setError("Search unavailable");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setDebouncing(false);
      clearTimeout(debounceRef.current);
      setResults([]);
      setOpen(false);
      return;
    }
    setDebouncing(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncing(false);
      fetchResults(query);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchResults]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(item) {
    onSelect({ lat: item.lat, lng: item.lng });
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const isActive = loading || debouncing || error || results.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm z-[2000]">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? (
            <Spinner />
          ) : debouncing ? (
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (isActive) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search address in Philippines..."
          className="w-full pl-9 pr-8 py-2.5 bg-white/95 backdrop-blur rounded-full border border-gray-200 shadow-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-shield-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-56 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400">
              <Spinner />
              Searching...
            </div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-red-500">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              <p className="font-medium">No results found</p>
              <p className="text-xs mt-0.5">Try a different search term</p>
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  i === activeIdx ? "bg-shield-50 text-shield-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <p className="font-medium truncate leading-tight">{item.display_name.split(",")[0]}</p>
                <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{item.display_name}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
