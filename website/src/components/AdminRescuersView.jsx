import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "../context/ToastContext";
import { fetchAllProfiles, updateUserRole } from "../services/auth";
import { adminUpdateRescuer, fetchAdminRescuers, fetchRescueActivity } from "../services/rescue";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import DataTable from "./DataTable";

const RESCUER_TYPES = [
  { value: "general", label: "General" },
  { value: "medical", label: "Medical" },
  { value: "fire", label: "Fire" },
  { value: "search_rescue", label: "Search & Rescue" },
  { value: "logistics", label: "Logistics" },
];

const AID_LABELS = {
  first_aid: "First Aid",
  transported_to_hospital: "Aided to Hospital",
  evacuated: "Evacuated",
  food_water: "Food & Water",
  search_rescue: "Search & Rescue",
  other: "Other",
};

export default function AdminRescuersView() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("roster");
  const [rescuers, setRescuers] = useState([]);
  const [promoteUsers, setPromoteUsers] = useState([]);
  const [promoteTotal, setPromoteTotal] = useState(0);
  const [promotePage, setPromotePage] = useState(1);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState("");
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoteModal, setPromoteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [promoteForm, setPromoteForm] = useState({
    organization: "",
    rescuer_type: "general",
    certification: "",
    contact_number: "",
  });
  const [promoting, setPromoting] = useState(false);
  const promoteSearchTimer = useRef(null);
  useEffect(() => {
    return () => {
      if (promoteSearchTimer.current) clearTimeout(promoteSearchTimer.current);
    };
  }, []);
  const [search, setSearch] = useState("");
  const [detailUser, setDetailUser] = useState(null);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterSortColumn, setRosterSortColumn] = useState("last_seen_at");
  const [rosterSortDirection, setRosterSortDirection] = useState("DESC");
  const [activitySortColumn, setActivitySortColumn] = useState("created_at");
  const [activitySortDirection, setActivitySortDirection] = useState("DESC");
  const [activityStateFilter, setActivityStateFilter] = useState("");
  const PAGE_SIZE = 10;
  const ROSTER_PAGE_SIZE = 10;

  const loadRescuers = useCallback(async (p = 1, sortBy = rosterSortColumn, sortDir = rosterSortDirection) => {
    setLoading(true);
    setRosterPage(p);
    try {
      const data = await fetchAdminRescuers(search, p, ROSTER_PAGE_SIZE, sortBy, sortDir);
      setRescuers(data?.rescuers || []);
      setRosterTotal(data?.total || 0);
    } catch (err) {
      showToast(err.message || "Failed to load rescuers", "error");
    } finally {
      setLoading(false);
    }
  }, [search, showToast, rosterSortColumn, rosterSortDirection]);

  const loadActivity = useCallback(async (p = 1, stateFilter = null, sortBy = activitySortColumn, sortDir = activitySortDirection) => {
    setActivityPage(p);
    try {
      const filter = stateFilter !== null ? stateFilter : activityStateFilter;
      const data = await fetchRescueActivity(p, PAGE_SIZE, filter || null, sortBy, sortDir);
      setActivity(data?.assignments || []);
      setActivityTotal(data?.total || 0);
    } catch (_) {}
  }, [activitySortColumn, activitySortDirection, activityStateFilter]);

  const ROSTER_SORT_FIELD_MAP = {
    rescuer: "full_name",
    type: "rescuer_type",
    availability: "availability",
    organization: "organization",
    certification: "certification",
  };

  function handleRosterSortChange(sorting) {
    if (sorting && sorting.length > 0) {
      const field = ROSTER_SORT_FIELD_MAP[sorting[0].id] || "last_seen_at";
      setRosterSortColumn(field);
      setRosterSortDirection(sorting[0].desc ? "DESC" : "ASC");
      loadRescuers(1, field, sorting[0].desc ? "DESC" : "ASC");
    } else {
      setRosterSortColumn("last_seen_at");
      setRosterSortDirection("DESC");
      loadRescuers(1, "last_seen_at", "DESC");
    }
  }

  const ACTIVITY_SORT_FIELD_MAP = {
    status: "state",
    aid: "aid_type",
    date: "created_at",
  };

  function handleActivitySortChange(sorting) {
    if (sorting && sorting.length > 0) {
      const field = ACTIVITY_SORT_FIELD_MAP[sorting[0].id] || "created_at";
      setActivitySortColumn(field);
      setActivitySortDirection(sorting[0].desc ? "DESC" : "ASC");
      loadActivity(1, null, field, sorting[0].desc ? "DESC" : "ASC");
    } else {
      setActivitySortColumn("created_at");
      setActivitySortDirection("DESC");
      loadActivity(1, null, "created_at", "DESC");
    }
  }

  const loadPromoteUsers = useCallback(async (page = 1) => {
    setPromoteLoading(true);
    setPromotePage(page);
    try {
      const data = await fetchAllProfiles(page, 10, promoteSearch || null);
      setPromoteUsers(data?.data || []);
      setPromoteTotal(data?.total || 0);
    } catch (_) {
    } finally {
      setPromoteLoading(false);
    }
  }, [promoteSearch]);

  useEffect(() => {
    if (tab === "roster") loadRescuers(1);
    if (tab === "activity") loadActivity(1);
    if (tab === "promote") loadPromoteUsers(1);
  }, [tab, loadRescuers, loadActivity, loadPromoteUsers]);

  useRealtimeRefresh(
    tab === "activity"
      ? { table: "rescue_assignments", event: "*", channelName: "admin-rescue-activity" }
      : null,
    loadActivity,
  );

  useRealtimeRefresh(
    tab === "roster"
      ? { table: "rescuers", event: "*", channelName: "admin-rescuer-roster" }
      : null,
    loadRescuers,
  );

  const handlePromote = async () => {
    if (!selectedUserId) return;
    setPromoting(true);
    try {
      await adminUpdateRescuer(selectedUserId, {
        role: "rescuer",
        ...promoteForm,
      });
      showToast("User promoted to rescuer", "success");
      setPromoteModal(false);
      setSelectedUserId(null);
      setPromoteForm({ organization: "", rescuer_type: "general", certification: "", contact_number: "" });
      loadRescuers();
    } catch (err) {
      showToast(err.message || "Failed to promote", "error");
    } finally {
      setPromoting(false);
    }
  };

  const handleDemote = async (userId) => {
    try {
      await updateUserRole(userId, "user");
      showToast("Rescuer demoted to user", "success");
      loadRescuers();
    } catch (err) {
      showToast(err.message || "Failed to demote", "error");
    }
  };

  const handleUpdateRescuer = async (userId, field, value) => {
    try {
      await adminUpdateRescuer(userId, { [field]: value });
      setRescuers((prev) =>
        prev.map((r) => (r.id === userId ? { ...r, [field]: value } : r))
      );
      showToast("Updated", "success");
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    }
  };

  const tabs = [
    { id: "roster", label: "Rescuer Roster" },
    { id: "activity", label: "Rescue Activity" },
    { id: "promote", label: "Promote User" },
  ];

  const rosterColumns = [
    {
      id: "rescuer",
      header: "Rescuer",
      accessorKey: "full_name",
      enableSorting: true,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
              {(r.full_name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{r.full_name || "Unknown"}</p>
              <p className="text-xs text-gray-400">{r.barangay || "\u2014"}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      accessorKey: "rescuer_type",
      enableSorting: true,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <select
            value={r.rescuer_type || "general"}
            onChange={(e) => handleUpdateRescuer(r.id, "rescuer_type", e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
          >
            {RESCUER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        );
      },
    },
    {
      id: "availability",
      header: "Availability",
      accessorKey: "availability",
      enableSorting: true,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <select
            value={r.availability || "off_duty"}
            onChange={(e) => handleUpdateRescuer(r.id, "availability", e.target.value)}
            className={`text-xs font-semibold rounded px-2 py-1 border ${
              r.availability === "available"
                ? "bg-green-50 text-green-700 border-green-200"
                : r.availability === "on_duty"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            <option value="available">Available</option>
            <option value="on_duty">On Duty</option>
            <option value="off_duty">Off Duty</option>
          </select>
        );
      },
    },
    {
      id: "organization",
      header: "Organization",
      accessorKey: "organization",
      enableSorting: true,
      cell: ({ getValue }) => <span className="text-gray-600">{getValue() || "\u2014"}</span>,
    },
    {
      id: "certification",
      header: "Certification",
      accessorKey: "certification",
      enableSorting: true,
      cell: ({ getValue }) => <span className="text-gray-600">{getValue() || "\u2014"}</span>,
    },
    {
      id: "contact",
      header: "Contact",
      accessorKey: "contact_number",
      enableSorting: false,
      cell: ({ row }) => <span className="text-gray-600">{row.original.contact_number || row.original.phone_number || "\u2014"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={() => handleDemote(row.original.id)}
          className="text-xs text-red-600 hover:text-red-800 font-medium"
        >
          Demote
        </button>
      ),
    },
  ];

  const activityColumns = useMemo(() => [
    {
      id: "status",
      header: "Status",
      accessorKey: "state",
      cell: ({ row }) => {
        const state = row.original.state;
        const dotColor = state === "helped" ? "bg-green-500"
          : state === "en_route" ? "bg-yellow-500"
          : state === "on_scene" ? "bg-blue-500"
          : "bg-gray-400";
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
            <span className="text-sm text-gray-700 capitalize">{(state || "unknown").replace(/_/g, " ")}</span>
          </div>
        );
      },
    },
    {
      id: "assignment",
      header: "Assignment",
      enableSorting: false,
      cell: ({ row }) => {
        const a = row.original;
        return (
          <span className="text-sm text-gray-900">
            {a.rescuer?.full_name || "Unknown"}
            <span className="text-gray-400 mx-1">&rarr;</span>
            {a.target?.full_name || "Unknown"}
          </span>
        );
      },
    },
    {
      id: "aid",
      header: "Aid",
      accessorKey: "aid_type",
      meta: { responsive: true },
      cell: ({ getValue }) => {
        const aid = getValue();
        return (
          <span className="text-sm text-gray-600">{aid ? (AID_LABELS[aid] || aid) : "\u2014"}</span>
        );
      },
    },
    {
      id: "date",
      header: "Date",
      accessorKey: "created_at",
      meta: { responsive: true },
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-500">
          {getValue() ? new Date(getValue()).toLocaleString() : ""}
        </span>
      ),
    },
  ], []);

  const promoteColumns = useMemo(() => [
    {
      id: "user",
      header: "User",
      accessorKey: "full_name",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
              {(u.full_name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{u.full_name || "Unknown"}</p>
              <p className="text-xs text-gray-400">{u.email || "—"}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      header: "Current Role",
      accessorKey: "role",
      cell: ({ getValue }) => {
        const role = getValue();
        return (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            role === "rescuer"
              ? "bg-amber-50 text-amber-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {role || "user"}
          </span>
        );
      },
    },
    {
      id: "barangay",
      header: "Barangay",
      accessorKey: "barangay",
      cell: ({ getValue }) => <span className="text-gray-600">{getValue() || "—"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        if (u.role === "rescuer") {
          return <span className="text-xs text-gray-400 italic">Already a rescuer</span>;
        }
        return (
          <button
            onClick={() => {
              setSelectedUserId(u.id);
              setPromoteForm({ organization: "", rescuer_type: "general", certification: "", contact_number: "" });
              setPromoteModal(true);
            }}
            className="px-3 py-1 text-xs font-semibold rounded-full bg-shield-100 text-shield-700 hover:bg-shield-200 transition-colors"
          >
            Promote to Rescuer
          </button>
        );
      },
    },
  ], []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rescuers</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t.id
                  ? "bg-white text-shield-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Tab */}
      {tab === "roster" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by name or barangay..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input flex-1 max-w-sm"
            />
            <button onClick={() => loadRescuers(1)} disabled={loading} className="btn-outline px-4 py-2 text-sm">
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <DataTable
            columns={rosterColumns}
            data={rescuers}
            totalCount={rosterTotal}
            pageIndex={rosterPage - 1}
            pageSize={ROSTER_PAGE_SIZE}
            isLoading={loading}
            serverSide
            onPageChange={(p) => loadRescuers(p)}
            onSortChange={handleRosterSortChange}
            emptyMessage='No rescuers found. Promote a user from the "Promote User" tab.'
          />
        </div>
      )}

      {/* Activity Tab */}
      {tab === "activity" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={activityStateFilter}
              onChange={function (e) { setActivityStateFilter(e.target.value); loadActivity(1, e.target.value); }}
              className="input max-w-[200px] text-sm"
              aria-label="Filter by state"
            >
              <option value="">All States</option>
              <option value="dispatched">Dispatched</option>
              <option value="en_route">En Route</option>
              <option value="on_scene">On Scene</option>
              <option value="helped">Helped</option>
            </select>
            <button onClick={() => loadActivity(1)} className="btn-outline px-4 py-2 text-sm">
              Refresh
            </button>
          </div>
          <DataTable
            columns={activityColumns}
            data={activity}
            totalCount={activityTotal}
            pageIndex={activityPage - 1}
            pageSize={PAGE_SIZE}
            isLoading={false}
            serverSide
            onPageChange={(p) => loadActivity(p)}
            onSortChange={handleActivitySortChange}
            emptyMessage="No rescue activity yet"
          />
        </div>
      )}

      {/* Promote Users Tab */}
      {tab === "promote" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Select a user to promote to rescuer. Rescuers cannot self-register.
          </p>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search users..."
              value={promoteSearch}
              onChange={(e) => {
                setPromoteSearch(e.target.value);
                if (promoteSearchTimer.current) clearTimeout(promoteSearchTimer.current);
                promoteSearchTimer.current = setTimeout(() => {
                  loadPromoteUsers(1);
                }, 300);
              }}
              className="input max-w-xs"
            />
          </div>
          <DataTable
            columns={promoteColumns}
            data={promoteUsers}
            totalCount={promoteTotal}
            pageIndex={promotePage - 1}
            pageSize={10}
            isLoading={promoteLoading}
            serverSide
            onPageChange={(p) => loadPromoteUsers(p)}
            emptyMessage="No users available to promote"
          />
        </div>
      )}

      {/* Promote Modal */}
      {promoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPromoteModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Promote to Rescuer</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rescuer Type</label>
                <select
                  value={promoteForm.rescuer_type}
                  onChange={(e) => setPromoteForm((f) => ({ ...f, rescuer_type: e.target.value }))}
                  className="input"
                >
                  {RESCUER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Organization</label>
                <input
                  type="text"
                  value={promoteForm.organization}
                  onChange={(e) => setPromoteForm((f) => ({ ...f, organization: e.target.value }))}
                  placeholder="e.g. Red Cross, BFP"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Certification</label>
                <input
                  type="text"
                  value={promoteForm.certification}
                  onChange={(e) => setPromoteForm((f) => ({ ...f, certification: e.target.value }))}
                  placeholder="e.g. BLS, WFR, EMT"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={promoteForm.contact_number}
                  onChange={(e) => setPromoteForm((f) => ({ ...f, contact_number: e.target.value }))}
                  placeholder="Rescuer contact number"
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPromoteModal(false)} className="btn-outline flex-1 py-2 text-sm">
                Cancel
              </button>
              <button onClick={handlePromote} disabled={promoting} className="btn-primary flex-1 py-2 text-sm">
                {promoting ? "Promoting..." : "Promote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
