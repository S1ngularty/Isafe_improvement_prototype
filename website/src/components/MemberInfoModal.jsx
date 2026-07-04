import { useState, useEffect } from "react";
import { getMemberProfile } from "../services/alerts.js";

const STATUS_CONFIG = {
  safe: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-800", label: "Safe" },
  help: { dot: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-800", label: "Help" },
  emergency: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-800", label: "Emergency" },
};

const ROLE_BADGES = {
  head: "bg-shield-600 text-white",
  co_head: "bg-green-600 text-white",
  member: null,
};

function AccordionSection({ icon, title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400 shrink-0">{icon}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-200 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-3 pt-0 space-y-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="w-4 h-4 text-gray-400 shrink-0">{icon}</span>
      <span className="text-gray-500 min-w-[80px] text-xs">{label}</span>
      <span className="text-gray-900 font-medium text-sm break-words">{value}</span>
    </div>
  );
}

export default function MemberInfoModal({ memberId, memberData, currentUserId, onClose }) {
  const [profile, setProfile] = useState(memberData || null);
  const [loading, setLoading] = useState(!memberData);

  useEffect(() => {
    if (memberData) {
      setProfile(memberData);
      return;
    }
    if (!memberId || !currentUserId) return;
    setLoading(true);
    getMemberProfile(memberId, currentUserId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [memberId, memberData, currentUserId]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Loading member information">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <svg className="w-8 h-8 animate-spin text-shield-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Member not found">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Member information not available.</p>
          <button onClick={onClose} className="text-sm font-semibold text-shield-700 hover:underline">Close</button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[profile.status] || STATUS_CONFIG.safe;
  const roleBadge = ROLE_BADGES[profile.family_role];
  const roleLabel = profile.family_role === "head" ? "Head" : profile.family_role === "co_head" ? "Co-Head" : null;
  const isSelf = profile.id === currentUserId;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] pb-8 px-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.full_name || "Member"} information`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_200ms_ease-out]">
        <div className={`px-5 py-4 ${statusCfg.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{profile.full_name || "Unnamed"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {roleLabel && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge}`}>{roleLabel}</span>
                )}
                {isSelf && <span className="text-[10px] text-gray-400">(you)</span>}
                <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <AccordionSection
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
          title="Contact"
          defaultOpen={true}
        >
          <InfoRow label="Phone" value={profile.phone_number}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
          />
          <InfoRow label="Barangay" value={profile.barangay}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>}
          />
          <InfoRow label="Address" value={profile.street_address}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
          />
        </AccordionSection>

        <AccordionSection
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
          title="Medical"
          defaultOpen={profile.blood_type || profile.medical_notes || profile.special_needs}
        >
          {profile.blood_type && (
            <InfoRow label="Blood Type" value={profile.blood_type}
              icon={<span className="text-xs font-bold text-red-500">B</span>}
            />
          )}
          <InfoRow label="Medical Notes" value={profile.medical_notes}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <InfoRow label="Special Needs" value={profile.special_needs === "other" ? profile.special_needs_other : profile.special_needs}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
        </AccordionSection>

        <AccordionSection
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          title="Emergency Contact"
          defaultOpen={profile.external_name || profile.external_phone}
        >
          <InfoRow label="Name" value={profile.external_name}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          />
          <InfoRow label="Relationship" value={profile.relationship}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
          />
          <InfoRow label="Phone" value={profile.external_phone}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
          />
        </AccordionSection>

        <AccordionSection
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          title="Demographics"
          defaultOpen={profile.gender || profile.date_of_birth || profile.household_size}
        >
          <InfoRow label="Gender" value={profile.gender}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          />
          <InfoRow label="Date of Birth" value={profile.date_of_birth}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <InfoRow label="Household Size" value={profile.household_size}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          />
        </AccordionSection>
      </div>
    </div>
  );
}
