import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { updateProfile } from "../services/profile.js";

export default function UserSettings() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [tideAlertsEnabled, setTideAlertsEnabled] = useState(profile?.tide_alerts_enabled ?? true);
  const [saving, setSaving] = useState(false);

  async function handleTideToggle() {
    const newValue = !tideAlertsEnabled;
    setTideAlertsEnabled(newValue);
    setSaving(true);
    try {
      await updateProfile({ tide_alerts_enabled: newValue });
      await refreshProfile();
      showToast(
        newValue ? "Tide alerts enabled" : "Tide alerts disabled",
        "success",
      );
    } catch (err) {
      setTideAlertsEnabled(!newValue);
      showToast(err.message || "Failed to update setting", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-100">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notifications</h4>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold text-gray-900">Tide Alerts</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Receive push notifications about current tide conditions at 8am, 12pm, and 6pm.
              </p>
            </div>
            <button
              onClick={handleTideToggle}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-shield-500 focus:ring-offset-2 ${
                tideAlertsEnabled ? "bg-shield-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  tideAlertsEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
