import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchStatusOverview, fetchStatusUsers } from "../services/adminStatus";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import DataTable from "./DataTable";

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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortColumn, setSortColumn] = useState("last_seen_at");
  const [sortDirection, setSortDirection] = useState("DESC");
  const LIMIT = 10;

  const loadOverview = async () => {
    try {
      const data = await fetchStatusOverview();
      setOverview(data);
    } catch {
      setOverview(null);
    }
  };

  const loadUsers = async (p = 1, sortBy = sortColumn, sortDir = sortDirection) => {
    setLoading(true);
    setPage(p);
    try {
      const data = await fetchStatusUsers(statusFilter, search, p, LIMIT, sortBy, sortDir);
      setUsers(Array.isArray(data?.data) ? data.data : []);
      setTotal(data?.total || 0);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadUsers(1);
  }, [statusFilter, session]);

  useEffect(() => {
    const timer = setTimeout(() => { loadUsers(1); }, 300);
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

  const SORT_FIELD_MAP = {
    user: "full_name",
    location: "barangay",
    lastSeen: "last_seen_at",
    status: "status",
  };

  function handleSortChange(sorting) {
    if (sorting && sorting.length > 0) {
      const field = SORT_FIELD_MAP[sorting[0].id] || "last_seen_at";
      setSortColumn(field);
      setSortDirection(sorting[0].desc ? "DESC" : "ASC");
      loadUsers(1, field, sorting[0].desc ? "DESC" : "ASC");
    } else {
      setSortColumn("last_seen_at");
      setSortDirection("DESC");
      loadUsers(1, "last_seen_at", "DESC");
    }
  }

  const columns = useMemo(() => [
    {
      id: "user",
      header: "User",
      accessorKey: "full_name",
      cell: ({ row }) => {
        const user = row.original;
        const colors = STATUS_COLORS[user.status] || STATUS_COLORS.safe;
        return (
          <button
            onClick={() => onSelectUser(user.id)}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shield-500 rounded"
            aria-label={`View details for ${user.full_name || "Unnamed"}`}
          >
            <AvatarCircle user={user} size={32} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name || "Unnamed"}</p>
              {user.email && <p className="text-[11px] text-gray-500 truncate">{user.email}</p>}
            </div>
          </button>
        );
      },
    },
    {
      id: "location",
      header: "Location",
      accessorKey: "barangay",
      meta: { responsive: true },
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="text-sm text-gray-600">
            {user.barangay && (
              <>
                {user.barangay}
                {user.family_name && <span className="text-[11px] text-gray-500 ml-1">&middot; {user.family_name}</span>}
              </>
            )}
            {!user.barangay && user.family_name && <span className="text-sm text-gray-500">{user.family_name}</span>}
          </div>
        );
      },
    },
    {
      id: "lastSeen",
      header: "Last Seen",
      accessorKey: "last_seen_at",
      meta: { responsive: true },
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">{timeAgo(row.original.last_seen_at)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const colors = STATUS_COLORS[row.original.status] || STATUS_COLORS.safe;
        return (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
            {row.original.status}
          </span>
        );
      },
    },
  ], [onSelectUser]);

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

      <DataTable
        columns={columns}
        data={users}
        totalCount={total}
        pageIndex={page - 1}
        pageSize={LIMIT}
        isLoading={loading}
        serverSide
        onPageChange={(p) => loadUsers(p)}
        onSortChange={handleSortChange}
        emptyMessage="No users found"
      />
    </div>
  );
}
