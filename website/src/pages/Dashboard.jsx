
import { useState, useEffect, useRef } from "react";

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";

import { Polyline, Tooltip as LeafletTooltip } from "react-leaflet";
import MapView from "../components/MapView";
import UserMarker from "../components/UserMarker";
import AddressSearch from "../components/AddressSearch";
import AnnouncementBanner from "../components/AnnouncementBanner";
import AnnouncementDetail from "../components/AnnouncementDetail";
import TcwsBanner from "../components/TcwsBanner";
import FamilySetup from "../components/FamilySetup";
import FamilyMemberList from "../components/FamilyMemberList";
import UserProfile from "../components/UserProfile";
import UserSettings from "../components/UserSettings";
import RouteSteps from "../components/RouteSteps";
import EvacMarker from "../components/EvacMarker";
import ForecastPage from "../components/ForecastPage";
import FloodHazardView from "./floodHazard/FloodHazardView";
import RainViewerPage from "./RainViewerPage";
import TideView from "../components/TideView";
import EvacuationCentersView from "../components/EvacuationCentersView";
import EmergencyContactsPanel from "../components/EmergencyContactsPanel";
import AlertsView from "../components/AlertsView";
import AlertPopup from "../components/AlertPopup";
import MemberInfoModal from "../components/MemberInfoModal";
import Modal from "../components/Modal";
import ResourcesHub from "./resources/ResourcesHub.jsx";
import HotlinesView from "../components/HotlinesView";
import useAlertNotifications from "../hooks/useAlertNotifications";
import useGeolocation from "../hooks/useGeolocation";
import useFamilyLocations from "../hooks/useFamilyLocations";
import useEvacuationAreas from "../hooks/useEvacuationAreas";
import useTcwsAlerts from "../hooks/useTcwsAlerts";
import useWeather from "../hooks/useWeather";
import { upsertLocation, updateLocationSharing } from "../services/location";
import { getProfile } from "../services/auth";
import { fetchRoute, openOSMDirections } from "../services/routing.js";
import { haversine, bearing } from "../utils/geo.js";


