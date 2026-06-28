import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

import { fetchAllProfiles, updateUserRole, toggleUserActive } from "../services/auth";
import { fetchAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "../services/announcements";
import { fetchAllAlerts, createAlert, updateAlert, deleteAlert } from "../services/tcws";

import AdminSidebar from "../components/AdminSidebar";
import ConfirmDialog from "../components/ConfirmDialog";
import FloodHazardView from "./floodHazard/FloodHazardView";
import RainViewerPage from "./RainViewerPage";
export default function AdminDashboard() {
  const { session, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announceModal, setAnnounceModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announceForm, setAnnounceForm] = useState({ title: "", short_description: "", long_description: "", image_url: "" });
  const [announceFile, setAnnounceFile] = useState(null);
  const [announcePreview, setAnnouncePreview] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tcwsAlerts, setTcwsAlerts] = useState([]);
  const [tcwsLoading, setTcwsLoading] = useState(false);
  const [tcwsModal, setTcwsModal] = useState(false);
  const [editingTcws, setEditingTcws] = useState(null);
  const [tcwsForm, setTcwsForm] = useState({ signal_level: 1, description: "", wind_speed: "30-60 km/h" });
  const [tcwsDeleteConfirm, setTcwsDeleteConfirm] = useState(null);
  const [tcwsSaving, setTcwsSaving] = useState(false);


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

  const loadTcws = useCallback(async () => {
    setTcwsLoading(true);
    try {
      const data = await fetchAllAlerts();
      setTcwsAlerts(data);
    } catch (err) {
      showToast("Failed to load TCWS alerts: " + err.message, "error");
    } finally {
      setTcwsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (view === "users") loadUsers();
    if (view === "announcements") loadAnnouncements();
    if (view === "tcws") loadTcws();
  }, [view, loadUsers, loadAnnouncements]);

  function openCreateModal() {
    setEditingAnnouncement(null);
    setAnnounceForm({ title: "", short_description: "", long_description: "", image_url: "" });
    setAnnounceFile(null);
    setAnnouncePreview(null);
    setAnnounceModal(true);
  }

  function openEditModal(announcement) {
    setEditingAnnouncement(announcement);
    setAnnounceForm({
      title: announcement.title || "",
      short_description: announcement.description || "",
      long_description: announcement.long_description || "",
      image_url: announcement.image_url || "",
    });
    setAnnounceFile(null);
    setAnnouncePreview(announcement.image_url || null);
    setAnnounceModal(true);
  }

  function closeModal() {
    setAnnounceModal(false);
    setEditingAnnouncement(null);
    setAnnounceFile(null);
    setAnnouncePreview(null);
  }

  function handleFileSelect(e) {
    const f = e.target.files[0];
    if (!f) return;
    setAnnounceFile(f);
    const reader = new FileReader();
    reader.onload = () => setAnnouncePreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleSaveAnnouncement(e) {
    e.preventDefault();
    if (!announceForm.title.trim() || !announceForm.short_description.trim()) return;
    setSaving(true);
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, {
          title: announceForm.title,
          short_description: announceForm.short_description,
          long_description: announceForm.long_description,
          image_url: announceForm.image_url,
          file: announceFile,
        });
        showToast("Announcement updated.", "success");
      } else {
        await createAnnouncement({
          title: announceForm.title,
          short_description: announceForm.short_description,
          long_description: announceForm.long_description,
          image_url: announceForm.image_url,
          file: announceFile,
        });
        showToast("Announcement created.", "success");
      }
      closeModal();
      loadAnnouncements();
    } catch (err) {
      showToast("Failed to save: " + err.message, "error");
    } finally {
      setSaving(false);
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

  function handleDeleteClick(announcement) {
    setDeleteConfirm(announcement);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    try {
      await deleteAnnouncement(deleteConfirm.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteConfirm.id));
      showToast("Announcement deleted.", "success");
    } catch (err) {
      showToast("Failed to delete: " + err.message, "error");
    } finally {
      setDeleteConfirm(null);
    }
  }

  const WIND_SPEEDS = {
    1: "30-60 km/h",
    2: "61-120 km/h",
    3: "121-170 km/h",
    4: "171-220 km/h",
    5: ">220 km/h",
  };

  function openTcwsCreate() {
    setEditingTcws(null);
    setTcwsForm({ signal_level: 1, description: "", wind_speed: "30-60 km/h" });
    setTcwsModal(true);
  }

  function openTcwsEdit(alert) {
    setEditingTcws(alert);
    setTcwsForm({
      signal_level: alert.signal_level,
      description: alert.description || "",
      wind_speed: alert.wind_speed,
    });
    setTcwsModal(true);
  }

  function closeTcwsModal() {
    setTcwsModal(false);
    setEditingTcws(null);
  }

  async function handleTcwsSave(e) {
    e.preventDefault();
    if (!tcwsForm.wind_speed.trim()) return;
    setTcwsSaving(true);
    try {
      if (editingTcws) {
        await updateAlert(editingTcws.id, tcwsForm);
        showToast("TCWS alert updated.", "success");
      } else {
        await createAlert(tcwsForm);
        showToast("TCWS alert created.", "success");
      }
      closeTcwsModal();
      loadTcws();
    } catch (err) {
      showToast("Failed to save: " + err.message, "error");
    } finally {
      setTcwsSaving(false);
    }
  }

  async function handleTcwsToggle(alert) {
    try {
      await updateAlert(alert.id, { is_active: !alert.is_active });
      setTcwsAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_active: !a.is_active } : a)));
      showToast(alert.is_active ? "Alert deactivated." : "Alert activated.", "success");
    } catch (err) {
      showToast("Failed to update: " + err.message, "error");
    }
  }

  async function handleTcwsDelete(alertId) {
    try {
      await deleteAlert(alertId);
      setTcwsAlerts((prev) => prev.filter((a) => a.id !== alertId));
      showToast("Alert deleted.", "success");
    } catch (err) {
      showToast("Failed to delete: " + err.message, "error");
    } finally {
      setTcwsDeleteConfirm(null);
    }
  }

  const TITLE_MAX = 100;
  const SHORT_MAX = 200;
  const LONG_MAX = 2000;
  const titleLen = announceForm.title.length;
  const shortLen = announceForm.short_description.length;
  const longLen = announceForm.long_description.length;


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

            <Link to="/" className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1">

              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </Link>

            <span className="text-sm text-white/70 hidden md:inline">{session?.user?.email}</span>

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
                        <th className="px-6 py-3 hidden md:table-cell">Blood</th>
                        <th className="px-6 py-3 hidden md:table-cell">Special Needs</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.length === 0 && !usersLoading && (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                            No users found.
                          </td>
                        </tr>
                      )}
                      {usersLoading && (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <div className="w-6 h-6 border-2 border-shield-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          </td>
                        </tr>
                      )}
                      {users.map((user) => {
                        const isSelf = user.id === session.user.id;
                        return (

                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isSelf ? "bg-shield-50/50" : ""}`}>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{user.full_name || "—"}</p>
                              {isSelf && <span className="text-[10px] px-1.5 py-0.5 bg-shield-100 text-shield-700 rounded font-medium">You</span>}
                            </div>
                            <p className="text-xs text-gray-400">{user.email || "—"}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-600 hidden md:table-cell">{user.barangay || "—"}</td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className={`text-xs font-medium ${user.blood_type ? "text-gray-700" : "text-gray-300"}`}>
                              {user.blood_type || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className={`text-xs ${user.special_needs ? "text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full" : "text-gray-300"}`}>
                              {user.special_needs ? user.special_needs.slice(0, 30) + (user.special_needs.length > 30 ? "..." : "") : "—"}
                            </span>
                          </td>
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


          {view === "announcements" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage banner announcements shown to all users.</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
              </div>

              {announcementsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-shield-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="card py-16 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  <p className="text-sm font-medium">No announcements yet</p>
                  <p className="text-xs mt-1">Create your first announcement to start.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-left text-gray-600 font-semibold">
                          <th className="px-6 py-3 w-24">Media</th>
                          <th className="px-6 py-3">Title</th>
                          <th className="px-6 py-3 hidden md:table-cell">Type</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {announcements.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3">
                              {a.image_url ? (
                                a.type === "video" ? (
                                  <video src={a.image_url} className="w-12 h-12 rounded-lg object-cover bg-gray-100" muted />
                                ) : (
                                  <img src={a.image_url} className="w-12 h-12 rounded-lg object-cover bg-gray-100" alt="" />
                                )
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <p className="font-medium text-gray-900 truncate max-w-[240px]">{a.title}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[240px] mt-0.5">{a.description}</p>
                            </td>
                            <td className="px-6 py-3 hidden md:table-cell">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${a.type === "video" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                {a.type}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <button
                                onClick={() => handleToggleActive(a)}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                  a.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                              >
                                {a.is_active ? "Active" : "Hidden"}
                              </button>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(a)} className="text-xs text-shield-600 hover:text-shield-800 font-medium">
                                  Edit
                                </button>
                                <button onClick={() => handleDeleteClick(a)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {announceModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                  <form
                    onSubmit={handleSaveAnnouncement}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
                  >
                    <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">
                        {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
                      </h2>
                      <button type="button" onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="px-6 py-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</label>
                          <span className={`text-[10px] font-medium ${titleLen > TITLE_MAX ? "text-red-500" : "text-gray-400"}`}>{titleLen}/{TITLE_MAX}</span>
                        </div>
                        <input
                          type="text"
                          value={announceForm.title}
                          onChange={(e) => setAnnounceForm((p) => ({ ...p, title: e.target.value }))}
                          maxLength={TITLE_MAX}
                          placeholder="Flood Alert"
                          required
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Short Description</label>
                          <span className={`text-[10px] font-medium ${shortLen > SHORT_MAX ? "text-red-500" : "text-gray-400"}`}>{shortLen}/{SHORT_MAX}</span>
                        </div>
                        <input
                          type="text"
                          value={announceForm.short_description}
                          onChange={(e) => setAnnounceForm((p) => ({ ...p, short_description: e.target.value }))}
                          maxLength={SHORT_MAX}
                          placeholder="Stay vigilant. Report flooding in your area."
                          required
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5 ml-1">Shown in the announcement banner</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Long Description</label>
                          <span className={`text-[10px] font-medium ${longLen > LONG_MAX ? "text-red-500" : "text-gray-400"}`}>{longLen}/{LONG_MAX}</span>
                        </div>
                        <textarea
                          value={announceForm.long_description}
                          onChange={(e) => setAnnounceForm((p) => ({ ...p, long_description: e.target.value }))}
                          maxLength={LONG_MAX}
                          rows={4}
                          placeholder="Detailed information shown when users click the banner..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none resize-none"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5 ml-1">Optional — shown in the detail view when banner is clicked</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Media</label>
                        <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-shield-400 hover:bg-shield-50/30 transition-colors">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-xs text-gray-500 font-medium">Drop a file or click to browse</span>
                          <span className="text-[10px] text-gray-400">JPG, PNG, WebP up to 10MB · MP4, WebM up to 50MB</span>
                          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={handleFileSelect} className="hidden" />
                        </label>
                        {announceFile && (
                          <p className="text-[11px] text-shield-600 font-medium mt-1.5 ml-1">{announceFile.name} ({(announceFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                        )}
                      </div>

                      {!announceFile && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Or paste URL</label>
                          <input
                            type="url"
                            value={announceForm.image_url}
                            onChange={(e) => setAnnounceForm((p) => ({ ...p, image_url: e.target.value }))}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                          />
                        </div>
                      )}

                      {announcePreview && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Preview</label>
                          {(announceFile && announceFile.type.startsWith("video/")) ? (
                            <video src={announcePreview} className="w-full h-40 rounded-lg object-cover bg-gray-100" controls muted />
                          ) : (
                            <img src={announcePreview} className="w-full h-40 rounded-lg object-cover bg-gray-100" alt="Preview" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                      <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !announceForm.title.trim() || !announceForm.short_description.trim() || (!announceFile && !announceForm.image_url && !editingAnnouncement)}
                        className="btn-primary py-2 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? "Saving..." : editingAnnouncement ? "Save Changes" : "Publish"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {deleteConfirm && (
                <ConfirmDialog
                  title="Delete Announcement"
                  message={`Permanently delete "${deleteConfirm.title}"? This action cannot be undone.`}
                  confirmLabel="Delete"
                  confirmClass="bg-red-600 hover:bg-red-700"
                  onConfirm={handleDeleteConfirm}
                  onCancel={() => setDeleteConfirm(null)}
                />
              )}
            </>
          )}

          {view === "hazard" && <FloodHazardView />}

          {view === "rainviewer" && <RainViewerPage />}

          {view === "tcws" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Tropical Cyclone Warning Signals</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage TCWS alerts shown to all users.</p>
                </div>
                <button onClick={openTcwsCreate} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New Alert
                </button>
              </div>

              {!tcwsLoading && tcwsAlerts.length > 0 && (
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                  {(() => {
                    const active = tcwsAlerts.filter((a) => a.is_active);
                    const highest = active.length > 0
                      ? active.reduce((max, a) => a.signal_level > max.signal_level ? a : max, active[0])
                      : null;
                    const SIGNAL_COLOR = {
                      1: "border-yellow-500 bg-yellow-50",
                      2: "border-orange-400 bg-orange-50",
                      3: "border-orange-600 bg-orange-50",
                      4: "border-red-600 bg-red-50",
                      5: "border-red-900 bg-red-50",
                    };
                    return (
                      <>
                        <div className={`rounded-xl border-2 ${highest ? SIGNAL_COLOR[highest.signal_level] || "border-gray-200 bg-gray-50" : "border-gray-200 bg-gray-50"} px-4 py-3`}>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Highest Active</p>
                          {highest ? (
                            <>
                              <p className="text-2xl font-extrabold text-gray-900 mt-1">TCWS #{highest.signal_level}</p>
                              <p className="text-xs text-gray-600 mt-0.5">Quezon, Tagkawayan</p>
                            </>
                          ) : (
                            <p className="text-lg font-bold text-gray-400 mt-1">None</p>
                          )}
                        </div>
                        <div className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Alerts</p>
                          <p className="text-2xl font-extrabold text-gray-900 mt-1">{active.length}</p>
                          <p className="text-xs text-gray-600 mt-0.5">of {tcwsAlerts.length} total</p>
                        </div>
                        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Signal Levels</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            {[1,2,3,4,5].map((lvl) => {
                              const has = active.some((a) => a.signal_level === lvl);
                              return (
                                <div key={lvl} className={`flex-1 h-6 rounded ${has ? (lvl === 1 ? "bg-yellow-500" : lvl === 2 ? "bg-orange-400" : lvl === 3 ? "bg-orange-600" : lvl === 4 ? "bg-red-600" : "bg-red-900") : "bg-gray-200"} flex items-center justify-center`} title={`TCWS #${lvl}${has ? " — active" : " — inactive"}`}>
                                  <span className={`text-[10px] font-bold ${has ? "text-white" : "text-gray-400"}`}>{lvl}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {tcwsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-4 border-shield-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tcwsAlerts.length === 0 ? (
                <div className="card py-16 text-center text-gray-400">
                  <svg className="w-14 h-14 mx-auto mb-3 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">No TCWS alerts yet</p>
                  <p className="text-xs mt-1">Click "New Alert" to create your first TCWS advisory.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tcwsAlerts.map((a) => (
                    <div
                      key={a.id}
                      className={`bg-white rounded-xl shadow-sm border transition-colors ${
                        a.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-white font-extrabold text-lg ${
                          a.signal_level === 1 ? "bg-yellow-500" :
                          a.signal_level === 2 ? "bg-orange-400" :
                          a.signal_level === 3 ? "bg-orange-600" :
                          a.signal_level === 4 ? "bg-red-600" : "bg-red-900"
                        }`}>
                          {a.signal_level}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-base font-bold text-gray-900">TCWS #{a.signal_level}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              {a.is_active ? "Active" : "Hidden"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium">Quezon, Tagkawayan</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">{a.wind_speed}</span>
                            {a.description && (
                              <span className="text-xs text-gray-400 truncate hidden sm:inline">{a.description}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => openTcwsEdit(a)}
                            className="px-3 py-1.5 text-xs font-medium text-shield-600 hover:bg-shield-50 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleTcwsToggle(a)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              a.is_active ? "text-gray-500 hover:bg-gray-100" : "text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {a.is_active ? "Hide" : "Show"}
                          </button>
                          <button
                            onClick={() => setTcwsDeleteConfirm(a.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tcwsModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={closeTcwsModal}>
                  <form
                    onSubmit={handleTcwsSave}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4"
                  >
                    <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">
                        {editingTcws ? "Edit TCWS Alert" : "New TCWS Alert"}
                      </h2>
                      <button type="button" onClick={closeTcwsModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="px-6 py-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Signal Level</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[1,2,3,4,5].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setTcwsForm((p) => ({ ...p, signal_level: lvl, wind_speed: WIND_SPEEDS[lvl] }))}
                              className={`py-3 rounded-xl text-center font-bold transition-all ${
                                tcwsForm.signal_level === lvl
                                  ? (lvl === 1 ? "bg-yellow-500" : lvl === 2 ? "bg-orange-400" : lvl === 3 ? "bg-orange-600" : lvl === 4 ? "bg-red-600" : "bg-red-900") + " text-white ring-2 ring-offset-1 ring-shield-500"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}
                            >
                              <span className="text-xl block">{lvl}</span>
                              <span className="text-[9px] block opacity-75 mt-0.5">Level</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Wind Speed</label>
                        <select
                          value={tcwsForm.wind_speed}
                          onChange={(e) => setTcwsForm((p) => ({ ...p, wind_speed: e.target.value }))}
                          required
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm appearance-none bg-white bg-no-repeat bg-[center_right_0.5rem] focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundSize: "1.25rem" }}
                        >
                          <option value="30-60 km/h">30-60 km/h (in 36 hours)</option>
                          <option value="61-120 km/h">61-120 km/h (in 24 hours)</option>
                          <option value="121-170 km/h">121-170 km/h (in 18 hours)</option>
                          <option value="171-220 km/h">171-220 km/h (in 12 hours)</option>
                          <option value=">220 km/h">&#62;220 km/h (in 12 hours)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Description</label>
                        <textarea
                          value={tcwsForm.description}
                          onChange={(e) => setTcwsForm((p) => ({ ...p, description: e.target.value }))}
                          rows={2}
                          placeholder="Tropical storm approaching. Take necessary precautions."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none resize-none"
                        />
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                      <button type="button" onClick={closeTcwsModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={tcwsSaving || !tcwsForm.wind_speed.trim()}
                        className="btn-primary py-2 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {tcwsSaving ? "Saving..." : editingTcws ? "Save Changes" : "Publish Alert"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {tcwsDeleteConfirm && (
                <ConfirmDialog
                  title="Delete TCWS Alert"
                  message="Permanently delete this TCWS alert?"
                  confirmLabel="Delete"
                  confirmClass="bg-red-600 hover:bg-red-700"
                  onConfirm={() => handleTcwsDelete(tcwsDeleteConfirm)}
                  onCancel={() => setTcwsDeleteConfirm(null)}
                />
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
