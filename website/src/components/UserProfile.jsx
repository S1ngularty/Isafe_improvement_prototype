import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { uploadAvatar, removeAvatar, updateProfile, sendPhoneOtp, verifyPhoneOtp, removePhone } from "../services/profile.js";
import { getMyFamily, getFamilyMembers } from "../services/family.js";
import { ALL_GROUPS, encodeSpecialNeeds, decodeSpecialNeeds } from "../utils/medicalOptions";
import { BARANGAY_OPTIONS } from "../utils/barangayOptions";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function SectionCard({ icon, title, iconBg, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function UserProfile() {
  const { session, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [barangay, setBarangay] = useState(profile?.barangay_id != null ? String(profile.barangay_id) : "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || "");
  const [bloodType, setBloodType] = useState(profile?.blood_type || "");
  const [householdSize, setHouseholdSize] = useState(profile?.household_size || "");
  const [selectedNeeds, setSelectedNeeds] = useState([]);
  const [needsOther, setNeedsOther] = useState("");
  const [streetAddress, setStreetAddress] = useState(profile?.street_address || "");
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes || "");
  const [externalName, setExternalName] = useState(profile?.external_name || "");
  const [externalPhone, setExternalPhone] = useState(profile?.external_phone || "");
  const [relationship, setRelationship] = useState(profile?.relationship || "");
  const [saving, setSaving] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneVerifyStep, setPhoneVerifyStep] = useState("idle"); // idle | otp-sent | verifying
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [family, setFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyLoaded, setFamilyLoaded] = useState(false);
  const avatarUrl = profile?.avatar_url;
  const initial = (profile?.full_name || session?.user?.email || "?")[0].toUpperCase();

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5 MB.", "error"); return; }
    try { await uploadAvatar(file); await refreshProfile(); showToast("Avatar updated.", "success"); } catch (err) { showToast(err.message, "error"); }
  }

  async function loadFamily() {
    if (familyLoaded) return;
    setFamilyLoaded(true);
    try {
      const fam = await getMyFamily();
      setFamily(fam);
      if (fam) {
        const members = await getFamilyMembers();
        setFamilyMembers(members);
      }
    } catch {}
  }

  useEffect(() => {
    if (profile?.special_needs != null) {
      const { selected, other } = decodeSpecialNeeds(profile.special_needs);
      setSelectedNeeds(selected);
      setNeedsOther(other);
    }
  }, [profile?.special_needs]);

  if (!familyLoaded && profile) { loadFamily(); }

  async function handleRemoveAvatar() {
    try { await removeAvatar(); await refreshProfile(); showToast("Avatar removed.", "info"); } catch (err) { showToast(err.message, "error"); }
  }

  async function handleSave() {
    if (phoneNumber && !/^\+63\d{10}$/.test(phoneNumber)) { showToast("Phone must be +63 followed by 10 digits.", "error"); return; }
    if (externalPhone && !/^\+63\d{10}$/.test(externalPhone)) { showToast("External phone must be +63 format.", "error"); return; }
    setSaving(true);
    try {
      const phoneChanged = phoneNumber.trim() !== (profile?.phone_number || "");
      await updateProfile({
        full_name: fullName.trim(), barangay_id: parseInt(barangay, 10), phone_number: phoneNumber.trim(),
        date_of_birth: dateOfBirth || null,
        blood_type: bloodType, household_size: householdSize || null,
        special_needs: encodeSpecialNeeds(selectedNeeds, needsOther), street_address: streetAddress.trim(),
        medical_notes: medicalNotes.trim(), external_name: externalName.trim(),
        external_phone: externalPhone.trim(), relationship: relationship.trim(),
        ...(phoneChanged ? { phone_verified: false } : {}),
      });
      await refreshProfile();
      showToast("Profile saved.", "success");
    } catch (err) { showToast(err.message, "error"); } finally { setSaving(false); }
  }

  async function handleSendPhoneOtp() {
    if (!phoneNumber || !/^\+63\d{10}$/.test(phoneNumber)) {
      showToast("Please enter a valid phone number (+639...).", "error");
      return;
    }
    setPhoneVerifying(true);
    try {
      await sendPhoneOtp(phoneNumber.trim());
      setPhoneVerifyStep("otp-sent");
      setPhoneOtpCode("");
      showToast("Verification code sent to your phone!", "success");
    } catch (err) {
      showToast(err.message || "Failed to send code", "error");
    } finally {
      setPhoneVerifying(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtpCode || phoneOtpCode.length !== 6) {
      showToast("Please enter a valid 6-digit code.", "error");
      return;
    }
    setPhoneVerifying(true);
    try {
      await verifyPhoneOtp(phoneOtpCode);
      setPhoneVerifyStep("verified");
      setPhoneOtpCode("");
      await refreshProfile();
      showToast("Phone number verified!", "success");
    } catch (err) {
      showToast(err.message || "Verification failed", "error");
    } finally {
      setPhoneVerifying(false);
    }
  }

  async function handleRemovePhone() {
    setPhoneVerifying(true);
    try {
      await removePhone();
      setPhoneNumber("");
      setPhoneVerifyStep("idle");
      setPhoneOtpCode("");
      await refreshProfile();
      showToast("Phone number removed.", "info");
    } catch (err) {
      showToast(err.message || "Failed to remove phone", "error");
    } finally {
      setPhoneVerifying(false);
    }
  }

  useEffect(() => {
    if (profile?.phone_verified) {
      setPhoneVerifyStep("verified");
    } else if (profile?.phone_number) {
      setPhoneVerifyStep("idle");
    } else {
      setPhoneVerifyStep("idle");
    }
  }, [profile?.phone_verified, profile?.phone_number]);

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 focus:bg-white outline-none bg-gray-50 transition-colors";

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-shield-800 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileRef.current?.click()} className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              ) : (
                <span className="text-lg font-bold text-white">{initial}</span>
              )}
            </button>
            <div>
              <h3 className="text-sm font-bold text-white">{profile?.full_name || "Your Profile"}</h3>
              <p className="text-[10px] text-red-200">{session?.user?.email}</p>
            </div>
          </div>
          {avatarUrl && (
            <button onClick={handleRemoveAvatar} className="text-[10px] text-red-200 hover:text-white transition-colors">Remove photo</button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <SectionCard
            icon={<svg className="w-3.5 h-3.5 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            title="Personal Information"
            iconBg="bg-shield-100"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Full name" />
              <select value={barangay} onChange={(e) => setBarangay(e.target.value)} className={inputCls}>
                <option value="">Barangay</option>
                {BARANGAY_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              <div className="relative">
                <input type="tel" value={phoneNumber} onChange={(e) => { setPhoneNumber(e.target.value); if (profile?.phone_verified) setPhoneVerifyStep("idle"); }} className={inputCls} placeholder="Phone (+639...)" />
                {phoneVerifyStep === "verified" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Verified
                  </span>
                )}
              </div>
              {phoneVerifyStep === "otp-sent" && (
                <div className="sm:col-span-2 flex gap-2 items-center">
                  <input
                    type="text"
                    maxLength={6}
                    className="input-field w-32 text-center text-lg tracking-widest"
                    placeholder="000000"
                    value={phoneOtpCode}
                    onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button onClick={handleVerifyPhoneOtp} disabled={phoneVerifying} className="px-4 py-2 bg-shield-600 text-white rounded-lg text-sm font-semibold hover:bg-shield-700 disabled:opacity-40 transition-colors shrink-0">
                    {phoneVerifying ? "Verifying..." : "Confirm Code"}
                  </button>
                  <button onClick={handleSendPhoneOtp} disabled={phoneVerifying} className="px-3 py-2 text-sm text-shield-600 hover:text-shield-700 font-medium disabled:opacity-40 shrink-0">
                    Resend
                  </button>
                </div>
              )}
              {phoneVerifyStep !== "otp-sent" && phoneNumber && !profile?.phone_verified && (
                <div className="sm:col-span-2">
                  <button onClick={handleSendPhoneOtp} disabled={phoneVerifying} className="text-sm text-shield-600 hover:text-shield-700 font-medium disabled:opacity-40">
                    {phoneVerifying ? "Sending..." : "Verify Phone via SMS"}
                  </button>
                </div>
              )}
              {phoneVerifyStep === "verified" && phoneNumber && (
                <div className="sm:col-span-2">
                  <button onClick={handleRemovePhone} disabled={phoneVerifying} className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-40">
                    Remove Phone
                  </button>
                </div>
              )}
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} max={new Date().toISOString().split("T")[0]} />
              <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={inputCls}>
                {BLOOD_TYPES.map((t) => <option key={t || "none"} value={t}>{t || "Blood type"}</option>)}
              </select>
              <input type="number" min="1" max="20" value={householdSize} onChange={(e) => setHouseholdSize(e.target.value)} className={inputCls} placeholder="Household size" />
              <input type="text" value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputCls} placeholder="Relationship" />
              <div className="sm:col-span-2">
                <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className={inputCls} placeholder="Street / Purok / Landmark" />
              </div>
            </div>
          </SectionCard>

          {family && (
            <SectionCard
              icon={<svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              title={`Family: ${family.name}`}
              iconBg="bg-green-100"
            >
              {familyMembers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No family members. Share your code: <span className="font-mono font-bold text-gray-600">{family.code}</span></p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {familyMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${m.status === "safe" ? "bg-green-500" : m.status === "help" ? "bg-yellow-500" : m.status === "emergency" ? "bg-red-500" : "bg-gray-400"}`}>
                        {(m.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{m.full_name || "Unnamed"}</p>
                        {m.phone_number ? (
                          <p className="text-[10px] text-gray-500 truncate">{m.phone_number}</p>
                        ) : (
                          <p className="text-[10px] text-gray-300">No phone</p>
                        )}
                      </div>
                      {m.phone_number && (
                        <div className="flex gap-1 shrink-0">
                          <a href={`tel:${m.phone_number}`} className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </a>
                          <a href={`sms:${m.phone_number}`} className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}
        </div>

        <div className="space-y-3">
          <SectionCard
            icon={<svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
            title="External Contact"
            iconBg="bg-amber-100"
          >
            <div className="space-y-2.5">
              <input type="text" value={externalName} onChange={(e) => setExternalName(e.target.value)} className={inputCls} placeholder="Contact name" />
              <input type="tel" value={externalPhone} onChange={(e) => setExternalPhone(e.target.value)} className={inputCls} placeholder="Phone (+639...)" />
            </div>
          </SectionCard>

          <SectionCard
            icon={<svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            title="Health & Medical"
            iconBg="bg-red-100"
          >
            <div className="space-y-2.5">
              <textarea value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} className={`${inputCls} resize-y`} placeholder="Allergies, conditions, medications" rows={2} />
              <div>
                <p className="text-[11px] font-bold text-gray-500 mb-1.5">Disabilities & Medical Conditions</p>
                <div className="space-y-2 bg-gray-50 rounded-lg p-2.5 border border-gray-200 max-h-56 overflow-y-auto">
                  {ALL_GROUPS.map(({ heading, options }) => (
                    <div key={heading}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{heading}</p>
                      <div className="grid grid-cols-1 gap-0.5">
                        {options.map((opt) => {
                          const checked = selectedNeeds.includes(opt.id);
                          return (
                            <label key={opt.id} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white transition-colors">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setSelectedNeeds((prev) =>
                                    checked ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                                  );
                                }}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-shield-600 focus:ring-shield-500"
                              />
                              <span className="text-xs text-gray-700">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  value={needsOther}
                  onChange={(e) => setNeedsOther(e.target.value)}
                  placeholder="Other needs..."
                  className={`${inputCls} mt-1.5`}
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full py-2.5 bg-shield-600 text-white rounded-lg text-sm font-semibold hover:bg-shield-700 disabled:opacity-40 transition-colors">
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