export default function Dashboard() {
  const { session, role, profile, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [manualLat, setManualLat] = useState(null);
  const [manualLng, setManualLng] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const { lat, lng, accuracy, error: geoError, tracking } = useGeolocation(locationEnabled);

  const { members: familyMembers, family, refresh: refreshFamily } = useFamilyLocations();
  const { unreadCount, liveAlerts, clearUnread, dismissAlert } = useAlertNotifications(family?.id, session?.user?.id);
  const [memberNotification, setMemberNotification] = useState(null);

  const [route, setRoute] = useState(null);
  const [showProximity, setShowProximity] = useState(false);
  const [detailAnnouncement, setDetailAnnouncement] = useState(null);
  const routeLoadingRef = useRef(false);

  const displayLat = manualLat ?? lat;
  const displayLng = manualLng ?? lng;

  useEffect(() => {
    if (view === "alerts") clearUnread();
  }, [view, clearUnread]);

  const { areas: evacAreas, nearest: nearestEvac, nearestDist } = useEvacuationAreas(displayLat, displayLng);
  const { current: weatherCurrent } = useWeather(displayLat, displayLng);
  const { alerts: tcwsAlerts, changed: tcwsChanged, dismissed: tcwsDismissed, dismiss: dismissTcws } = useTcwsAlerts();

  const mapCenter = displayLat && displayLng ? [displayLat, displayLng] : [12.8, 121.7];
  const mapZoom = displayLat && displayLng ? 16 : 6;

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!session) return;
      try {
        const p = await getProfile();
        if (cancelled || !p) return;
        if (p.lat && p.lng) {
          setManualLat(p.lat);
          setManualLng(p.lng);
        }
      } catch {
        // Profile load failed silently
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (profile) {
      setLocationEnabled(profile.location_sharing || false);
    }
  }, [profile]);

  async function handleMemberClick(member) {
    if (!displayLat || !displayLng || routeLoadingRef.current) return;
    routeLoadingRef.current = true;
    try {
      const result = await fetchRoute(displayLat, displayLng, member.lat, member.lng);
      if (result) {
        setRoute({ ...result, memberName: member.full_name || "Member" });
      }
    } catch {
      // Route fetch failed silently
    } finally {
      routeLoadingRef.current = false;
    }
  }

  async function handleEvacClick(center) {
    if (!displayLat || !displayLng || routeLoadingRef.current) return;
    routeLoadingRef.current = true;
    try {
      const result = await fetchRoute(displayLat, displayLng, center.latitude, center.longitude);
      if (result) {
        setRoute({ ...result, memberName: center.name || "Evacuation Center" });
      }
    } catch {
      // Route fetch failed silently
    } finally {
      routeLoadingRef.current = false;
    }
  }

  function handleMapClick(latlng) {
    setRoute(null);
    setManualLat(latlng.lat);
    setManualLng(latlng.lng);
  }

  async function handleShareToggle() {
    if (locationEnabled) {
      setLocationEnabled(false);
      try {
        await updateLocationSharing(false);
      } catch { /* silent */ }
      showToast("Location sharing turned off.", "info", 2000);
      return;
    }

    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async () => {
        setManualLat(null);
        setManualLng(null);
        setLocationEnabled(true);
        try {
          await updateLocationSharing(true);
        } catch { /* silent */ }
        showToast("Location sharing is on.", "success", 2000);
      },
      (err) => {
        if (err.code === 1) {
          setShowGeoModal(true);
        } else {
          showToast("Could not access location: " + err.message, "error");
        }
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  }

  async function handleLogout() {
    await logout();
    showToast("Logged out successfully.", "info", 4000);
    navigate("/", { replace: true });
  }

  function handleOpenOSM() {
    if (!route || !displayLat || !displayLng) return;
    const target = route.coordinates[route.coordinates.length - 1];
    openOSMDirections(displayLat, displayLng, target[0], target[1]);
  }

  const WeatherIcon = weatherCurrent?.icon;

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
            {weatherCurrent && (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1">
                {WeatherIcon && <WeatherIcon />}
                <span className="text-sm font-bold text-white">{weatherCurrent.temperature}&deg;C</span>
              </div>
            )}
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
          unreadAlerts={unreadCount}
        />


        <main className="flex-1 p-4 sm:p-6 w-full flex flex-col gap-6">
          {!tcwsDismissed && (tcwsChanged || tcwsAlerts.length > 0) && (
            <TcwsBanner
              alerts={tcwsAlerts}
              onDismiss={dismissTcws}
            />
          )}

          {liveAlerts.map((alert) => {
            const member = familyMembers?.find((m) => m.id === alert.userId);
            return (
              <AlertPopup
                key={alert.id}
                alert={alert}
                memberName={member?.full_name}
                onDismiss={dismissAlert}
                onClick={() => {
                  setMemberNotification(alert.userId);
                }}
              />
            );
          })}

          {view === "profile" && <UserProfile />}

          {view === "settings" && <UserSettings />}

          {view === "family" && (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7rem)]">
              <div className="lg:w-80 shrink-0">
                {family ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                    <FamilyMemberList members={familyMembers} family={family} currentUserId={session?.user?.id} onRefresh={refreshFamily} />
                  </div>
                ) : (
                  <FamilySetup onDone={() => { refreshProfile(); refreshFamily(); }} />
                )}
              </div>
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden shadow-lg">
                <MapView center={[12.8, 121.7]} zoom={6} className="h-full w-full">
                  {displayLat && displayLng && (
                    <UserMarker lat={displayLat} lng={displayLng} status={profile?.status || "safe"} accuracy={tracking ? accuracy : null} isSelf={true} avatarUrl={profile?.avatar_url} />
                  )}
                  {displayLat && displayLng && family && familyMembers.filter((m) => m.id !== session?.user?.id).map((m) => {
                    if (!m.lat || !m.lng) return null;
                    const dist = haversine(displayLat, displayLng, m.lat, m.lng);
                    const dir = bearing(displayLat, displayLng, m.lat, m.lng);
                    return (
                      <UserMarker
                        key={m.id}
                        lat={m.lat}
                        lng={m.lng}
                        status={m.status}
                        name={m.full_name}
                        isSelf={false}
                        avatarUrl={m.avatar_url}
                        onClick={() => handleMemberClick(m)}
                        distanceInfo={`${dist.toFixed(1)} km ${dir}`}
                      />
                    );
                  })}
                  {evacAreas.map((center) => (
                    <EvacMarker
                      key={`evac-${center.id}`}
                      lat={center.latitude}
                      lng={center.longitude}
                      name={center.name}
                      description={center.description}
                      capacity={center.capacity}
                      landmark_url={center.landmark_url}
                      onClick={() => handleEvacClick(center)}
                    />
                  ))}
                  {displayLat && displayLng && familyMembers.filter((m) => m.id !== session?.user?.id).map((m) =>
                    m.lat && m.lng ? (
                      <Polyline
                        key={`prox-${m.id}`}
                        positions={[[displayLat, displayLng], [m.lat, m.lng]]}
                        pathOptions={{ color: "#991b1b", dashArray: "4 3", weight: 1.5, opacity: 0.5 }}
                      />
                    ) : null
                  )}
                  {route && (
                    <Polyline
                      positions={route.coordinates}
                      pathOptions={{ color: "#991b1b", weight: 3, opacity: 0.9 }}
                    >
                      <LeafletTooltip sticky>
                        {route.distance_km} km &middot; ~{route.duration_min} min to {route.memberName}
                      </LeafletTooltip>
                    </Polyline>
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
              </div>
            </div>
          )}

          {view === "alerts" && <AlertsView />}

          {view === "resources" && <ResourcesHub />}

          {view === "hotlines" && <HotlinesView />}

          {view === "contacts" && (
            <div className="flex-1 min-h-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden p-5">
                {profile && (
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Emergency Contacts</h3>
                    <p className="text-xs text-gray-400">Family members with direct call and SMS access</p>
                  </div>
                )}
                <EmergencyContactsPanel family={family} profile={profile} />
              </div>
            </div>
          )}

          {view === "forecast" && (
            <ForecastPage lat={displayLat} lng={displayLng} />
          )}

          {view === "hazard" && <FloodHazardView />}

          {view === "rainviewer" && <RainViewerPage />}

          {view === "tide" && <TideView isAdmin={false} />}

          {view === "evacuation" && (
            <EvacuationCentersView onGetDirections={handleEvacClick} />
          )}

          {view === "dashboard" && (
            <>
              <AnnouncementBanner onClick={setDetailAnnouncement} />

              <div className="h-[55vh] min-h-[380px] rounded-xl overflow-hidden shadow-lg relative group">
                <MapView center={mapCenter} zoom={mapZoom} resetKey={resetKey} className="h-full w-full" onMapClick={handleMapClick}>
                  {displayLat && displayLng && (
                    <UserMarker lat={displayLat} lng={displayLng} status={profile?.status || "safe"} accuracy={tracking ? accuracy : null} isSelf={true} avatarUrl={profile?.avatar_url} />
                  )}
                  {displayLat && displayLng && family && familyMembers.filter((m) => m.id !== session?.user?.id).map((m) => {
                    if (!m.lat || !m.lng) return null;
                    const dist = showProximity ? haversine(displayLat, displayLng, m.lat, m.lng) : null;
                    const dir = dist ? bearing(displayLat, displayLng, m.lat, m.lng) : null;
                    return (
                      <UserMarker
                        key={m.id}
                        lat={m.lat}
                        lng={m.lng}
                        status={m.status}
                        name={m.full_name}
                        isSelf={false}
                        avatarUrl={m.avatar_url}
                        onClick={() => handleMemberClick(m)}
                        distanceInfo={dist ? `${dist.toFixed(1)} km ${dir}` : null}
                      />
                    );
                  })}
                  {evacAreas.map((center) => (
                    <EvacMarker
                      key={`evac-${center.id}`}
                      lat={center.latitude}
                      lng={center.longitude}
                      name={center.name}
                      description={center.description}
                      capacity={center.capacity}
                      landmark_url={center.landmark_url}
                      onClick={() => handleEvacClick(center)}
                    />
                  ))}
                  {showProximity && displayLat && displayLng && familyMembers.filter((m) => m.id !== session?.user?.id).map((m) =>
                    m.lat && m.lng ? (
                      <Polyline
                        key={`prox-${m.id}`}
                        positions={[[displayLat, displayLng], [m.lat, m.lng]]}
                        pathOptions={{ color: "#991b1b", dashArray: "4 3", weight: 1.5, opacity: 0.5 }}
                      />
                    ) : null
                  )}
                  {route && (
                    <Polyline
                      positions={route.coordinates}
                      pathOptions={{ color: "#991b1b", weight: 3, opacity: 0.9 }}
                    >
                      <LeafletTooltip sticky>
                        {route.distance_km} km &middot; ~{route.duration_min} min to {route.memberName}
                      </LeafletTooltip>
                    </Polyline>
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

                <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
                  {family && (
                    <button
                      onClick={() => setShowProximity((v) => !v)}
                      className={`bg-white/90 backdrop-blur rounded-lg shadow px-3 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${showProximity ? "text-shield-700 border border-shield-300" : "text-gray-500"}`}
                      title="Show proximity lines"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {showProximity ? "Hide" : "Lines"}
                    </button>
                  )}
                  <button
                    onClick={handleShareToggle}
                    className={`bg-white/90 hover:bg-white backdrop-blur rounded-lg shadow px-3 py-1.5 flex items-center gap-2 text-xs transition-all border-2 ${
                      locationEnabled ? "border-green-500 text-green-700 scale-105" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    title={locationEnabled ? "Tap to stop sharing your location" : "Tap to share your live location"}
                  >
                    <span className={`w-2 h-2 rounded-full ${tracking ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                    <span className="font-semibold">Share: {tracking ? "ON" : "OFF"}</span>
                    {tracking && accuracy && <span className="text-gray-400">~{Math.round(accuracy)}m</span>}
                  </button>
                </div>

                {displayLat && displayLng && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!displayLat || !displayLng) return;
                        if (profile?.lat && profile?.lng) {
                          setManualLat(profile.lat);
                          setManualLng(profile.lng);
                        }
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
                          await refreshProfile();
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

              {route && (
                <RouteSteps route={route} onClear={() => setRoute(null)} onOpenOSM={handleOpenOSM} />
              )}

              {nearestEvac && (
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-indigo-600 px-5 py-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Nearest Evacuation Center Near You
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-gray-900 truncate">{nearestEvac.name}</p>
                      {nearestEvac.description && (
                        <p className="text-xs text-gray-500 truncate">{nearestEvac.description}</p>
                      )}
                      <p className="text-sm text-indigo-600 font-semibold mt-0.5">
                        {nearestDist < 1
                          ? `${(nearestDist * 1000).toFixed(0)}m away`
                          : `${nearestDist.toFixed(1)} km away`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEvacClick(nearestEvac)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0"
                    >
                      Get Directions
                    </button>
                  </div>
                </div>
              )}



              {family && familyMembers && familyMembers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emergency Contacts</p>
                    <button
                      onClick={() => setView("contacts")}
                      className="text-[10px] text-shield-600 font-semibold hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <EmergencyContactsPanel family={family} members={familyMembers} profile={profile} compact />
                </div>
              )}

            </>
          )}
        </main>
      </div>

      {detailAnnouncement && (
        <AnnouncementDetail
          announcement={detailAnnouncement}
          onClose={() => setDetailAnnouncement(null)}
        />
      )}

      {memberNotification && (
        <MemberInfoModal
          memberId={memberNotification}
          currentUserId={session?.user?.id}
          onClose={() => setMemberNotification(null)}
        />
      )}

      {showGeoModal && (
        <Modal open={showGeoModal} onClose={() => setShowGeoModal(false)}>
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Location Permission Denied</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please allow location access in your browser settings to share your live location.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-600 space-y-2 mb-4">
              <p>1. Click the lock or info icon in your browser's address bar</p>
              <p>2. Find the <strong>Location</strong> setting</p>
              <p>3. Change it from <strong>Block</strong> to <strong>Allow</strong></p>
              <p>4. Refresh the page and try again</p>
            </div>
            <button
              onClick={() => setShowGeoModal(false)}
              className="bg-shield-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-shield-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
