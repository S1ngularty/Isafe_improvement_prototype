import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { updateStatus } from "../services/location";
import StatusTimerWidget from "./StatusTimerWidget";

const STATUS_CONFIG = {
  safe: {
    label: "Safe",
    bg: "bg-green-600",
    ring: "ring-green-500/40",
    dot: "bg-green-400",
    toastType: "success",
    toastMsg: "Marked as safe.",
  },
  help: {
    label: "Help",
    bg: "bg-amber-500",
    ring: "ring-amber-400/40",
    dot: "bg-amber-300",
    toastType: "info",
    toastMsg: "Help request sent.",
  },
  emergency: {
    label: "SOS",
    bg: "bg-red-600",
    ring: "ring-red-500/40",
    dot: "bg-red-400",
    toastType: "error",
    toastMsg: "Emergency alert sent.",
  },
};

export default function StatusWidget() {
  const { session, profile, refreshProfile, role } = useAuth();
  const { showToast } = useToast();

  if (role === "admin") return null;

  const [expanded, setExpanded] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const containerRef = useRef(null);

  const isAuthenticated = !!session;
  const status = profile?.status || "safe";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.safe;

  useEffect(() => {
    if (!expanded) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  function handleStatusClick(newStatus) {
    if (!isAuthenticated) return;
    if (pendingStatus) return;
    if (newStatus === status) {
      setExpanded(false);
      return;
    }
    const dur = newStatus === "safe" ? 3 : newStatus === "emergency" ? 3 : 5;
    setPendingStatus({ newStatus, previousStatus: status, duration: dur });
    setExpanded(false);
  }

  async function handleConfirm() {
    const s = pendingStatus;
    setPendingStatus(null);
    try {
      await updateStatus(s.newStatus);
      refreshProfile();
      const c = STATUS_CONFIG[s.newStatus] || STATUS_CONFIG.help;
      showToast(c.toastMsg, c.toastType, 4000);
    } catch {
      showToast("Failed to update status.", "error");
    }
  }

  function handleCancel() {
    setPendingStatus(null);
  }

  const isLightCard = isAuthenticated && status === "help";

  return (
    <div ref={containerRef} className="fixed bottom-8 right-4 z-[1000] select-none">
      {pendingStatus && (
        <div className="absolute bottom-full right-0 mb-2 w-80">
          <StatusTimerWidget
            newStatus={pendingStatus.newStatus}
            previousStatus={pendingStatus.previousStatus}
            duration={pendingStatus.duration}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </div>
      )}
      {expanded && !pendingStatus && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Change Status
            </span>
          </div>
          {["safe", "help", "emergency"].map((s) => {
            const sc = STATUS_CONFIG[s];
            const active = isAuthenticated && status === s;
            return (
              <button
                key={s}
                onClick={() => handleStatusClick(s)}
                disabled={!isAuthenticated}
                className={`w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold transition-colors ${
                  !isAuthenticated
                    ? "opacity-40 cursor-not-allowed"
                    : active
                      ? "bg-gray-50 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className={`w-3 h-3 rounded-full shrink-0 ${sc.dot}`} />
                <span>{sc.label}</span>
                {active && (
                  <svg className="w-4 h-4 ml-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
      <StatusCard
        status={status}
        cfg={cfg}
        isAuthenticated={isAuthenticated}
        isLight={isLightCard}
        expanded={expanded}
        pending={!!pendingStatus}
        onClick={() => {
          if (!isAuthenticated || pendingStatus) return;
          setExpanded((v) => !v);
        }}
      />
    </div>
  );
}

function StatusCard({ status, cfg, isAuthenticated, isLight, expanded, pending, onClick }) {
  const bg = isAuthenticated ? cfg.bg : "bg-gray-400";
  const ring = isAuthenticated ? cfg.ring : "";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const mutedColor = isLight ? "text-gray-800/70" : "text-white/75";

  return (
    <button
      onClick={onClick}
      disabled={!isAuthenticated || pending}
      className={`${bg} ${textColor} ${ring} ${pending ? "" : "hover:ring-4"} rounded-2xl shadow-lg \
        px-4 py-3 min-w-[148px] flex flex-col items-start gap-0.5 \
        transition-all hover:shadow-xl active:scale-[0.97] \
        ${!isAuthenticated || pending ? "cursor-default hover:shadow-lg" : "cursor-pointer"}`}
      title={pending ? "Countdown in progress" : isAuthenticated ? "Click to change status" : "Sign in to set status"}
    >
      <div className="flex items-center justify-between w-full">
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.15em] ${mutedColor}`}>
          Status
        </span>
        {isAuthenticated && !pending && (
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""} ${mutedColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {pending && (
          <svg className={`w-3.5 h-3.5 animate-spin ${mutedColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
      </div>
      <span className="text-xl font-extrabold tracking-tight leading-tight">
        {isAuthenticated ? cfg.label : "Sign In"}
      </span>
    </button>
  );
}
