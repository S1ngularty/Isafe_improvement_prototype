import { useState, useEffect, useRef } from "react";
import ConfirmDialog from "./ConfirmDialog";

const BANNER_STYLES = {
  help: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
    icon: (
      <svg className="w-5 h-5 shrink-0 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  emergency: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    icon: (
      <svg className="w-5 h-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  safe: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    icon: (
      <svg className="w-5 h-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function StatusTimerWidget({ newStatus, previousStatus, duration, onConfirm, onCancel }) {
  const [countdown, setCountdown] = useState(duration);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const committedRef = useRef(false);
  const styles = BANNER_STYLES[newStatus] || BANNER_STYLES.help;

  useEffect(() => {
    if (countdown <= 0) {
      if (!committedRef.current) {
        committedRef.current = true;
        onConfirm();
      }
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, onConfirm]);

  const label =
    newStatus === "safe" ? "Marking as safe" :
    newStatus === "help" ? "Sending help request" :
    "Sending emergency alert";

  return (
    <div className={`relative rounded-xl border-2 ${styles.border} ${styles.bg} px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3 min-w-0">
        {styles.icon}
        <div>
          <p className={`text-sm font-bold ${styles.text}`}>{label} in {countdown}s...</p>
          <p className="text-[10px] mt-0.5">Previous status: {previousStatus}</p>
        </div>
      </div>
      <button
        onClick={() => setConfirmCancel(true)}
        className="shrink-0 ml-3 px-4 py-1.5 text-xs font-semibold rounded-lg border-2 border-current hover:bg-white/30 transition-all"
      >
        Cancel
      </button>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel Request"
          message={`Keep your status as "${previousStatus}"?`}
          confirmLabel="Keep Status"
          confirmClass="bg-gray-600 hover:bg-gray-700"
          onConfirm={() => { setConfirmCancel(false); onCancel(); }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}
