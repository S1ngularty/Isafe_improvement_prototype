import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { getFamilyMembersPaginated } from "../services/family";

const CACHE_KEY = "cityshield_emergency_contacts";
const CACHE_TTL = 24 * 60 * 60 * 1000;

function formatPhone(p) {
  if (!p || p.length < 12) return p;
  return `+63 ${p.slice(3, 6)} ${p.slice(6, 10)} ${p.slice(10, 14)}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    if (Date.now() - time > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, time: Date.now() })); } catch {}
}

export default function EmergencyContactsPanel({ family, members, profile, compact }) {
  const { session } = useAuth();
  const [offline, setOffline] = useState(false);
  const [cachedMembers, setCachedMembers] = useState(null);

  const [paginatedMembers, setPaginatedMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const sentinelRef = useRef(null);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const usePagination = !compact && !members;

  useEffect(() => {
    if (usePagination) return;
    if (members && members.length > 0) {
      setCache(members);
      setCachedMembers(null);
    } else {
      const c = getCached();
      if (c && c.length > 0) {
        setCachedMembers(c);
        if (!members || members.length === 0) setOffline(true);
      }
    }
  }, [members, usePagination]);

  useEffect(() => {
    if (!usePagination || !family) return;
    setInitialLoading(true);
    pageRef.current = 0;
    getFamilyMembersPaginated(10, 0)
      .then((result) => {
        setPaginatedMembers(result.members);
        setTotal(result.total);
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [family?.id, usePagination]);

  const hasMore = paginatedMembers.length < total;

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextOffset = pageRef.current + 10;
    pageRef.current = nextOffset;
    getFamilyMembersPaginated(10, nextOffset)
      .then((result) => {
        setPaginatedMembers((prev) => [...prev, ...result.members]);
        setTotal(result.total);
      })
      .catch(() => {})
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    if (!usePagination || !sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, usePagination]);

  const displayMembers = usePagination ? paginatedMembers : ((members && members.length > 0) ? members : (cachedMembers || []));
  const phone = profile?.phone_number || "";
  const hasPhone = phone.length >= 12;

  if (!family) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <p className="text-sm font-semibold text-gray-700 mb-1">No Family Yet</p>
        <p className="text-xs text-gray-400 mb-4">Create or join a family to see emergency contacts</p>
        <Link to="/dashboard" className="btn-primary py-2 px-4 text-sm inline-block">Go to Family Setup</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {offline && (
        <div className="bg-yellow-100 text-yellow-800 text-xs px-4 py-2 rounded-lg mb-3">
          Offline — showing last saved contacts
        </div>
      )}

      {compact ? null : (
        <div className="mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Contact</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-shield-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(profile?.full_name || session?.user?.email || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name || "You"}</p>
              {hasPhone ? (
                <a href={`tel:${phone}`} className="text-xs text-shield-600 font-medium hover:underline">
                  {formatPhone(phone)}
                </a>
              ) : (
                <p className="text-xs text-gray-400">No phone number added</p>
              )}
            </div>
            {hasPhone && (
              <div className="flex gap-1.5 shrink-0">
                <a href={`tel:${phone}`} className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </a>
                <a href={`sms:${phone}`} className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!compact && displayMembers.length > 0 && (
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Family Contacts ({displayMembers.length})
        </p>
      )}

      {displayMembers.length === 0 && !compact && (
        usePagination && initialLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-shield-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">No family members yet. Share your family code!</p>
        )
      )}

      {compact ? (
        /* Compact quick-dial horizontal strip */
        displayMembers.length > 0 && (
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-2 min-w-max pb-1">
              {displayMembers.slice(0, 6).map((m) => (
                <CompactContactCard key={m.id} member={m} />
              ))}
            </div>
          </div>
        )
      ) : (
        /* Full list */
        <div className="flex-1 overflow-y-auto space-y-2">
          {displayMembers.map((m) => (
            <FullContactCard key={m.id} member={m} />
          ))}
          {usePagination && hasMore && (
            <div ref={sentinelRef} className="h-4" />
          )}
          {loadingMore && (
            <div className="flex justify-center py-3">
              <div className="w-5 h-5 border-2 border-shield-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {usePagination && !hasMore && paginatedMembers.length > 0 && (
            <p className="text-xs text-gray-400 text-center py-3">All contacts loaded</p>
          )}
        </div>
      )}
    </div>
  );
}

function CompactContactCard({ member }) {
  const p = member.phone_number;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3 w-28 shrink-0">
      <div className="w-8 h-8 rounded-full bg-shield-600/10 flex items-center justify-center text-shield-700 font-bold text-xs mx-auto mb-1.5">
        {(member.full_name || "?")[0].toUpperCase()}
      </div>
      <p className="text-[10px] font-semibold text-gray-900 text-center truncate">{member.full_name || "Unnamed"}</p>
      <div className="flex items-center justify-center gap-1 mt-1">
        <span className={`w-1.5 h-1.5 rounded-full ${member.status === "safe" ? "bg-green-500" : member.status === "help" ? "bg-yellow-500" : member.status === "emergency" ? "bg-red-500" : "bg-gray-400"}`} />
        <span className="text-[9px] text-gray-400">{timeAgo(member.last_seen_at)}</span>
      </div>
      {p && p.length >= 12 ? (
        <div className="flex justify-center gap-1 mt-2">
          <a href={`tel:${p}`} className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </a>
          <a href={`sms:${p}`} className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </a>
        </div>
      ) : (
        <p className="text-[8px] text-gray-300 text-center mt-2">No phone</p>
      )}
    </div>
  );
}

function FullContactCard({ member }) {
  const p = member.phone_number;
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-gray-100 shadow-sm">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
        member.status === "safe" ? "bg-green-500" : member.status === "help" ? "bg-yellow-500" : member.status === "emergency" ? "bg-red-500" : "bg-gray-400"
      }`}>
        {(member.full_name || "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{member.full_name || "Unnamed"}</p>
        {p && p.length >= 12 ? (
          <p className="text-xs text-gray-500">{formatPhone(p)}</p>
        ) : (
          <p className="text-xs text-gray-300">No phone added</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${member.status === "safe" ? "bg-green-500" : member.status === "help" ? "bg-yellow-500" : member.status === "emergency" ? "bg-red-500" : "bg-gray-400"}`} />
          <span className="text-[10px] text-gray-400 capitalize">{member.status || "Unknown"}</span>
          <span className="text-[10px] text-gray-300">&middot;</span>
          <span className="text-[10px] text-gray-400">{timeAgo(member.last_seen_at)}</span>
        </div>
      </div>
      {p && p.length >= 12 && (
        <div className="flex gap-1.5 shrink-0">
          <a href={`tel:${p}`} className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-colors" title="Call">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </a>
          <a href={`sms:${p}`} className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200 transition-colors" title="SMS">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </a>
        </div>
      )}
    </div>
  );
}
