import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
<<<<<<< Updated upstream
import { fetchAllProfiles, updateUserRole, toggleUserActive } from "../js/auth";
=======
import { fetchAllProfiles, updateUserRole, toggleUserActive } from "../services/auth";
import { fetchAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "../services/announcements";
>>>>>>> Stashed changes
import AdminSidebar from "../components/AdminSidebar";

export default function AdminDashboard() {
  const { session, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
<<<<<<< Updated upstream
=======
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announceForm, setAnnounceForm] = useState({ title: "", description: "", image_url: "", type: "image" });
>>>>>>> Stashed changes

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await fetchAllProfiles();
      setUsers(data);
    } catch (err) {
      showToast("Failed to load users: " + err.message, "error");
    } finally {
      setUsersLoading(false);
    }
  }, [showToast]);

<<<<<<< Updated upstream
  useEffect(() => {
    if (view === "users") loadUsers();
  }, [view, loadUsers]);
=======
  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const data = await fetchAllAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      showToast("Failed to load announcements: " + err.message, "error");
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (view === "users") loadUsers();
    if (view === "announcements") loadAnnouncements();
  }, [view, loadUsers, loadAnnouncements]);

  async function handleCreateAnnouncement(e) {
    e.preventDefault();
    if (!announceForm.title.trim()) return;
    try {
      await createAnnouncement(announceForm);
      setAnnounceForm({ title: "", description: "", image_url: "", type: "image" });
      showToast("Announcement created.", "success");
      loadAnnouncements();
    } catch (err) {
      showToast("Failed to create: " + err.message, "error");
    }
  }

  async function handleToggleActive(announcement) {
    try {
      await updateAnnouncement(announcement.id, { is_active: !announcement.is_active });
      setAnnouncements((prev) => prev.map((a) => (a.id === announcement.id ? { ...a, is_active: !a.is_active } : a)));
      showToast(announcement.is_active ? "Announcement hidden." : "Announcement published.", "success");
    } catch (err) {
      showToast("Failed to update: " + err.message, "error");
    }
  }

  async function handleDeleteAnnouncement(id) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("Announcement deleted.", "success");
    } catch (err) {
      showToast("Failed to delete: " + err.message, "error");
    }
  }
