import { useState, useEffect, useMemo, useCallback } from "react";
import MapView from "./MapView";
import UserMarker from "./UserMarker";
import { fetchUserProfile, fetchStatusHistory, updateUserStatus } from "../services/adminStatus";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

const STATUS_COLORS = {
  safe: { hex: "#22c55e", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  help: { hex: "#eab308", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500" },
  emergency: { hex: "#ef4444", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
};

const STATUS_ACTIONS = [
  { key: "safe", label: "Resolve (Mark Safe)", bg: "bg-green-600 hover:bg-green-700", icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>) },
  { key: "help", label: "Mark Help Needed", bg: "bg-yellow-500 hover:bg-yellow-600", icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
  { key: "emergency", label: "Mark Emergency", bg: "bg-red-600 hover:bg-red-700", icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>) },
];

function AvatarCircle({ user, size = 64 }) {
  const color = (STATUS_COLORS[user.status] || STATUS_COLORS.safe).hex;
  const initial = (user.full_name || "?")[0].toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);

  if (user.avatar_url && !imgFailed) {
    return (
      <div className="shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size, border: "3px solid " + color }}>
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-full overflow-hidden flex items-center justify-center" style={{ width: size, height: size, border: "3px solid " + color, backgroundColor: color }}>
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

function formatDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const ACCORDION_ITEMS = [
  {
    key: "contact",
    label: "Contact",
    fields: [
      { key: "phone_number", label: "Phone" },
      { key: "barangay", label: "Barangay" },
      { key: "street_address", label: "Address" },
    ],
  },
  {
    key: "medical",
    label: "Medical",
    fields: [
      { key: "blood_type", label: "Blood Type" },
      { key: "medical_notes", label: "Medical Notes" },
      { key: "special_needs", label: "Special Needs", altKey: "special_needs_other" },
    ],
  },
  {
    key: "emergency_contact",
    label: "Emergency Contact",
    fields: [
      { key: "external_name", label: "Name" },
      { key: "relationship", label: "Relationship" },
      { key: "external_phone", label: "Phone" },
    ],
  },
  {
    key: "demographics",
    label: "Demographics",
    fields: [
      { key: "gender", label: "Gender" },
      { key: "date_of_birth", label: "Date of Birth", formatter: formatDate },
      { key: "household_size", label: "Household Size" },
    ],
  },
];

export default function AdminAlertDetail({ userId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSavedMsg(null);
    setNote("");

    Promise.allSettled([
      fetchUserProfile(userId),
      fetchStatusHistory(userId),
    ]).then(([profileRes, historyRes]) => {
      if (!active) return;
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (historyRes.status === "fulfilled") setHistory(historyRes.value?.items || []);
      setLoading(false);
    });

    return () => { active = false; };
  }, [userId]);

  const refreshLive = useCallback(async () => {
    try {
      const [profileRes, historyRes] = await Promise.allSettled([
        fetchUserProfile(userId),
        fetchStatusHistory(userId),
      ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (historyRes.status === "fulfilled") setHistory(historyRes.value?.items || []);
    } catch {
      // ignore
    }
  }, [userId]);

  useRealtimeRefresh(
    { table: "status_history", event: "*", filter: `user_id=eq.${userId}`, channelName: `admin-detail-status-${userId}` },
    refreshLive,
  );

  useRealtimeRefresh(
    { table: "rescue_assignments", event: "*", filter: `target_user_id=eq.${userId}`, channelName: `admin-detail-rescue-${userId}` },
    refreshLive,
  );

  const handleStatusChange = async (newStatus) => {
    if (saving || !profile) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      await updateUserStatus(userId, newStatus, note.trim() || null);
      setSavedMsg({ type: "success", text: "Status updated successfully." });
      setProfile((prev) => ({ ...prev, status: newStatus }));
      const histRes = await fetchStatusHistory(userId);
      setHistory(histRes?.items || []);
      setNote("");
    } catch (err) {
      setSavedMsg({ type: "error", text: err.message || "Failed to update status." });
    } finally {
      setSaving(false);
    }
  };

  const groupedHistory = useMemo(() => {
    const groups = [];
    let currentKey = null;
    let currentGroup = null;
    for (const item of history) {
      const d = new Date(item.created_at);
      const key = d.toLocaleDateString();
      if (key !== currentKey) {
        currentKey = key;
        const today = new Date();
        const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const yesterday = new Date(todayStr);
        yesterday.setDate(yesterday.getDate() - 1);
        const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        let label;
        if (itemDate.getTime() === todayStr.getTime()) label = "Today";
        else if (itemDate.getTime() === yesterday.getTime()) label = "Yesterday";
        else label = d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
        currentGroup = { label, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    }
    return groups;
  }, [history]);

  if (loading) {
    return (
      <div className="w-full border border-gray-200 rounded-lg py-16 flex flex-col items-center gap-2">
        <svg className="w-6 h-6 animate-spin text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <p className="text-xs text-gray-500">Loading user details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full border border-gray-200 rounded-lg py-12 text-center">
        <p className="text-sm text-gray-500">User not found</p>
        <button onClick={onBack} className="mt-2 text-xs text-shield-600 font-semibold hover:underline">Back to Status Board</button>
      </div>
    );
  }

  const colors = STATUS_COLORS[profile.status] || STATUS_COLORS.safe;
  const hasLocation = profile.lat != null && profile.lng != null;

  return (
    <div className="w-full space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500" aria-label="Go back to status board">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m7-7l-7 7 7 7" />
        </svg>
        Back to Status Board
      </button>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className={`px-5 py-4 ${colors.bg} border-b ${colors.border}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <AvatarCircle user={profile} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{profile.full_name || "Unnamed"}</h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>{profile.status}</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1 text-xs text-gray-500 flex-wrap">
                {profile.family_role && <span className="capitalize">{profile.family_role}</span>}
                {profile.family_name && <span>&middot; {profile.family_name}</span>}
                {profile.barangay && <span>&middot; {profile.barangay}</span>}
                {profile.email && <span>&middot; {profile.email}</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">Last seen: {timeAgo(profile.last_seen_at)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200">
          <div className="p-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Location</p>
            {hasLocation ? (
              <div className="rounded-lg overflow-hidden border border-gray-200 h-64 lg:h-72" aria-label={`User location map at ${profile.lat.toFixed(4)}, ${profile.lng.toFixed(4)}`}>
                <MapView center={[profile.lat, profile.lng]} zoom={15} className="h-full w-full">
                  <UserMarker
                    lat={profile.lat}
                    lng={profile.lng}
                    status={profile.status}
                    name={profile.full_name}
                    isSelf={false}
                    avatarUrl={profile.avatar_url}
                  />
                </MapView>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 h-64 lg:h-72 flex items-center justify-center">
                <p className="text-xs text-gray-500">No location data available</p>
              </div>
            )}
            {hasLocation && (
              <p className="text-[11px] text-gray-500 mt-1.5">{profile.lat.toFixed(5)}, {profile.lng.toFixed(5)}</p>
            )}
          </div>

          <div className="p-4 space-y-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Profile Information</p>
            {ACCORDION_ITEMS.map((section) => {
              const hasData = section.fields.some((f) => {
                const val = profile[f.key];
                return val !== null && val !== undefined && val !== "";
              });
              if (!hasData) return null;

              return (
                <div key={section.key} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">{section.label}</p>
                  <div className="space-y-1.5">
                    {section.fields.map((f) => {
                      const val = profile[f.altKey] || profile[f.key];
                      if (val === null || val === undefined || val === "") return null;
                      const display = f.formatter ? f.formatter(val) : String(val);
                      return (
                        <div key={f.key} className="flex items-baseline gap-1.5">
                          <span className="text-[11px] text-gray-500 shrink-0">{f.label}:</span>
                          <span className="text-xs font-medium text-gray-900 capitalize">{display}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-200 px-5 py-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Status History</p>
          {history.length === 0 ? (
            <p className="text-xs text-gray-500">No status history recorded</p>
          ) : (
            <div className="space-y-2">
              {groupedHistory.map((group) => (
                <div key={group.label}>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1">{group.label}</p>
                  {group.items.map((item) => {
                    const fromColors = item.previous_status ? STATUS_COLORS[item.previous_status] : null;
                    const toColors = STATUS_COLORS[item.new_status] || STATUS_COLORS.safe;
                    return (
                      <div key={item.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                        {item.previous_status ? (
                          <div className="flex items-center gap-1 mt-1 shrink-0">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${fromColors ? fromColors.dot : "bg-gray-300"}`} />
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toColors.dot}`} />
                          </div>
                        ) : (
                          <div className={`w-2.5 h-2.5 mt-1.5 rounded-full shrink-0 ${toColors.dot}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-900">
                            {item.previous_status ? (
                              <span>
                                <span className={`font-semibold ${fromColors ? fromColors.text : "text-gray-500"}`}>{fromColors ? fromColors.label : item.previous_status}</span>
                                <span className="text-gray-500 mx-0.5">&rarr;</span>
                                <span className={`font-semibold ${toColors.text}`}>{toColors.label}</span>
                              </span>
                            ) : (
                              <span className={`font-semibold ${toColors.text}`}>{toColors.label}</span>
                            )}
                          </p>
                          {item.resolution_note && (
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate">{item.resolution_note}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500 shrink-0">{formatDateTime(item.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-4 space-y-3">
          {savedMsg && (
            <div className={`text-xs font-medium px-3 py-2 rounded-md ${savedMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`} role="alert" aria-live="polite">
              {savedMsg.text}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Resolution Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter a note about this status change..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none transition-colors resize-none"
              disabled={saving}
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {STATUS_ACTIONS.map(({ key, label, bg, icon }) => {
              const isCurrent = profile.status === key;
              return (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  disabled={saving || isCurrent}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-shield-500 ${bg} ${
                    isCurrent || saving ? "opacity-50 cursor-not-allowed" : "shadow-sm hover:shadow-md active:scale-[0.98]"
                  }`}
                  aria-label={`${label}${isCurrent ? " - currently active" : ""}`}
                >
                  {icon}
                  {label}
                  {isCurrent && <span className="text-[10px] opacity-80">(current)</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
