import { useState, useEffect, useCallback } from "react";
import { useToast } from "../context/ToastContext";
import { fetchAllProfiles, updateUserRole } from "../services/auth";
import { adminUpdateRescuer, fetchAdminRescuers, fetchRescueActivity } from "../services/rescue";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

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
  const [allUsers, setAllUsers] = useState([]);
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
  const [search, setSearch] = useState("");
  const [detailUser, setDetailUser] = useState(null);

  const loadRescuers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminRescuers(search);
      setRescuers(data?.rescuers || []);
    } catch (err) {
      showToast(err.message || "Failed to load rescuers", "error");
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  const loadActivity = useCallback(async () => {
    try {
      const data = await fetchRescueActivity();
      setActivity(data?.assignments || []);
    } catch (_) {}
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const data = await fetchAllProfiles();
      setAllUsers(data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (tab === "roster") loadRescuers();
    if (tab === "activity") loadActivity();
    if (tab === "promote") loadAllUsers();
  }, [tab, loadRescuers, loadActivity, loadAllUsers]);

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
            <button onClick={loadRescuers} disabled={loading} className="btn-outline px-4 py-2 text-sm">
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="card p-0 overflow-hidden">
            {rescuers.length === 0 && !loading ? (
              <div className="p-12 text-center text-gray-400">
                No rescuers found. Promote a user from the "Promote User" tab.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-gray-500 font-medium">
                      <th className="px-6 py-3">Rescuer</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Availability</th>
                      <th className="px-6 py-3">Organization</th>
                      <th className="px-6 py-3">Certification</th>
                      <th className="px-6 py-3">Contact</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rescuers.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                              {(r.full_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{r.full_name || "Unknown"}</p>
                              <p className="text-xs text-gray-400">{r.barangay || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={r.rescuer_type || "general"}
                            onChange={(e) => handleUpdateRescuer(r.id, "rescuer_type", e.target.value)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          >
                            {RESCUER_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
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
                        </td>
                        <td className="px-6 py-4 text-gray-600">{r.organization || "—"}</td>
                        <td className="px-6 py-4 text-gray-600">{r.certification || "—"}</td>
                        <td className="px-6 py-4 text-gray-600">{r.contact_number || r.phone_number || "—"}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDemote(r.id)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Demote
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {tab === "activity" && (
        <div>
          <button onClick={loadActivity} className="btn-outline px-4 py-2 text-sm mb-4">
            Refresh
          </button>
          <div className="space-y-3">
            {activity.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">No rescue activity yet</div>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        a.state === "helped" ? "bg-green-500" :
                        a.state === "en_route" ? "bg-yellow-500" :
                        a.state === "on_scene" ? "bg-blue-500" :
                        "bg-gray-400"
                      }`} />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {a.rescuer?.full_name || "Unknown"} → {a.target?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          State: <span className="font-medium uppercase">{a.state.replace("_", " ")}</span>
                          {a.aid_type && <span> · Aide: {AID_LABELS[a.aid_type] || a.aid_type}</span>}
                          {a.eta_seconds && <span> · ETA: ~{Math.round(a.eta_seconds / 60)}min</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                  {a.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">{a.notes}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Promote Users Tab */}
      {tab === "promote" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Select a user to promote to rescuer. Rescuers cannot self-register.
          </p>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-500 font-medium">
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Current Role</th>
                    <th className="px-6 py-3">Barangay</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers
                    .filter((u) => u.role !== "admin")
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                              {(u.full_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{u.full_name || "Unknown"}</p>
                              <p className="text-xs text-gray-400">{u.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            u.role === "rescuer"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {u.role || "user"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{u.barangay || "—"}</td>
                        <td className="px-6 py-4">
                          {u.role === "rescuer" ? (
                            <span className="text-xs text-gray-400 italic">Already a rescuer</span>
                          ) : (
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
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
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
