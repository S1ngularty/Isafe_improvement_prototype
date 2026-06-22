import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { uploadAvatar, removeAvatar, updateProfile } from "../services/profile.js";

export default function UserProfile() {
  const { session, profile, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [barangay, setBarangay] = useState(profile?.barangay || "");
  const [saving, setSaving] = useState(false);
  const avatarUrl = profile?.avatar_url;
  const initial = (profile?.full_name || session?.user?.email || "?")[0].toUpperCase();

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5 MB.", "error"); return; }
    try { await uploadAvatar(file); await refreshProfile(); showToast("Avatar updated.", "success"); } catch (err) { showToast(err.message, "error"); }
  }

  async function handleRemoveAvatar() {
    try { await removeAvatar(); await refreshProfile(); showToast("Avatar removed.", "info"); } catch (err) { showToast(err.message, "error"); }
  }

  async function handleSave() {
    setSaving(true);
    try { await updateProfile({ full_name: fullName.trim(), barangay: barangay.trim() }); await refreshProfile(); showToast("Profile saved.", "success"); } catch (err) { showToast(err.message, "error"); } finally { setSaving(false); }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-5">Profile</h3>
        <div className="flex flex-col items-center mb-6">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
          <button onClick={() => fileRef.current?.click()} className="w-24 h-24 rounded-full border-2 border-shield-300 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer group relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <span className="text-3xl font-bold text-shield-600">{initial}</span>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </button>
          {avatarUrl && <button onClick={handleRemoveAvatar} className="text-xs text-red-500 hover:text-red-600 mt-2">Remove photo</button>}
        </div>
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none" placeholder="Your name" /></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Barangay</label><input type="text" value={barangay} onChange={(e) => setBarangay(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none" placeholder="Your barangay" /></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Status</label><p className="text-sm text-gray-700 capitalize font-medium">{profile?.status || "safe"}</p></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label><p className="text-sm text-gray-700">{session?.user?.email}</p></div>
          <button onClick={handleSave} disabled={saving} className="w-full py-2 bg-shield-600 text-white rounded-lg text-sm font-semibold hover:bg-shield-700 disabled:opacity-40 transition-colors">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}
