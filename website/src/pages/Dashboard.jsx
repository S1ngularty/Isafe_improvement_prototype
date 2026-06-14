
import { useState, useEffect, useCallback } from "react";

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";

import MapView from "../components/MapView";
import UserMarker from "../components/UserMarker";
import AddressSearch from "../components/AddressSearch";
import AnnouncementBanner from "../components/AnnouncementBanner";
import WeatherPanel from "../components/WeatherPanel";
import useGeolocation from "../hooks/useGeolocation";
import { upsertLocation, updateStatus, updateLocationSharing } from "../services/location";
import { getProfile } from "../services/auth";


export default function Dashboard() {
  const { session, role, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [status, setStatus] = useState("safe");
  const [manualLat, setManualLat] = useState(null);
  const [manualLng, setManualLng] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const { lat, lng, accuracy, error: geoError, tracking } = useGeolocation(locationEnabled);

  const displayLat = manualLat ?? lat;
  const displayLng = manualLng ?? lng;
  const isManual = manualLat !== null && manualLng !== null;
  const mapCenter = displayLat && displayLng ? [displayLat, displayLng] : [12.8, 121.7];
  const mapZoom = displayLat && displayLng ? 16 : 6;

  useEffect(() => {
    console.log("[Dashboard] useEffect fired, session:", !!session, session?.user?.id);
    if (!session) return;
    getProfile().then((profile) => {
      console.log("[Dashboard] getProfile resolved:", profile);
      if (profile) {
        console.log("[Dashboard] setting status:", profile.status);
        setStatus(profile.status || "safe");
        if (profile.lat && profile.lng) {
          console.log("[Dashboard] setting position:", profile.lat, profile.lng);
          setManualLat(profile.lat);
          setManualLng(profile.lng);
        } else {
          console.log("[Dashboard] no lat/lng in profile");
        }
      }
    }).catch((err) => {
      console.log("[Dashboard] getProfile failed:", err);
    });
  }, [session]);

  function handleMapClick(latlng) {
    setManualLat(latlng.lat);
    setManualLng(latlng.lng);
  }

  const handleStatusChange = useCallback(
    async (newStatus) => {
      if (newStatus === status) return;
      setStatus(newStatus);
      try {
        await updateStatus(newStatus);
        showToast(
          newStatus === "safe"
            ? "Marked as safe."
            : newStatus === "help"
              ? "Help request sent."
              : "Emergency alert sent.",
          newStatus === "safe" ? "success" : newStatus === "help" ? "info" : "error",
          4000
        );
      } catch {
        showToast("Failed to update status.", "error");
      }
    },
    [status, showToast]
  );


  async function handleLogout() {
    await logout();
    showToast("Logged out successfully.", "info", 4000);
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <header className="bg-shield-800 shadow-lg z-30">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-white">Prototype</span>

          </div>
          <div className="flex items-center gap-4">
            {role === "admin" && (
              <Link to="/admin" className="bg-alert-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-alert-500 transition-colors">
                Admin
              </Link>
            )}

            <span className="text-sm text-white/70 hidden sm:inline">{session?.user?.email}</span>
            <button onClick={handleLogout} className="border-2 border-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors">Log Out</button>

          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <UserSidebar
          active={view}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          onNavigate={setView}
        />


        <main className="flex-1 p-4 sm:p-6 w-full flex flex-col gap-6">
          {view === "dashboard" && (
            <>
              <AnnouncementBanner />
              <div className="h-[55vh] min-h-[380px] rounded-xl overflow-hidden shadow-lg relative group">
                <MapView center={mapCenter} zoom={mapZoom} resetKey={resetKey} className="h-full w-full" onMapClick={handleMapClick}>
                  {displayLat && displayLng && (
                    <UserMarker lat={displayLat} lng={displayLng} status={status} accuracy={isManual ? null : accuracy} />
                  )}
                </MapView>

                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[2000] w-[calc(100%-2rem)] max-w-sm">
                  <AddressSearch
                    onSelect={({ lat, lng }) => {
                      setManualLat(lat);
                      setManualLng(lng);
                    }}
                  />
                </div>

                <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur rounded-lg shadow px-3 py-1.5 flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${tracking || isManual ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  <span className="text-gray-600">{tracking || isManual ? (isManual ? "Manual" : "Live") : "Off"}</span>
                  {!isManual && accuracy && <span className="text-gray-400 ml-1">~{Math.round(accuracy)}m</span>}
                </div>

                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
                  {[
                    {
                      status: "safe", label: "Safe", activeBorder: "border-green-500", activeText: "text-green-700",
                      icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                    },
                    {
                      status: "help", label: "Help", activeBorder: "border-yellow-500", activeText: "text-yellow-700",
                      icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                    },
                    {
                      status: "emergency", label: "SOS", activeBorder: "border-alert-500", activeText: "text-alert-700",
                      icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
                    },
                  ].map((btn) => (
                    <button
                      key={btn.status}
                      onClick={() => handleStatusChange(btn.status)}
                      className={`bg-white/90 hover:bg-white backdrop-blur rounded-xl shadow-lg p-3 flex flex-col items-center gap-0.5 transition-all border-2 ${
                        status === btn.status ? `${btn.activeBorder} ${btn.activeText} scale-105` : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      title={btn.label}
                    >
                      {btn.icon}
                      <span className="text-[10px] font-bold">{btn.label}</span>
                    </button>
                  ))}
                  <div className="w-px h-6 bg-gray-200 mx-auto" />
                  <button
                    onClick={() => {
                      if (!locationEnabled && !navigator.geolocation) {
                        showToast("Geolocation is not supported by your browser.", "error");
                        return;
                      }
                      const next = !locationEnabled;
                      setLocationEnabled(next);
                      updateLocationSharing(next).catch(() => {});
                    }}
                    className={`bg-white/90 hover:bg-white backdrop-blur rounded-xl shadow-lg p-3 flex flex-col items-center gap-0.5 transition-all border-2 ${
                      locationEnabled ? "border-green-500 text-green-700 scale-105" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    title="Share Location"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] font-bold">Share</span>
                  </button>
                </div>

                {displayLat && displayLng && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!displayLat || !displayLng) return;
                        setResetKey((k) => k + 1);
                      }}
                      className="bg-white text-xs px-4 py-2 rounded-full shadow-lg font-medium text-gray-600 hover:text-gray-900 border"
                    >
                      Reset Pin
                    </button>
                    <button
                      onClick={async () => {
                        if (!displayLat || !displayLng) return;
                        try {
                          await upsertLocation(displayLat, displayLng);
                          showToast("Location pinned.", "success", 2000);
                        } catch (err) {
                          showToast("Failed to save location: " + err.message, "error");
                        }
                      }}
                      className="bg-shield-600 text-white text-xs px-4 py-2 rounded-full shadow-lg font-semibold hover:bg-shield-700 transition-colors"
                    >
                      Pin Location
                    </button>
                  </div>
                )}

                {geoError && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow text-sm z-[1000] max-w-xs text-center">
                    {geoError}
                  </div>
                )}
              </div>

              <WeatherPanel lat={displayLat} lng={displayLng} />

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { color: "alert", label: "Active Alerts", value: "0", sub: "No active emergencies" },
                  { color: "shield", label: "Reports Filed", value: "0", sub: "No reports yet" },
                  { color: "green", label: "Resolved", value: "0", sub: "No incidents" },
                  { color: "shield", label: "Evac Centers", value: "3", sub: "Nearest: 0.8km" },
                ].map(({ color, label, value, sub }) => (
                  <div key={label} className={`card border-l-4 ${color === "alert" ? "border-alert-600" : color === "shield" ? "border-shield-600" : "border-green-600"}`}>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{label}</h3>
                    <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400 mt-1">{sub}</p>

                  </div>
                ))}
              </div>


              <div className="grid lg:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { title: "Report Emergency", sub: "New incident", icon: (<svg className="w-4 h-4 text-alert-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>) },
                      { title: "My Reports", sub: "View status", icon: (<svg className="w-4 h-4 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>) },
                      { title: "Evacuation Map", sub: "Find centers", icon: (<svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>) },
                      { title: "Hotlines", sub: "Contacts", icon: (<svg className="w-4 h-4 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>) },
                    ].map(({ title, sub, icon }) => (
                      <button key={title} className="text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">{icon}</div>
                        <div><p className="text-xs font-semibold text-gray-900">{title}</p><p className="text-[10px] text-gray-400">{sub}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-3">Recent Alerts</h3>

                  <div className="space-y-3">
                    {[
                      { text: "Flood warning — Barangay San Roque", time: "10 min ago", color: "bg-alert-500" },
                      { text: "Road cleared — Main Highway", time: "1 hour ago", color: "bg-green-500" },
                      { text: "Evacuation drill announced", time: "3 hours ago", color: "bg-shield-500" },
                      { text: "Weather advisory: heavy rain", time: "5 hours ago", color: "bg-yellow-400" },

                    ].map(({ text, time, color }) => (
                      <div key={text} className="flex items-start gap-2.5">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{text}</p>
                          <p className="text-[10px] text-gray-400">{time}</p>

                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-gray-400 mt-3">Placeholder alert feed</p>

                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
