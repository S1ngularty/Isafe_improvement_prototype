import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";

export default function Dashboard() {
  const { session, role, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  async function handleLogout() {
    await logout();
    showToast("Logged out successfully.", "info", 4000);
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm z-30">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-shield-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-shield-800">Prototype</span>
          </div>
          <div className="flex items-center gap-4">
            {role === "admin" && (
              <Link to="/admin" className="bg-alert-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-alert-500 transition-colors">
                Admin
              </Link>
            )}
            <span className="text-sm text-gray-600 hidden sm:inline">{session?.user?.email}</span>
            <button onClick={handleLogout} className="btn-outline px-4 py-2 text-sm">Log Out</button>
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

        <main className="flex-1 p-6 w-full">
          {view === "dashboard" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
              <p className="text-gray-500 text-sm mb-8">Welcome back. Stay alert, stay safe.</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { color: "alert", label: "Active Alerts", value: "0", sub: "No active emergencies in your area" },
                  { color: "shield", label: "Reports Filed", value: "0", sub: "No reports submitted yet" },
                  { color: "green", label: "Resolved", value: "0", sub: "No resolved incidents" },
                  { color: "shield", label: "Evac Centers", value: "3", sub: "Nearest: 0.8km away" },
                ].map(({ color, label, value, sub }) => (
                  <div key={label} className={`card border-l-4 ${color === "alert" ? "border-alert-600" : color === "shield" ? "border-shield-600" : "border-green-600"}`}>
                    <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
                    <p className="text-3xl font-extrabold text-gray-900">{value}</p>
                    <p className="text-sm text-gray-400 mt-1">{sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  {
                    label: "Mark as Safe",
                    sub: "I'm okay",
                    color: "bg-green-600 hover:bg-green-700",
                    ring: "ring-green-400",
                    icon: (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Needs Help",
                    sub: "Non-emergency",
                    color: "bg-yellow-500 hover:bg-yellow-600",
                    ring: "ring-yellow-300",
                    icon: (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Emergency",
                    sub: "Urgent response",
                    color: "bg-alert-600 hover:bg-alert-700",
                    ring: "ring-alert-400",
                    icon: (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                ].map(({ label, sub, color, ring, icon }) => (
                  <button
                    key={label}
                    className={`${color} text-white rounded-xl p-5 flex flex-col items-center gap-2 transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 ${ring} focus:ring-offset-2`}
                  >
                    {icon}
                    <span className="font-bold text-base sm:text-lg">{label}</span>
                    <span className="text-xs opacity-80">{sub}</span>
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 card">
                  <h3 className="font-bold text-gray-900 mb-4">Your Activity</h3>
                  <div className="flex items-end gap-3 h-40 px-2">
                    {[
                      { day: "Mon", h: 20 },{ day: "Tue", h: 40 },{ day: "Wed", h: 30 },
                      { day: "Thu", h: 60 },{ day: "Fri", h: 45 },{ day: "Sat", h: 10 },{ day: "Sun", h: 15 },
                    ].map(({ day, h }) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-green-500 rounded-t-md hover:bg-green-600 transition-colors" style={{ height: `${h}%` }} />
                        <span className="text-xs text-gray-400">{day}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">Reports submitted this week (placeholder)</p>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="card">
                    <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      {[
                        { emoji: "\uD83D\uDEA8", title: "Report Emergency", sub: "Submit a new incident" },
                        { emoji: "\uD83D\uDCCB", title: "My Reports", sub: "View submitted reports" },
                        { emoji: "\uD83D\uDCCD", title: "Evacuation Map", sub: "Find nearest centers" },
                        { emoji: "\uD83D\uDCDE", title: "Hotlines", sub: "Emergency contacts" },
                      ].map(({ emoji, title, sub }) => (
                        <button key={title} className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3">
                          <span className="text-lg">{emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{title}</p>
                            <p className="text-xs text-gray-400">{sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-4">Recent Alerts</h3>
                  <div className="space-y-3">
                    {[
                      { text: "Flood warning — Barangay San Roque", time: "10 min ago", color: "bg-alert-500" },
                      { text: "Road cleared — Main Highway", time: "1 hour ago", color: "bg-green-500" },
                      { text: "Evacuation drill announced", time: "3 hours ago", color: "bg-shield-500" },
                      { text: "Weather advisory: heavy rain", time: "5 hours ago", color: "bg-yellow-400" },
                      { text: "All clear — no active threats", time: "1 day ago", color: "bg-green-500" },
                    ].map(({ text, time, color }) => (
                      <div key={text} className="flex items-start gap-3">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{text}</p>
                          <p className="text-xs text-gray-400">{time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Placeholder alert feed</p>
                </div>

                <div className="card">
                  <h3 className="font-bold text-gray-900 mb-4">Report Status</h3>
                  <div className="flex items-center justify-center gap-8 py-4">
                    <div className="w-24 h-24 rounded-full border-[8px] border-green-500 border-r-alert-500 border-b-shield-500 border-l-gray-200" />
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Resolved</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-shield-500" /> In Progress</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-alert-500" /> Pending</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-200" /> Draft</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">Placeholder report distribution</p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
