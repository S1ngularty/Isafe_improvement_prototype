import { useState, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import FamilySetup from "./FamilySetup";
import MemberInfoModal from "./MemberInfoModal";
import useFamilyAlerts from "../hooks/useFamilyAlerts";

const STATUS_CONFIG = {
  safe: { dot: "bg-green-500", bg: "bg-green-50", border: "border-green-300", text: "text-green-800", label: "Safe" },
  help: { dot: "bg-yellow-500", bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", label: "Help" },
  emergency: { dot: "bg-red-500", bg: "bg-red-50", border: "border-red-300", text: "text-red-800", label: "Emergency" },
};

const STATUS_COLORS = {
  safe: "#22c55e",
  help: "#eab308",
  emergency: "#ef4444",
};

const ROLE_BADGES = {
  head: "bg-shield-600 text-white",
  co_head: "bg-green-600 text-white",
  member: null,
};

function AvatarCircle({ person, status, size = 32 }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.safe;
  const initial = (person.full_name || "?")[0].toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);

  if (person.avatar_url && !imgFailed) {
    return (
      <div className="shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size, border: "2px solid " + color }}>
        <img src={person.avatar_url} alt="" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-full overflow-hidden flex items-center justify-center" style={{ width: size, height: size, border: "2px solid " + color, backgroundColor: color }}>
      <span className="font-bold text-white leading-none select-none" style={{ fontSize: size * 0.4 + "px" }}>{initial}</span>
    </div>
  );
}

const PERIOD_TABS = [
  { value: 7, label: "7d" },
  { value: 15, label: "15d" },
  { value: 30, label: "30d" },
];

function ShieldCheck() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BellAlert() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function timeAgo(isoString) {
  if (!isoString) return null;
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

function groupHistoryByDate(items) {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;

  for (const item of items) {
    const d = new Date(item.created_at);
    const dateKey = d.toLocaleDateString();

    if (dateKey !== currentDate) {
      currentDate = dateKey;
      currentGroup = { dateLabel: getDateLabel(d), items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(item);
  }

  return groups;
}

function getDateLabel(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

const STATUS_TABS = [
  { key: "all", label: "All", icon: UsersIcon, activeBg: "bg-gray-900", activeText: "text-white", inactiveBg: "bg-gray-100", inactiveText: "text-gray-500" },
  { key: "safe", label: "Safe", icon: ShieldCheck, activeBg: "bg-green-600", activeText: "text-white", inactiveBg: "bg-green-50", inactiveText: "text-green-700" },
  { key: "help", label: "Help", icon: ExclamationIcon, activeBg: "bg-yellow-500", activeText: "text-white", inactiveBg: "bg-yellow-50", inactiveText: "text-yellow-700" },
  { key: "emergency", label: "Emergency", icon: BellAlert, activeBg: "bg-red-600", activeText: "text-white", inactiveBg: "bg-red-50", inactiveText: "text-red-700" },
];

export default function AlertsView() {
  const { session, refreshProfile } = useAuth();
  const userId = session?.user?.id;
  const { currentStatus, history, period, loading, error, changePeriod, refresh } = useFamilyAlerts(userId);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState(null);

  const members = currentStatus?.members || [];

  const counts = useMemo(() => {
    const c = { all: members.length, safe: 0, help: 0, emergency: 0 };
    for (const m of members) {
      if (c[m.status] !== undefined) c[m.status] += 1;
    }
    return c;
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (statusFilter === "all") return members;
    return members.filter((m) => m.status === statusFilter);
  }, [members, statusFilter]);

  const handleKeyDown = useCallback(
    (e, currentIdx) => {
      let nextIdx = currentIdx;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIdx = (currentIdx + 1) % STATUS_TABS.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIdx = (currentIdx - 1 + STATUS_TABS.length) % STATUS_TABS.length;
      }
      if (nextIdx !== currentIdx) {
        setStatusFilter(STATUS_TABS[nextIdx].key);
        document.getElementById(`status-tab-${STATUS_TABS[nextIdx].key}`)?.focus();
      }
    },
    []
  );

  const historyGroups = useMemo(() => groupHistoryByDate(history), [history]);

  if (!session) {
    return (
      <div className="w-full border border-gray-200 rounded-lg py-10 text-center text-sm text-gray-400">
        Sign in to view alerts
      </div>
    );
  }

  if (!currentStatus?.family_id) {
    return (
      <div className="w-full">
        <div className="border border-gray-200 rounded-lg p-5 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
            <UsersIcon />
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-0.5">No Family Yet</p>
          <p className="text-xs text-gray-400 mb-3">Create or join a family to see member alerts</p>
          <FamilySetup onDone={() => { refreshProfile(); refresh(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-shield-50 flex items-center justify-center shrink-0">
            <BellAlert />
          </div>
          <h2 className="text-base font-bold text-gray-900 truncate">Alerts</h2>
          <span className="text-xs text-gray-400 truncate">&middot; {currentStatus.family_name} &middot; {members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex bg-gray-100 rounded-md p-0.5 gap-0.5 shrink-0" role="tablist" aria-label="Time period">
          {PERIOD_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => changePeriod(value)}
              role="tab"
              aria-selected={period === value}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                period === value
                  ? "bg-white text-shield-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Family Status Overview</p>
        </div>

        <div className="px-4 py-2.5 border-b border-gray-50">
          <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Filter by status">
            {STATUS_TABS.map(({ key, label, icon: Icon, activeBg, activeText, inactiveBg, inactiveText }, idx) => {
              const isActive = statusFilter === key;
              const count = counts[key];

              return (
                <button
                  key={key}
                  id={`status-tab-${key}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`status-panel-${key}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setStatusFilter(key)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    isActive ? `${activeBg} ${activeText} shadow-sm` : `${inactiveBg} ${inactiveText} hover:opacity-80`
                  }`}
                >
                  <span className="w-3.5 h-3.5 shrink-0"><Icon /></span>
                  <span>{label}</span>
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive ? "bg-white/20" : "bg-white/70"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-gray-50" role="tabpanel" id={`status-panel-${statusFilter}`} aria-labelledby={`status-tab-${statusFilter}`}>
          {filteredMembers.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-400">No members with this status</p>
            </div>
          ) : (
            filteredMembers.map((m) => {
              const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.safe;
              const badgeClass = ROLE_BADGES[m.family_role];
              const roleLabel = m.family_role === "head" ? "Head" : m.family_role === "co_head" ? "Co-Head" : null;
              const isSelf = m.id === userId;

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-colors text-left group"
                  aria-label={`${m.full_name || "Unnamed"} - ${cfg.label}`}
                >
                  <AvatarCircle person={m} status={m.status} size={32} />

                  <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.full_name || "Unnamed"}</p>
                    {isSelf && <span className="text-[10px] text-gray-400 font-medium shrink-0">(you)</span>}
                    {roleLabel && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 leading-none ${badgeClass}`}>
                        {roleLabel}
                      </span>
                    )}
                    <span className="hidden sm:inline text-[11px] text-gray-400 truncate">
                      &middot; {timeAgo(m.last_seen_at) || "never"}
                      {m.lat != null && m.lng != null && ` · ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`}
                    </span>
                  </div>

                  <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>

                  <svg className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
          <ClockIcon />
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Recent Activity</p>
        </div>

        {loading ? (
          <div className="px-4 py-8 flex flex-col items-center gap-2" role="status">
            <svg className="w-5 h-5 animate-spin text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-xs text-gray-400">Loading activity...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={refresh} className="mt-1.5 text-xs text-shield-600 font-semibold hover:underline">Retry</button>
          </div>
        ) : history.length === 0 ? (
          <div className="px-4 py-8 flex flex-col items-center gap-1.5">
            <ClockIcon />
            <p className="text-xs text-gray-400">No recent activity</p>
            <p className="text-[11px] text-gray-400">Status changes will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50" role="list" aria-label="Status change activity">
            {historyGroups.map((group) => (
              <div key={group.dateLabel}>
                <div className="px-4 py-1.5 bg-gray-50/50 border-b border-gray-50">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{group.dateLabel}</p>
                </div>
                {group.items.map((item) => {
                  const fromCfg = item.previous_status ? STATUS_CONFIG[item.previous_status] : null;
                  const toCfg = STATUS_CONFIG[item.new_status] || STATUS_CONFIG.safe;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedMember(members.find((m) => m.id === item.user_id) || { id: item.user_id })}
                      className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-colors text-left group"
                      role="listitem"
                      aria-label={`${item.full_name || "Someone"} changed to ${toCfg.label}`}
                    >
                      <AvatarCircle person={item} status={item.new_status} size={32} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          <span className="font-semibold">{item.full_name || "Someone"}</span>
                          {item.previous_status ? (
                            <span>
                              {" "}
                              <span className={`font-semibold ${fromCfg ? fromCfg.text : "text-gray-500"}`}>{fromCfg ? fromCfg.label : item.previous_status}</span>
                              <span className="text-gray-500 mx-0.5">&rarr;</span>
                              <span className={`font-semibold ${toCfg.text}`}>{toCfg.label}</span>
                            </span>
                          ) : (
                            <span>
                              {" "}
                              <span className={`font-semibold ${toCfg.text}`}>{toCfg.label}</span>
                            </span>
                          )}
                        </p>
                        <span className="text-[11px] text-gray-400">{formatDateTime(item.created_at)}</span>
                      </div>

                      <svg className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberInfoModal
          memberId={selectedMember.id}
          memberData={selectedMember.full_name ? selectedMember : null}
          currentUserId={userId}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
