import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

import { fetchAllProfiles, updateUserRole, toggleUserActive } from "../services/auth";
import { fetchAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "../services/announcements";
import { fetchAllAlerts, createAlert, updateAlert, deleteAlert } from "../services/tcws";
import { fetchAllEvacuationAreas, createEvacuationArea, updateEvacuationArea, deleteEvacuationArea, uploadLandmarkImage } from "../services/evac";
import { fetchAllHotlines, createHotline, updateHotline, deleteHotline } from "../services/hotlines";
import { formatSpecialNeeds } from "../utils/medicalOptions";

import AdminSidebar from "../components/AdminSidebar";
import ConfirmDialog from "../components/ConfirmDialog";
import FloodHazardView from "./floodHazard/FloodHazardView";
import RainViewerPage from "./RainViewerPage";
import TideView from "../components/TideView";
import AdminAlertsView from "../components/AdminAlertsView";
import AdminAlertDetail from "../components/AdminAlertDetail";
import AdminRescuersView from "../components/AdminRescuersView";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import WaterLevelView from "./waterLevel/WaterLevelView";
import DataTable from "../components/DataTable";
export default function AdminDashboard() {
  const { session, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusView, setStatusView] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const USERS_PER_PAGE = 50;
  const [userSearch, setUserSearch] = useState("");
  const [userSortBy, setUserSortBy] = useState(null);
  const [userSortDesc, setUserSortDesc] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announceModal, setAnnounceModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announceForm, setAnnounceForm] = useState({ title: "", short_description: "", long_description: "", image_url: "" });
  const [announceFile, setAnnounceFile] = useState(null);
  const [announcePreview, setAnnouncePreview] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [announcePage, setAnnouncePage] = useState(1);
  const [announceTotal, setAnnounceTotal] = useState(0);
  const [announceSearch, setAnnounceSearch] = useState("");
  const [announceSortBy, setAnnounceSortBy] = useState(null);
  const [announceSortDesc, setAnnounceSortDesc] = useState(false);
  const ANNOUNCE_PAGE_SIZE = 10;

  const [tcwsAlerts, setTcwsAlerts] = useState([]);
  const [tcwsLoading, setTcwsLoading] = useState(false);
  const [tcwsModal, setTcwsModal] = useState(false);
  const [editingTcws, setEditingTcws] = useState(null);
  const [tcwsForm, setTcwsForm] = useState({ signal_level: 1, description: "", wind_speed: "30-60 km/h" });
  const [tcwsDeleteConfirm, setTcwsDeleteConfirm] = useState(null);
  const [tcwsSaving, setTcwsSaving] = useState(false);

  const [evacAreas, setEvacAreas] = useState([]);
  const [evacLoading, setEvacLoading] = useState(false);
  const [evacModal, setEvacModal] = useState(false);
  const [editingEvac, setEditingEvac] = useState(null);
  const [evacForm, setEvacForm] = useState({ name: "", description: "", latitude: "", longitude: "", capacity: "", status: "active" });
  const [evacFile, setEvacFile] = useState(null);
  const [evacPreview, setEvacPreview] = useState(null);
  const [evacDeleteConfirm, setEvacDeleteConfirm] = useState(null);
  const [evacSaving, setEvacSaving] = useState(false);
  const [evacPage, setEvacPage] = useState(1);
  const [evacTotal, setEvacTotal] = useState(0);
  const [evacSearch, setEvacSearch] = useState("");
  const [evacSortBy, setEvacSortBy] = useState(null);
  const [evacSortDesc, setEvacSortDesc] = useState(false);
  const EVAC_PAGE_SIZE = 10;

  const [hotlines, setHotlines] = useState([]);
  const [hotlinesLoading, setHotlinesLoading] = useState(false);
  const [hotlineModal, setHotlineModal] = useState(false);
  const [editingHotline, setEditingHotline] = useState(null);
  const [hotlineForm, setHotlineForm] = useState({ name: "", phoneNumbers: [{ type: "", number: "" }], email: "", website: "", category: "general", is_active: true, sort_order: 0 });
  const [hotlineDeleteConfirm, setHotlineDeleteConfirm] = useState(null);
  const [hotlineSaving, setHotlineSaving] = useState(false);
  const [hotlinesPage, setHotlinesPage] = useState(1);
  const [hotlinesTotal, setHotlinesTotal] = useState(0);
  const [hotlineSearch, setHotlineSearch] = useState("");
  const [hotlineSortBy, setHotlineSortBy] = useState(null);
  const [hotlineSortDesc, setHotlineSortDesc] = useState(false);
  const HOTLINE_PAGE_SIZE = 10;

  const loadUsers = useCallback(async (page = 1, sortBy = userSortBy, sortDesc = userSortDesc) => {
    setUsersLoading(true);
    setUsersPage(page);
    try {
      const result = await fetchAllProfiles(
        page,
        USERS_PER_PAGE,
        userSearch || null,
        sortBy,
        sortDesc ? "DESC" : "ASC",
      );

      setUsers(result.data || []);
      setUsersTotal(result.total || 0);
    } catch (err) {
      showToast("Failed to load users: " + err.message, "error");
    } finally {
      setUsersLoading(false);
    }
  }, [showToast, userSearch, userSortBy, userSortDesc]);

  function handleUserSortChange(sorting) {
    if (sorting && sorting.length > 0) {
      setUserSortBy(sorting[0].id);
      setUserSortDesc(sorting[0].desc);
      loadUsers(1, sorting[0].id, sorting[0].desc);
    } else {
      setUserSortBy(null);
      setUserSortDesc(false);
      loadUsers(1, null, false);
    }
  }

  const HOTLINE_SORT_FIELD_MAP = {
    name: "name",
    category: "category",
    status: "is_active",
  };

  function handleHotlineSortChange(sorting) {
    if (sorting && sorting.length > 0) {
      const field = HOTLINE_SORT_FIELD_MAP[sorting[0].id] || "sort_order";
      setHotlineSortBy(field);
      setHotlineSortDesc(sorting[0].desc);
      loadHotlines(1, field, sorting[0].desc);
    } else {
      setHotlineSortBy(null);
      setHotlineSortDesc(false);
      loadHotlines(1, null, false);
    }
  }

  const EVAC_SORT_FIELD_MAP = {
    name: "name",
    capacity: "capacity",
    status: "status",
  };

  function handleEvacSortChange(sorting) {
    if (sorting && sorting.length > 0) {
      const field = EVAC_SORT_FIELD_MAP[sorting[0].id] || "created_at";
      setEvacSortBy(field);
      setEvacSortDesc(sorting[0].desc);
      loadEvacuationAreas(1, field, sorting[0].desc);
    } else {
      setEvacSortBy(null);
      setEvacSortDesc(false);
      loadEvacuationAreas(1, null, false);
    }
  }

  const ANNOUNCE_SORT_FIELD_MAP = {
    title: "title",
    type: "type",
    status: "is_active",
  };

  function handleAnnounceSortChange(sorting) {
    if (sorting && sorting.length > 0) {
      const field = ANNOUNCE_SORT_FIELD_MAP[sorting[0].id] || "created_at";
      setAnnounceSortBy(field);
      setAnnounceSortDesc(sorting[0].desc);
      loadAnnouncements(1, field, sorting[0].desc);
    } else {
      setAnnounceSortBy(null);
      setAnnounceSortDesc(false);
      loadAnnouncements(1, null, false);
    }
  }

  const loadAnnouncements = useCallback(async (page = 1, sortBy = announceSortBy, sortDesc = announceSortDesc) => {
    setAnnouncementsLoading(true);
    setAnnouncePage(page);
    try {
      const data = await fetchAllAnnouncements(page, ANNOUNCE_PAGE_SIZE, announceSearch, sortBy, sortDesc ? "DESC" : "ASC");
      if (Array.isArray(data)) {
        setAnnouncements(data);
        setAnnounceTotal(data.length);
      } else {
        setAnnouncements(data?.announcements || []);
        setAnnounceTotal(data?.total || 0);
      }
    } catch (err) {
      showToast("Failed to load announcements: " + err.message, "error");
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [showToast, announceSearch, announceSortBy, announceSortDesc]);

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

  const loadEvacuationAreas = useCallback(async (page = 1, sortBy = evacSortBy, sortDesc = evacSortDesc) => {
    setEvacLoading(true);
    setEvacPage(page);
    try {
      const data = await fetchAllEvacuationAreas(page, EVAC_PAGE_SIZE, evacSearch, sortBy, sortDesc ? "DESC" : "ASC");
      if (Array.isArray(data)) {
        setEvacAreas(data);
        setEvacTotal(data.length);
      } else {
        setEvacAreas(data?.areas || []);
        setEvacTotal(data?.total || 0);
      }
    } catch (err) {
      showToast("Failed to load evacuation areas: " + err.message, "error");
    } finally {
      setEvacLoading(false);
    }
  }, [showToast, evacSearch, evacSortBy, evacSortDesc]);

  const loadHotlines = useCallback(async (page = 1, sortBy = hotlineSortBy, sortDesc = hotlineSortDesc) => {
    setHotlinesLoading(true);
    setHotlinesPage(page);
    try {
      const data = await fetchAllHotlines(page, HOTLINE_PAGE_SIZE, hotlineSearch, sortBy, sortDesc ? "DESC" : "ASC");
      if (Array.isArray(data)) {
        setHotlines(data);
        setHotlinesTotal(data.length);
      } else {
        setHotlines(data?.hotlines || []);
        setHotlinesTotal(data?.total || 0);
      }
    } catch (err) {
      showToast("Failed to load hotlines: " + err.message, "error");
    } finally {
      setHotlinesLoading(false);
    }
  }, [showToast, hotlineSearch, hotlineSortBy, hotlineSortDesc]);

  useEffect(() => {
    if (view === "users") loadUsers(1);
    if (view === "announcements") loadAnnouncements();
    if (view === "tcws") loadTcws();
    if (view === "evacuation") loadEvacuationAreas();
    if (view === "hotlines") loadHotlines();
    if (view !== "alerts") setStatusView(null);
  }, [view, loadUsers, loadAnnouncements, loadTcws, loadEvacuationAreas, loadHotlines]);

  useEffect(() => {
    if (view !== "users") return;
    const timer = setTimeout(() => loadUsers(1), 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    if (view !== "hotlines") return;
    const timer = setTimeout(() => loadHotlines(1), 300);
    return () => clearTimeout(timer);
  }, [hotlineSearch]);

  useEffect(() => {
    if (view !== "evacuation") return;
    const timer = setTimeout(() => loadEvacuationAreas(1), 300);
    return () => clearTimeout(timer);
  }, [evacSearch]);

  useEffect(() => {
    if (view !== "announcements") return;
    const timer = setTimeout(() => loadAnnouncements(1), 300);
    return () => clearTimeout(timer);
  }, [announceSearch]);

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

  function openEvacCreate() {
    setEditingEvac(null);
    setEvacForm({ name: "", description: "", latitude: "", longitude: "", capacity: "", status: "active" });
    setEvacFile(null);
    setEvacPreview(null);
    setEvacModal(true);
  }

  function openEvacEdit(area) {
    setEditingEvac(area);
    setEvacForm({
      name: area.name || "",
      description: area.description || "",
      latitude: area.latitude != null ? String(area.latitude) : "",
      longitude: area.longitude != null ? String(area.longitude) : "",
      capacity: area.capacity != null ? String(area.capacity) : "",
      status: area.status || "active",
    });
    setEvacFile(null);
    setEvacPreview(area.landmark_url || null);
    setEvacModal(true);
  }

  function closeEvacModal() {
    setEvacModal(false);
    setEditingEvac(null);
    setEvacFile(null);
    setEvacPreview(null);
  }

  function handleEvacFileSelect(e) {
    const f = e.target.files[0];
    if (!f) return;
    setEvacFile(f);
    const reader = new FileReader();
    reader.onload = () => setEvacPreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleEvacSave(e) {
    e.preventDefault();
    if (!evacForm.name.trim() || !evacForm.latitude || !evacForm.longitude) return;
    setEvacSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", evacForm.name.trim());
      formData.append("description", evacForm.description.trim());
      formData.append("latitude", evacForm.latitude);
      formData.append("longitude", evacForm.longitude);
      formData.append("status", evacForm.status);
      if (evacForm.capacity) formData.append("capacity", evacForm.capacity);

      if (evacFile) {
        formData.append("file", evacFile);
      } else if (evacForm.image_url) {
        formData.append("landmark_url", evacForm.image_url);
      }

      if (editingEvac) {
        await updateEvacuationArea(editingEvac.id, formData);
        showToast("Evacuation center updated.", "success");
      } else {
        await createEvacuationArea(formData);
        showToast("Evacuation center created.", "success");
      }
      closeEvacModal();
      loadEvacuationAreas();
    } catch (err) {
      showToast("Failed to save: " + err.message, "error");
    } finally {
      setEvacSaving(false);
    }
  }

  async function handleEvacDelete(id) {
    try {
      await deleteEvacuationArea(id);
      setEvacAreas((prev) => prev.filter((a) => a.id !== id));
      showToast("Evacuation center deleted.", "success");
    } catch (err) {
      showToast("Failed to delete: " + err.message, "error");
    } finally {
      setEvacDeleteConfirm(null);
    }
  }

  const HOTLINE_CATEGORIES = ["general", "police", "fire", "medical", "rescue"];

  function openHotlineCreate() {
    setEditingHotline(null);
    setHotlineForm({ name: "", phoneNumbers: [{ type: "", number: "" }], email: "", website: "", category: "general", is_active: true, sort_order: 0 });
    setHotlineModal(true);
  }

  function openHotlineEdit(hotline) {
    setEditingHotline(hotline);
    setHotlineForm({
      name: hotline.name || "",
      phoneNumbers: (hotline.phone_numbers || []).length > 0
        ? (hotline.phone_numbers || []).map((p) => ({ type: p.type || "", number: p.number || "" }))
        : [{ type: "", number: "" }],
      email: hotline.email || "",
      website: hotline.website || "",
      category: hotline.category || "general",
      is_active: hotline.is_active !== false,
      sort_order: hotline.sort_order || 0,
    });
    setHotlineModal(true);
  }

  function closeHotlineModal() {
    setHotlineModal(false);
    setEditingHotline(null);
  }

  function addPhoneRow() {
    setHotlineForm((prev) => ({ ...prev, phoneNumbers: [...prev.phoneNumbers, { type: "", number: "" }] }));
  }

  function removePhoneRow(index) {
    setHotlineForm((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index),
    }));
  }

  function updatePhoneRow(index, field, value) {
    setHotlineForm((prev) => {
      const updated = [...prev.phoneNumbers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, phoneNumbers: updated };
    });
  }

  async function handleHotlineSave(e) {
    e.preventDefault();
    if (!hotlineForm.name.trim()) return;
    setHotlineSaving(true);
    try {
      const validPhones = hotlineForm.phoneNumbers.filter((p) => p.number.trim());
      const formData = new FormData();
      formData.append("name", hotlineForm.name.trim());
      formData.append("phones", JSON.stringify(validPhones));
      formData.append("email", hotlineForm.email.trim());
      formData.append("website", hotlineForm.website.trim());
      formData.append("category", hotlineForm.category);
      formData.append("is_active", String(hotlineForm.is_active));
      formData.append("sort_order", String(hotlineForm.sort_order));

      if (editingHotline) {
        await updateHotline(editingHotline.id, formData);
        showToast("Hotline updated.", "success");
      } else {
        await createHotline(formData);
        showToast("Hotline created.", "success");
      }
      closeHotlineModal();
      loadHotlines();
    } catch (err) {
      showToast("Failed to save: " + err.message, "error");
    } finally {
      setHotlineSaving(false);
    }
  }

  async function handleHotlineToggle(hotline) {
    try {
      const formData = new FormData();
      formData.append("is_active", String(!hotline.is_active));
      await updateHotline(hotline.id, formData);
      setHotlines((prev) => prev.map((h) => (h.id === hotline.id ? { ...h, is_active: !h.is_active } : h)));
      showToast(hotline.is_active ? "Hotline hidden." : "Hotline published.", "success");
    } catch (err) {
      showToast("Failed to update: " + err.message, "error");
    }
  }

  async function handleHotlineDelete(id) {
    try {
      await deleteHotline(id);
      setHotlines((prev) => prev.filter((h) => h.id !== id));
      showToast("Hotline deleted.", "success");
    } catch (err) {
      showToast("Failed to delete: " + err.message, "error");
    } finally {
      setHotlineDeleteConfirm(null);
    }
  }

  const TITLE_MAX = 100;
  const SHORT_MAX = 200;
  const LONG_MAX = 2000;
  const titleLen = announceForm.title.length;
  const shortLen = announceForm.short_description.length;
  const longLen = announceForm.long_description.length;


  async function handleRoleChange(user, newRole) {
    if (user.id === session.user.id) return;
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

  const userColumns = useMemo(() => [
    {
      id: "user",
      header: "User",
      accessorKey: "full_name",
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === session?.user?.id;
        return (
          <div className="flex items-left flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{u.full_name || "\u2014"}</p>
              {isSelf && <span className="text-[10px] px-1.5 py-0.5 bg-shield-100 text-shield-700 rounded font-medium">You</span>}
            </div>
            <p className="text-xs text-gray-400">{u.email || "\u2014"}</p>
          </div>
        );
      },
    },
    {
      id: "barangay",
      header: "Barangay",
      accessorKey: "barangay",
      meta: { responsive: true },
      cell: ({ getValue }) => <span className="text-gray-600">{getValue() || "\u2014"}</span>,
    },
    {
      id: "blood",
      header: "Blood",
      accessorKey: "blood_type",
      meta: { responsive: true },
      cell: ({ getValue }) => {
        const val = getValue();
        return <span className={`text-xs font-medium ${val ? "text-gray-700" : "text-gray-300"}`}>{val || "\u2014"}</span>;
      },
    },
    {
      id: "specialNeeds",
      header: "Special Needs",
      accessorKey: "special_needs",
      meta: { responsive: true },
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span className="text-xs text-gray-300">\u2014</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {formatSpecialNeeds(val).map((label, i) => (
              <span key={i} className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {label.length > 20 ? label.slice(0, 20) + "\u2026" : label}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === session?.user?.id;
        if (isSelf) {
          return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-alert-100 text-alert-600">{u.role}</span>;
        }
        return (
          <select
            value={u.role}
            onChange={(e) => handleRoleChange(u, e.target.value)}
            className={`px-2 py-1 text-xs font-semibold rounded-full border cursor-pointer ${
              u.role === "admin"
                ? "bg-alert-100 text-alert-600 border-alert-200"
                : u.role === "rescuer"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            <option value="user">user</option>
            <option value="rescuer">rescuer</option>
            <option value="admin">admin</option>
          </select>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "is_active",
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === session?.user?.id;
        return (
          <button
            onClick={() => handleActiveToggle(u)}
            disabled={isSelf}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              isSelf
                ? "bg-green-100 text-green-700 cursor-not-allowed"
                : u.is_active
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
            title={isSelf ? "You cannot deactivate your own account" : u.is_active ? "Deactivate" : "Activate"}
          >
            {u.is_active ? "Active" : "Inactive"}
          </button>
        );
      },
    },
  ], [session]);

  const hotlineColumns = useMemo(() => [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => {
        const h = row.original;
        return (
          <div>
            <p className="font-medium text-gray-900 truncate max-w-[240px]">{h.name}</p>
            {h.email && <p className="text-xs text-gray-400 truncate max-w-[240px] mt-0.5">{h.email}</p>}
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      accessorKey: "category",
      meta: { responsive: true },
      cell: ({ getValue }) => (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize bg-gray-100 text-gray-600">
          {getValue()}
        </span>
      ),
    },
    {
      id: "phones",
      header: "Phone Numbers",
      meta: { responsive: true },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-gray-500">{(row.original.phone_numbers || []).length} number(s)</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "is_active",
      cell: ({ row }) => {
        const h = row.original;
        return (
          <button
            onClick={() => handleHotlineToggle(h)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              h.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {h.is_active ? "Active" : "Hidden"}
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const h = row.original;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openHotlineEdit(h)} className="text-xs text-shield-600 hover:text-shield-800 font-medium">
              Edit
            </button>
            <button onClick={() => setHotlineDeleteConfirm(h)} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Delete
            </button>
          </div>
        );
      },
    },
  ], []);

  const evacColumns = useMemo(() => [
    {
      id: "landmark",
      header: "Landmark",
      meta: { responsive: true },
      enableSorting: false,
      cell: ({ row }) => {
        const a = row.original;
        return a.landmark_url ? (
          <img src={a.landmark_url} className="w-12 h-12 rounded-lg object-cover bg-gray-100" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      },
    },
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div>
            <p className="font-medium text-gray-900 truncate max-w-[200px]">{a.name}</p>
            <p className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">
              {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
            </p>
          </div>
        );
      },
    },
    {
      id: "capacity",
      header: "Capacity",
      accessorKey: "capacity",
      meta: { responsive: true },
      cell: ({ getValue }) => {
        const val = getValue();
        return <span className="text-gray-600">{val != null ? val.toLocaleString() : "\u2014"}</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const status = getValue();
        return (
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            status === "active" ? "bg-green-100 text-green-700" :
            status === "inactive" ? "bg-gray-100 text-gray-500" :
            "bg-yellow-100 text-yellow-700"
          }`}>
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEvacEdit(a)} className="text-xs text-shield-600 hover:text-shield-800 font-medium">
              Edit
            </button>
            <button onClick={() => setEvacDeleteConfirm(a)} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Delete
            </button>
          </div>
        );
      },
    },
  ], []);

  const announceColumns = useMemo(() => [
    {
      id: "media",
      header: "Media",
      meta: { responsive: true },
      enableSorting: false,
      cell: ({ row }) => {
        const a = row.original;
        return a.image_url ? (
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
        );
      },
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div>
            <p className="font-medium text-gray-900 truncate max-w-[240px]">{a.title}</p>
            <p className="text-xs text-gray-400 truncate max-w-[240px] mt-0.5">{a.description}</p>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      meta: { responsive: true },
      cell: ({ getValue }) => {
        const type = getValue();
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${type === "video" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
            {type}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "is_active",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <button
            onClick={() => handleToggleActive(a)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              a.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {a.is_active ? "Active" : "Hidden"}
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEditModal(a)} className="text-xs text-shield-600 hover:text-shield-800 font-medium">
              Edit
            </button>
            <button onClick={() => handleDeleteClick(a)} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Delete
            </button>
          </div>
        );
      },
    },
  ], []);

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
            <AnalyticsDashboard />
          )}

          {view === "users" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage roles and account status.</p>
                </div>
                <button onClick={() => loadUsers(1)} disabled={usersLoading} className="btn-outline px-4 py-2 text-sm">
                  {usersLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="mb-4">
                <div className="relative max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, or barangay..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>

              <DataTable
                columns={userColumns}
                data={users}
                totalCount={usersTotal}
                pageIndex={usersPage - 1}
                pageSize={USERS_PER_PAGE}
                isLoading={usersLoading}
                serverSide
                onPageChange={loadUsers}
                onSortChange={handleUserSortChange}
                emptyMessage="No users found."
              />
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

              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={announceSearch}
                    onChange={(e) => setAnnounceSearch(e.target.value)}
                    placeholder="Search by title or description..."
                    aria-label="Search announcements"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>

              <DataTable
                columns={announceColumns}
                data={announcements}
                totalCount={announceTotal}
                pageIndex={announcePage - 1}
                pageSize={ANNOUNCE_PAGE_SIZE}
                isLoading={announcementsLoading}
                serverSide
                onPageChange={(p) => loadAnnouncements(p)}
                onSortChange={handleAnnounceSortChange}
                emptyMessage="No announcements yet. Create your first announcement to start."
              />

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

          {view === "tide" && <TideView isAdmin={true} />}

          {view === "waterlevel" && <WaterLevelView />}

          {view === "rescuers" && <AdminRescuersView />}

          {view === "alerts" && !statusView && (
            <AdminAlertsView onSelectUser={(userId) => setStatusView(userId)} />
          )}

          {view === "alerts" && statusView && (
            <AdminAlertDetail userId={statusView} onBack={() => setStatusView(null)} />
          )}

          {view === "hotlines" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Emergency Hotlines</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage emergency hotline numbers shown to all users.</p>
                </div>
                <button onClick={openHotlineCreate} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New Hotline
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={hotlineSearch}
                    onChange={(e) => setHotlineSearch(e.target.value)}
                    placeholder="Search by name, email, or category..."
                    aria-label="Search hotlines"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>

              <DataTable
                columns={hotlineColumns}
                data={hotlines}
                totalCount={hotlinesTotal}
                pageIndex={hotlinesPage - 1}
                pageSize={HOTLINE_PAGE_SIZE}
                isLoading={hotlinesLoading}
                serverSide
                onPageChange={(p) => loadHotlines(p)}
                onSortChange={handleHotlineSortChange}
                emptyMessage='No hotlines yet. Click "New Hotline" to add your first emergency hotline.'
              />

              {hotlineModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={closeHotlineModal}>
                  <form
                    onSubmit={handleHotlineSave}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
                  >
                    <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">
                        {editingHotline ? "Edit Hotline" : "New Hotline"}
                      </h2>
                      <button type="button" onClick={closeHotlineModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="px-6 py-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Name</label>
                        <input
                          type="text"
                          value={hotlineForm.name}
                          onChange={(e) => setHotlineForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="MDRRMO Tagkawayan"
                          required
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Category</label>
                          <select
                            value={hotlineForm.category}
                            onChange={(e) => setHotlineForm((p) => ({ ...p, category: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm appearance-none bg-white bg-no-repeat bg-[center_right_0.5rem] focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundSize: "1.25rem" }}
                          >
                            {HOTLINE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Sort Order</label>
                          <input
                            type="number"
                            min="0"
                            value={hotlineForm.sort_order}
                            onChange={(e) => setHotlineForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                            placeholder="1"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone Numbers</label>
                          <button type="button" onClick={addPhoneRow} className="text-[10px] text-shield-600 font-semibold hover:underline flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Number
                          </button>
                        </div>
                        <div className="space-y-2">
                          {hotlineForm.phoneNumbers.map((ph, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={ph.type}
                                onChange={(e) => updatePhoneRow(i, "type", e.target.value)}
                                placeholder="Label (e.g. Globe)"
                                className="w-28 rounded-lg border border-gray-200 px-2.5 py-2 text-xs focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                              />
                              <input
                                type="text"
                                value={ph.number}
                                onChange={(e) => updatePhoneRow(i, "number", e.target.value)}
                                placeholder="0917-827-4878"
                                className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                              />
                              {hotlineForm.phoneNumbers.length > 1 && (
                                <button type="button" onClick={() => removePhoneRow(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Email</label>
                        <input
                          type="email"
                          value={hotlineForm.email}
                          onChange={(e) => setHotlineForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="tkqoperationsandwarningsection@gmail.com"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Website / Social Media</label>
                        <input
                          type="text"
                          value={hotlineForm.website}
                          onChange={(e) => setHotlineForm((p) => ({ ...p, website: e.target.value }))}
                          placeholder="fb.com/TagkawayanFireStation"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                      <button type="button" onClick={closeHotlineModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={hotlineSaving || !hotlineForm.name.trim()}
                        className="btn-primary py-2 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {hotlineSaving ? "Saving..." : editingHotline ? "Save Changes" : "Create Hotline"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {hotlineDeleteConfirm && (
                <ConfirmDialog
                  title="Delete Hotline"
                  message={`Permanently delete "${hotlineDeleteConfirm.name}"? This action cannot be undone.`}
                  confirmLabel="Delete"
                  confirmClass="bg-red-600 hover:bg-red-700"
                  onConfirm={() => handleHotlineDelete(hotlineDeleteConfirm.id)}
                  onCancel={() => setHotlineDeleteConfirm(null)}
                />
              )}
            </>
          )}

          {view === "evacuation" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Evacuation Centers</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage evacuation center locations and details.</p>
                </div>
                <button onClick={openEvacCreate} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New Center
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={evacSearch}
                    onChange={(e) => setEvacSearch(e.target.value)}
                    placeholder="Search by name or description..."
                    aria-label="Search evacuation centers"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>

              <DataTable
                columns={evacColumns}
                data={evacAreas}
                totalCount={evacTotal}
                pageIndex={evacPage - 1}
                pageSize={EVAC_PAGE_SIZE}
                isLoading={evacLoading}
                serverSide
                onPageChange={(p) => loadEvacuationAreas(p)}
                onSortChange={handleEvacSortChange}
                emptyMessage='No evacuation centers yet. Click "New Center" to add your first evacuation center.'
              />

              {evacModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={closeEvacModal}>
                  <form
                    onSubmit={handleEvacSave}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
                  >
                    <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">
                        {editingEvac ? "Edit Evacuation Center" : "New Evacuation Center"}
                      </h2>
                      <button type="button" onClick={closeEvacModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="px-6 py-4 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Name</label>
                        <input
                          type="text"
                          value={evacForm.name}
                          onChange={(e) => setEvacForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Barangay Hall Evacuation Center"
                          required
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Description</label>
                        <textarea
                          value={evacForm.description}
                          onChange={(e) => setEvacForm((p) => ({ ...p, description: e.target.value }))}
                          rows={2}
                          placeholder="Optional description or location details..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={evacForm.latitude}
                            onChange={(e) => setEvacForm((p) => ({ ...p, latitude: e.target.value }))}
                            placeholder="14.1234"
                            required
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={evacForm.longitude}
                            onChange={(e) => setEvacForm((p) => ({ ...p, longitude: e.target.value }))}
                            placeholder="121.5678"
                            required
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Capacity</label>
                          <input
                            type="number"
                            min="0"
                            value={evacForm.capacity}
                            onChange={(e) => setEvacForm((p) => ({ ...p, capacity: e.target.value }))}
                            placeholder="500"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Status</label>
                          <select
                            value={evacForm.status}
                            onChange={(e) => setEvacForm((p) => ({ ...p, status: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm appearance-none bg-white bg-no-repeat bg-[center_right_0.5rem] focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundSize: "1.25rem" }}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Landmark Image</label>
                        <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-shield-400 hover:bg-shield-50/30 transition-colors">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-xs text-gray-500 font-medium">Drop a file or click to browse</span>
                          <span className="text-[10px] text-gray-400">JPG, PNG, WebP up to 5MB</span>
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleEvacFileSelect} className="hidden" />
                        </label>
                        {evacFile && (
                          <p className="text-[11px] text-shield-600 font-medium mt-1.5 ml-1">{evacFile.name} ({(evacFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                        )}
                      </div>

                      {!evacFile && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Or paste image URL</label>
                          <input
                            type="url"
                            value={evacForm.image_url || ""}
                            onChange={(e) => setEvacForm((p) => ({ ...p, image_url: e.target.value }))}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                          />
                        </div>
                      )}

                      {evacPreview && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Preview</label>
                          <img src={evacPreview} className="w-full h-40 rounded-lg object-cover bg-gray-100" alt="Preview" />
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                      <button type="button" onClick={closeEvacModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={evacSaving || !evacForm.name.trim() || !evacForm.latitude || !evacForm.longitude}
                        className="btn-primary py-2 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {evacSaving ? "Saving..." : editingEvac ? "Save Changes" : "Create Center"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {evacDeleteConfirm && (
                <ConfirmDialog
                  title="Delete Evacuation Center"
                  message={`Permanently delete "${evacDeleteConfirm.name}"? This action cannot be undone.`}
                  confirmLabel="Delete"
                  confirmClass="bg-red-600 hover:bg-red-700"
                  onConfirm={() => handleEvacDelete(evacDeleteConfirm.id)}
                  onCancel={() => setEvacDeleteConfirm(null)}
                />
              )}
            </>
          )}

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
