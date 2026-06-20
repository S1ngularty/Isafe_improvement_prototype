import { leaveFamily } from "../services/family.js";
import { useToast } from "../context/ToastContext";
import { useState } from "react";

const STATUS_COLORS = {
  safe: "bg-green-500",
  help: "bg-yellow-500",
  emergency: "bg-red-500",
};

function timeAgo(isoString) {
  if (!isoString) return "Never";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function FamilyMemberList({ members, family, onRefresh }) {
  const { showToast } = useToast();
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    if (!window.confirm("Leave this family? Your location will no longer be shared.")) return;
    setLeaving(true);
    try {
      await leaveFamily();
      showToast("Left family.", "info");
      onRefresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLeaving(false);
    }
  }

  if (!family) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-900 truncate">{family.name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Code: <span className="font-mono font-semibold text-gray-600 tracking-wider">{family.code}</span>
        </p>
        <p className="text-[11px] text-gray-400">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {members.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No members yet. Share your family code!</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[m.status] || "bg-gray-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{m.full_name || "Unnamed"}</p>
              <p className="text-[10px] text-gray-400">{timeAgo(m.last_seen_at)}</p>
            </div>
            <span className="text-[10px] text-gray-400 capitalize">{m.status}</span>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="w-full py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
        >
          {leaving ? "Leaving..." : "Leave Family"}
        </button>
      </div>
    </div>
  );
}
