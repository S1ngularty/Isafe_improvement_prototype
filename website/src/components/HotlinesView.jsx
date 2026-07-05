import { useState, useEffect, useMemo } from "react";
import { fetchHotlines } from "../services/hotlines";

const CATEGORY_LABELS = {
  general: "General Emergency",
  police: "Police",
  fire: "Fire",
  medical: "Medical",
  rescue: "Rescue",
};

const CATEGORY_COLORS = {
  general: { border: "border-l-blue-600", badge: "bg-blue-100 text-blue-700", callBg: "bg-blue-50 hover:bg-blue-100 text-blue-700", ring: "focus-visible:ring-blue-500", line: "bg-blue-200" },
  police: { border: "border-l-indigo-600", badge: "bg-indigo-100 text-indigo-700", callBg: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700", ring: "focus-visible:ring-indigo-500", line: "bg-indigo-200" },
  fire: { border: "border-l-orange-600", badge: "bg-orange-100 text-orange-700", callBg: "bg-orange-50 hover:bg-orange-100 text-orange-700", ring: "focus-visible:ring-orange-500", line: "bg-orange-200" },
  medical: { border: "border-l-red-600", badge: "bg-red-100 text-red-700", callBg: "bg-red-50 hover:bg-red-100 text-red-700", ring: "focus-visible:ring-red-500", line: "bg-red-200" },
  rescue: { border: "border-l-emerald-600", badge: "bg-emerald-100 text-emerald-700", callBg: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700", ring: "focus-visible:ring-emerald-500", line: "bg-emerald-200" },
};

const CATEGORY_ICONS = {
  general: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>),
  police: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>),
  fire: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>),
  medical: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>),
  rescue: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>),
};

function formatPhone(p) {
  return p || "\u2014";
}

export default function HotlinesView() {
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchHotlines();
        if (active) setHotlines(Array.isArray(data) ? data : []);
      } catch {
        if (active) setHotlines([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    for (const h of hotlines) {
      const cat = h.category || "general";
      if (!map[cat]) map[cat] = [];
      if (h.is_active !== false) map[cat].push(h);
    }
    return map;
  }, [hotlines]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const matched = items.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          JSON.stringify(h.phone_numbers || []).toLowerCase().includes(q) ||
          (h.email || "").toLowerCase().includes(q)
      );
      if (matched.length > 0) result[cat] = matched;
    }
    return result;
  }, [grouped, search]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Emergency Hotlines</h1>
        <div className="relative w-80 max-w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hotlines..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center pt-16">
          <div className="w-7 h-7 border-[3px] border-shield-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(filtered).length === 0 ? (
        <div className="border border-gray-200 rounded-lg py-12 text-center text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <p className="text-sm font-medium">No hotlines found</p>
          <p className="text-xs mt-0.5">{search ? "Try a different search term." : "No emergency hotlines available yet."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filtered).map(([category, items]) => {
            const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-6 h-6 rounded-md ${colors.badge} flex items-center justify-center shrink-0`}>
                    {CATEGORY_ICONS[category] || CATEGORY_ICONS.general}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{CATEGORY_LABELS[category] || category}</span>
                  <span className={`h-px flex-1 ${colors.line}`} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {items.map((hotline) => (
                    <div
                      key={hotline.id}
                      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${colors.border} transition-all hover:shadow-md hover:border-gray-300 ${colors.border.replace("border-l-", "hover:border-l-")}`}
                    >
                      <button
                        onClick={() => setSelected(selected?.id === hotline.id ? null : hotline)}
                        className="w-full text-left p-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shield-400 rounded-tl-lg rounded-tr-lg"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{hotline.name}</h3>
                          <a
                            href={`tel:${(hotline.phone_numbers || [])[0]?.number || ""}`}
                            onClick={(e) => { e.stopPropagation(); if (!(hotline.phone_numbers || [])[0]?.number) e.preventDefault(); }}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${colors.callBg} ${colors.ring} ${(hotline.phone_numbers || []).length === 0 ? "opacity-40 pointer-events-none" : ""}`}
                            aria-label={`Call ${hotline.name}`}
                            title={`Call ${hotline.name}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                        </div>

                        <div className="mt-1.5 space-y-0.5">
                          {(hotline.phone_numbers || []).slice(0, 2).map((p, i) => (
                            <div key={i} className="text-xs text-gray-600 truncate">
                              {p.type ? <span className="text-gray-400 font-medium">{p.type}: </span> : null}
                              {formatPhone(p.number)}
                            </div>
                          ))}
                          {(hotline.phone_numbers || []).length > 2 && (
                            <span className="text-[10px] text-shield-600 font-semibold">
                              +{hotline.phone_numbers.length - 2} more
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`Details for ${selected.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 truncate">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500" aria-label="Close details">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
              {(selected.phone_numbers || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phone Numbers</p>
                  <div className="space-y-1.5">
                    {(selected.phone_numbers || []).map((p, i) => (
                      <a
                        key={i}
                        href={`tel:${p.number}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:bg-green-50 hover:border-green-200 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                        aria-label={`Call ${p.type || "number"}: ${p.number}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 group-hover:bg-green-200">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          {p.type && <p className="text-[11px] font-medium text-gray-500">{p.type}</p>}
                          <p className="text-sm font-semibold text-gray-900">{formatPhone(p.number)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selected.email && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email</p>
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-200">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">{selected.email}</span>
                  </a>
                </div>
              )}

              {selected.website && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Website</p>
                  <a
                    href={`https://${selected.website.replace(/^https?:\/\//, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:bg-purple-50 hover:border-purple-200 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-200">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-shield-600 truncate">{selected.website}</span>
                  </a>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button onClick={() => setSelected(null)} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