>>>>>>> Stashed changes

  async function handleRoleToggle(user) {
    if (user.id === session.user.id) return;
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      showToast(`${user.email || user.full_name} is now ${newRole}.`, "success");
    } catch (err) {
      showToast("Failed to update role: " + err.message, "error");
    }
  }

  async function handleActiveToggle(user) {
    if (user.id === session.user.id) return;
    const newActive = !user.is_active;
    try {
      await toggleUserActive(user.id, newActive);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: newActive } : u)));
      showToast(
        `${user.email || user.full_name} ${newActive ? "activated" : "deactivated"}.`,
        "success"
      );
    } catch (err) {
      showToast("Failed to update status: " + err.message, "error");
    }
  }

  async function handleLogout() {
    await logout();
    showToast("Logged out successfully.", "info", 4000);
    navigate("/", { replace: true });
  }

  const stats = [
    { color: "shield", label: "Total Users", value: users.length || "—" },
    { color: "green", label: "Active", value: users.filter((u) => u.is_active).length || "—" },
    { color: "alert", label: "Deactivated", value: users.filter((u) => !u.is_active).length || "—" },
    { color: "shield", label: "Admins", value: users.filter((u) => u.role === "admin").length || "—" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-shield-800 text-white shadow-lg z-30">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold">Prototype</span>
            </Link>
            <span className="px-2 py-0.5 text-xs font-bold bg-alert-600 rounded-md uppercase tracking-wide">Admin</span>
          </div>
          <div className="flex items-center gap-4">
<<<<<<< Updated upstream
            <Link to="/" className="text-sm text-blue-200 hover:text-white transition-colors flex items-center gap-1">
=======
            <Link to="/" className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1">
>>>>>>> Stashed changes
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </Link>
<<<<<<< Updated upstream
            <span className="text-sm text-blue-200 hidden md:inline">{session?.user?.email}</span>
=======
            <span className="text-sm text-white/70 hidden md:inline">{session?.user?.email}</span>
>>>>>>> Stashed changes
            <button onClick={handleLogout} className="border-2 border-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors">
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <AdminSidebar
          active={view}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          onNavigate={setView}
        />

        <main className="flex-1 p-6 w-full">
          {view === "dashboard" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map(({ color, label, value }) => (
                  <div key={label} className={`card border-l-4 ${
                    color === "alert" ? "border-alert-600" : color === "shield" ? "border-shield-600" : "border-green-600"
                  }`}>
                    <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
                    <p className="text-3xl font-extrabold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card">
                  <h3 className="font-bold text-gray-900 mb-4">Activity Overview</h3>
                  <div className="flex items-end gap-3 h-40 px-2">
                    {[
                      { day: "Mon", h: 30 },
                      { day: "Tue", h: 55 },
                      { day: "Wed", h: 40 },
                      { day: "Thu", h: 75 },
                      { day: "Fri", h: 50 },
                      { day: "Sat", h: 20 },
                      { day: "Sun", h: 35 },
                    ].map(({ day, h }) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-shield-500 rounded-t-md hover:bg-shield-600 transition-colors" style={{ height: `${h}%` }} />
                        <span className="text-xs text-gray-400">{day}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">Reports submitted per day (placeholder data)</p>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="card flex flex-col gap-4">
                    <h3 className="font-bold text-gray-900">Distribution</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full border-[6px] border-shield-500 border-r-alert-500 border-b-green-500 border-l-yellow-400" />
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-shield-500" /> Alerts</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-alert-500" /> Incidents</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Resolved</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400" /> Pending</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Placeholder distribution</p>
                  </div>

                  <div className="card">
                    <h3 className="font-bold text-gray-900 mb-3">Activity Heatmap</h3>
                    <div className="grid grid-cols-[repeat(7,1fr)] gap-1">
                      {Array.from({ length: 35 }).map((_, i) => {
                        const v = Math.floor(Math.random() * 5);
                        const colors = ["bg-gray-100","bg-green-200","bg-green-400","bg-shield-400","bg-shield-600"];
                        return <div key={i} className={`aspect-square rounded-sm ${colors[v]}`} title={`Activity: ${v}`} />;
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-gray-400">
                      <span>Less</span>
                      {["bg-gray-100","bg-green-200","bg-green-400","bg-shield-400","bg-shield-600"].map((c) => (
                        <div key={c} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                      ))}
                      <span>More</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card mt-6">
                <h3 className="font-bold text-gray-900 mb-4">Monthly Incident Trend</h3>
                <div className="relative h-32 px-2">
                  <div className="absolute inset-x-2 bottom-0 h-24 bg-gradient-to-t from-shield-100/80 to-transparent rounded-b-lg" />
                  <svg className="absolute inset-x-2 bottom-0 w-full h-24 overflow-visible" viewBox="0 0 400 96" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-shield-500"
                      points="0,70 40,60 80,72 120,48 160,35 200,50 240,28 280,40 320,22 360,30 400,18"
                    />
                    <polygon
                      fill="currentColor"
                      className="text-shield-500/15"
                      points="0,70 40,60 80,72 120,48 160,35 200,50 240,28 280,40 320,22 360,30 400,18 400,96 0,96"
                    />
                  </svg>
                  <div className="absolute bottom-0 inset-x-2 flex justify-between text-[10px] text-gray-400 pb-0.5">
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">Placeholder incident data</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-3">Incident Type Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Flood", a: 45, b: 20 },
                      { label: "Fire", a: 25, b: 15 },
                      { label: "Earthquake", a: 15, b: 8 },
                      { label: "Landslide", a: 8, b: 12 },
                      { label: "Typhoon", a: 30, b: 18 },
                    ].map(({ label, a, b }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className="text-gray-400">{a + b}</span>
                        </div>
                        <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                          <div className="bg-shield-500 transition-all" style={{ width: `${(a / (a + b)) * 100}%` }} />
                          <div className="bg-alert-400 transition-all flex-1" />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>Reported</span>
                          <span>Resolved</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Placeholder stacked comparison</p>
                </div>

                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-3">Response Time (Hours)</h3>
                  <div className="flex items-end justify-center gap-2 h-40">
                    {[
                      { label: "Jan", h: 2.1 },{ label: "Feb", h: 2.8 },{ label: "Mar", h: 1.9 },{ label: "Apr", h: 2.3 },
                      { label: "May", h: 1.6 },{ label: "Jun", h: 1.4 },{ label: "Jul", h: 1.8 },{ label: "Aug", h: 2.0 },
                      { label: "Sep", h: 1.5 },{ label: "Oct", h: 2.2 },{ label: "Nov", h: 1.7 },{ label: "Dec", h: 1.3 },
                    ].map(({ label, h }) => {
                      const pct = (h / 3) * 100;
                      const color = h <= 1.6 ? "bg-green-500" : h <= 2.2 ? "bg-yellow-400" : "bg-alert-500";
                      return (
                        <div key={label} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-[9px] text-gray-400">{h}h</span>
                          <div className={`w-full rounded-t-sm ${color}`} style={{ height: `${pct}%`, minHeight: 4 }} />
                          <span className="text-[9px] text-gray-300">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">Placeholder response metrics</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[
                      { text: "New user registered", time: "2 min ago", color: "bg-green-500" },
                      { text: "Alert reported — Barangay San Roque", time: "15 min ago", color: "bg-alert-500" },
                      { text: "Admin changed user role", time: "1 hour ago", color: "bg-shield-500" },
                      { text: "Account deactivated", time: "3 hours ago", color: "bg-yellow-400" },
                      { text: "System update completed", time: "1 day ago", color: "bg-gray-400" },
                    ].map(({ text, time, color }) => (
                      <div key={text} className="flex items-start gap-3">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{text}</p>
                          <p className="text-xs text-gray-400">{time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-4">Barangay Breakdown</h3>
                  <div className="space-y-4">
                    {[
                      { name: "San Roque", pct: 35 },
                      { name: "San Isidro", pct: 28 },
                      { name: "Poblacion", pct: 20 },
                      { name: "Sta. Maria", pct: 12 },
                      { name: "Other", pct: 5 },
                    ].map(({ name, pct }) => (
                      <div key={name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{name}</span>
                          <span className="text-gray-400">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full">
                          <div className="h-full bg-shield-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-4">Placeholder barangay data</p>
                </div>
              </div>
            </>
          )}

          {view === "users" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage roles and account status.</p>
                </div>
                <button onClick={loadUsers} disabled={usersLoading} className="btn-outline px-4 py-2 text-sm">
                  {usersLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-left text-gray-500 font-medium">
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3 hidden md:table-cell">Barangay</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.length === 0 && !usersLoading && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                            No users found.
                          </td>
                        </tr>
                      )}
                      {usersLoading && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center">
                            <div className="w-6 h-6 border-2 border-shield-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          </td>
                        </tr>
                      )}
                      {users.map((user) => {
                        const isSelf = user.id === session.user.id;
                        return (
<<<<<<< Updated upstream
                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isSelf ? "bg-blue-50/50" : ""}`}>
=======
                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isSelf ? "bg-shield-50/50" : ""}`}>
>>>>>>> Stashed changes
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{user.full_name || "—"}</p>
                              {isSelf && <span className="text-[10px] px-1.5 py-0.5 bg-shield-100 text-shield-700 rounded font-medium">You</span>}
                            </div>
                            <p className="text-xs text-gray-400">{user.email || "—"}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-600 hidden md:table-cell">{user.barangay || "—"}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleRoleToggle(user)}
                              disabled={isSelf}
                              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                isSelf
                                  ? "bg-alert-100 text-alert-600 cursor-not-allowed"
                                  : user.role === "admin"
                                    ? "bg-alert-100 text-alert-600 hover:bg-alert-200"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                              title={isSelf ? "You cannot change your own role" : `Toggle to ${user.role === "admin" ? "user" : "admin"}`}
                            >
                              {user.role}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleActiveToggle(user)}
                              disabled={isSelf}
                              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                isSelf
                                  ? "bg-green-100 text-green-700 cursor-not-allowed"
                                  : user.is_active
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                              }`}
                              title={isSelf ? "You cannot deactivate your own account" : user.is_active ? "Deactivate" : "Activate"}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
<<<<<<< Updated upstream
=======

          {view === "announcements" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                  <p className="text-gray-500 text-sm mt-1">Create and manage banner announcements shown to all users.</p>
                </div>
              </div>

              <div className="card mb-6">
                <h3 className="font-bold text-gray-900 mb-4">New Announcement</h3>
                <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        className="input-field py-2 text-sm"
                        placeholder="Flood Alert"
                        value={announceForm.title}
                        onChange={(e) => setAnnounceForm((p) => ({ ...p, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        className="input-field py-2 text-sm"
                        value={announceForm.type}
                        onChange={(e) => setAnnounceForm((p) => ({ ...p, type: e.target.value }))}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      className="input-field py-2 text-sm"
                      placeholder="Stay vigilant. Report flooding in your area."
                      value={announceForm.description}
                      onChange={(e) => setAnnounceForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Image / Video URL</label>
                    <input
                      type="url"
                      className="input-field py-2 text-sm"
                      placeholder="https://..."
                      value={announceForm.image_url}
                      onChange={(e) => setAnnounceForm((p) => ({ ...p, image_url: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn-primary py-2 text-sm">Publish Announcement</button>
                </form>
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-left text-gray-500 font-medium">
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3 hidden md:table-cell">Type</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {announcements.length === 0 && !announcementsLoading && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                            No announcements yet. Create one above.
                          </td>
                        </tr>
                      )}
                      {announcementsLoading && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center">
                            <div className="w-6 h-6 border-2 border-shield-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          </td>
                        </tr>
                      )}
                      {announcements.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{a.title}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{a.description}</p>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{a.type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleActive(a)}
                              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                a.is_active
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}
                            >
                              {a.is_active ? "Active" : "Hidden"}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteAnnouncement(a.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
>>>>>>> Stashed changes
        </main>
      </div>
    </div>
  );
}
