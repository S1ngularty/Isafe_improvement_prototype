import { leaveFamily, removeFamilyMember, promoteFamilyMember, demoteFamilyMember } from "../services/family.js";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

const STATUS_COLORS = {
  safe: "bg-green-500",
  help: "bg-yellow-500",
  emergency: "bg-red-500",
};

const ROLE_BADGES = {
  head: "bg-shield-600 text-white",
  co_head: "bg-green-600 text-white",
  member: null,
};

function timeAgo(isoString) {
  if (!isoString) return "Never";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function FamilyMemberList({ members, family, currentUserId, onRefresh }) {
  const { showToast } = useToast();
  const [leaving, setLeaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [acting, setActing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const { profile } = useAuth();
  const myRole = profile?.family_role || "member";
  const isHead = myRole === "head";
  const isCoHead = myRole === "co_head";
  const canManage = isHead || isCoHead;

  function triggerConfirm(title, message, confirmLabel, confirmClass, onConfirm) {
    setConfirm({ title, message, confirmLabel, confirmClass, onConfirm });
  }

  function handleLeave() {
    triggerConfirm(
      "Leave Family",
      "Your location will no longer be shared with family members.",
      "Leave",
      "bg-red-600 hover:bg-red-700",
      async () => {
        setConfirm(null);
        setLeaving(true);
        try { await leaveFamily(); showToast("Left family.", "info"); onRefresh(); }
        catch (err) { showToast(err.message, "error"); }
        finally { setLeaving(false); }
      }
    );
  }

  function handleRemove(targetId, name) {
    triggerConfirm(
      "Remove Member",
      `Remove ${name} from the family?`,
      "Remove",
      "bg-red-600 hover:bg-red-700",
      async () => {
        setConfirm(null);
        setActing(targetId);
        try { await removeFamilyMember(targetId); showToast(`${name} removed.`, "info"); setOpenMenuId(null); onRefresh(); }
        catch (err) { showToast(err.message, "error"); }
        finally { setActing(null); }
      }
    );
  }

  async function handlePromote(targetId, name) {
    setActing(targetId);
    try { await promoteFamilyMember(targetId); showToast(`${name} is now co-head.`, "success"); setOpenMenuId(null); onRefresh(); }
    catch (err) { showToast(err.message, "error"); }
    finally { setActing(null); }
  }

  async function handleDemote(targetId, name) {
    setActing(targetId);
    try { await demoteFamilyMember(targetId); showToast(`${name} demoted to member.`, "info"); setOpenMenuId(null); onRefresh(); }
    catch (err) { showToast(err.message, "error"); }
    finally { setActing(null); }
  }

  function canRemoveMember(member) {
    if (!canManage || member.id === currentUserId) return false;
    if (member.family_role === "head") return false;
    if (!isHead && member.family_role !== "member") return false;
    return true;
  }

  if (!family) return null;

  return (
    <div className="flex flex-col h-full relative">
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
        {members.map((m) => {
          const isSelf = m.id === currentUserId;
          const badgeClass = ROLE_BADGES[m.family_role];
          const roleLabel = m.family_role === "head" ? "Head" : m.family_role === "co_head" ? "Co-Head" : null;

          return (
            <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors relative">
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[m.status] || "bg-gray-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-gray-800 truncate">{m.full_name || "Unnamed"}</p>
                  {isSelf && <span className="text-[9px] text-gray-400">(you)</span>}
                  {roleLabel && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${badgeClass}`}>
                      {roleLabel}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">{timeAgo(m.last_seen_at)}</p>
              </div>
              <span className="text-[10px] text-gray-400 capitalize shrink-0">{m.status}</span>

              {(canRemoveMember(m) || (isHead && m.family_role === "member")) && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                    disabled={acting === m.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-shield-600 hover:text-shield-700 hover:bg-shield-50 transition-all border border-shield-200 hover:border-shield-300 shadow-sm"
                    title="Member options"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                  {openMenuId === m.id && (
                    <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-48 text-xs overflow-hidden">
                      {canRemoveMember(m) && (
                        <button onClick={() => { setOpenMenuId(null); handleRemove(m.id, m.full_name || "Member"); }} className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2.5">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                          Remove from Family
                        </button>
                      )}
                      {isHead && m.family_role === "member" && (
                        <button onClick={() => { setOpenMenuId(null); handlePromote(m.id, m.full_name || "Member"); }} className="w-full text-left px-3.5 py-2 hover:bg-green-50 text-green-700 transition-colors flex items-center gap-2.5">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                          Promote to Co-Head
                        </button>
                      )}
                      {isHead && m.family_role === "co_head" && (
                        <button onClick={() => { setOpenMenuId(null); handleDemote(m.id, m.full_name || "Member"); }} className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-amber-700 transition-colors flex items-center gap-2.5">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                          Demote to Member
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          confirmClass={confirm.confirmClass}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
