import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchStatusOverview, fetchStatusUsers } from "../services/adminStatus";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

const STATUS_COLORS = {
  safe: { hex: "#22c55e", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  help: { hex: "#eab308", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  emergency: { hex: "#ef4444", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const STATUS_TABS = [
  { key: "all", label: "All", bg: "bg-gray-100", text: "text-gray-600" },
  { key: "help", label: "Help", bg: "bg-yellow-50", text: "text-yellow-700" },
  { key: "emergency", label: "Emergency", bg: "bg-red-50", text: "text-red-700" },
];

const SUMMARY_CARDS = [
  { key: "emergency", label: "Emergency", bg: "bg-red-600", text: "text-white" },
  { key: "help", label: "Help Needed", bg: "bg-yellow-500", text: "text-white" },
  { key: "safe", label: "Safe", bg: "bg-green-600", text: "text-white" },
  { key: "total", label: "Total Users", bg: "bg-gray-700", text: "text-white" },
];

function AvatarCircle({ user, size = 32 }) {
  const color = (STATUS_COLORS[user.status] || STATUS_COLORS.safe).hex;
  const initial = (user.full_name || "?")[0].toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);

  if (user.avatar_url && !imgFailed) {
    return (
      <div className="shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size, border: "2px solid " + color }}>
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-full overflow-hidden flex items-center justify-center" style={{ width: size, height: size, border: "2px solid " + color, backgroundColor: color }}>
      <span className="font-bold text-white leading-none select-none" style={{ fontSize: size * 0.38 + "px" }}>{initial}</span>
    </div>
  );
}

function timeAgo(isoString) {
  if (!isoString) return "never";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AdminAlertsView({ onSelectUser }) {
  const { session } = useAuth();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadOverview = async () => {
    try {
      const data = await fetchStatusOverview();
      setOverview(data);
    } catch {
      setOverview(null);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchStatusUsers(statusFilter, search);
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadUsers();
  }, [statusFilter, session]);

  useEffect(() => {
    const timer = setTimeout(() => { loadUsers(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const refreshAll = useCallback(() => {
    loadOverview();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  useRealtimeRefresh(
    { table: "status_history", event: "INSERT", channelName: "admin-status-board" },
    refreshAll,
  );

  const visibleUsers = useMemo(() => users, [users]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <h2 className="text-base font-bold text-gray-900">Status Response Board</h2>
        <button onClick={() => { loadOverview(); loadUsers(); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500" aria-label="Refresh data">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {SUMMARY_CARDS.map(({ key, label, bg, text }) => (
          <button
            key={key}
            onClick={() => {
              if (key !== "total") setStatusFilter(key === statusFilter ? "all" : key);
            }}
            className={`${bg} rounded-lg px-3 py-3 text-left transition-opacity ${key !== "total" ? "hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500 focus-visible:ring-offset-1" : "cursor-default"} ${key === statusFilter ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wider ${text} opacity-90`}>{label}</p>
            <p className={`text-2xl font-bold ${text} mt-0.5`}>{overview ? (key === "total" ? overview.total : overview[key]) : "\u2014"}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or barangay..."
            aria-label="Search users"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Filter by status">
          {STATUS_TABS.map(({ key, label, bg, text }) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                role="tab"
                aria-selected={isActive}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500 focus-visible:ring-offset-1 ${
                  isActive ? `bg-shield-600 text-white shadow-sm` : `${bg} ${text} hover:opacity-80`
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="px-4 py-12 flex flex-col items-center gap-2" role="status">
            <svg className="w-5 h-5 animate-spin text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-xs text-gray-400">Loading users...</p>
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-xs text-gray-500">No users found</p>
            {search && <p className="text-[11px] text-gray-500 mt-0.5">Try a different search term</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visibleUsers.map((u) => {
              const colors = STATUS_COLORS[u.status] || STATUS_COLORS.safe;
              return (
                <button
                  key={u.id}
                  onClick={() => onSelectUser(u.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-colors text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shield-500"
                  aria-label={`View details for ${u.full_name || "Unnamed"}`}
                >
                  <AvatarCircle user={u} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name || "Unnamed"}</p>
                      {u.email && <span className="hidden sm:inline text-[11px] text-gray-500 truncate">&middot; {u.email}</span>}
                    </div>
                    <div className="flex items-baseline gap-1.5 text-[11px] text-gray-500 mt-0.5">
                      {u.barangay && <span>{u.barangay}</span>}
                      {u.family_name && <span>&middot; {u.family_name}</span>}
                      <span>&middot; {timeAgo(u.last_seen_at)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                    {u.status}
                  </span>
                  <svg className="w-3.5 h-3.5 shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
