import { useState, useEffect, useRef } from "react";

const STATUS_STYLES = {
  safe: {
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    border: "border-l-green-500",
    bg: "bg-green-50",
    label: "Safe",
  },
  help: {
    icon: (
      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    border: "border-l-yellow-500",
    bg: "bg-yellow-50",
    label: "Help",
  },
  emergency: {
    icon: (
      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    border: "border-l-red-500",
    bg: "bg-red-50",
    label: "Emergency",
  },
};

function timeAgo(isoString) {
  if (!isoString) return "";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function AlertPopup({ alert, memberName, onDismiss, onClick }) {
  const [visible, setVisible] = useState(false);
  const [removing, setRemoving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 10000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [alert?.id]);

  if (!alert) return null;

  const style = STATUS_STYLES[alert.newStatus] || STATUS_STYLES.help;

  function handleDismiss() {
    setRemoving(true);
    setTimeout(() => {
      if (onDismiss) onDismiss(alert.id);
    }, 300);
  }

  function handleClick() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (onClick) onClick(alert);
    handleDismiss();
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-20 right-4 z-[9999] w-80
        transition-all duration-300 ease-out
        ${visible && !removing ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <div className={`rounded-xl shadow-xl border border-gray-200 ${style.bg} ${style.border} border-l-4 overflow-hidden`}>
        <div className="p-3">
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 mt-0.5">{style.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                {memberName || "Someone"}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Changed status to{" "}
                <span className="font-bold">{style.label}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">{timeAgo(alert.createdAt)}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={handleDismiss}
                aria-label="Dismiss alert"
                className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="mt-2 w-full text-center text-xs font-semibold text-shield-700 hover:text-shield-800 bg-white/60 hover:bg-white rounded-lg py-1.5 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
