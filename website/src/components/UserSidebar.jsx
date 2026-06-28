export default function UserSidebar({ active, collapsed, onToggle, onNavigate }) {
  const items = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "forecast",
      label: "Forecast",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
    },
    {
      id: "rainviewer",
      label: "RainViewer",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2" />
        </svg>
      ),
    },
    {
      id: "hazard",
      label: "Flood Hazard",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v4M12 20v1" />
        </svg>
      ),
    },
    {
      id: "family",
      label: "Family",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    { id: "alerts", label: "Alerts", disabled: true, badge: "Soon", icon: (<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>) },
    { id: "reports", label: "Reports", disabled: true, badge: "Soon", icon: (<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>) },
    { id: "contacts", label: "Contacts", icon: (<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>) },
    { id: "settings", label: "Settings", disabled: true, badge: "Soon", icon: (<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) },
  ];

  return (
    <aside className={`bg-white border-r border-gray-200 min-h-full flex-shrink-0 hidden lg:flex flex-col transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}>
      <div className={`flex items-center h-14 px-3 border-b border-gray-100 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menu</span>}
        <button onClick={onToggle} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />)}
          </svg>
        </button>
      </div>
      <nav className={`flex-1 p-2 space-y-1 overflow-hidden ${collapsed ? "px-1" : ""}`}>
        {items.map(({ id, label, icon, disabled, badge }) => (
          <button key={id} onClick={() => !disabled && onNavigate(id)} disabled={disabled} title={collapsed ? label : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition-colors ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} ${
              disabled ? "text-gray-300 cursor-not-allowed" : active === id ? "bg-shield-50 text-shield-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
            {icon}
            {!collapsed && (<><span className="flex-1 text-left">{label}</span>{badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">{badge}</span>}</>)}
          </button>
        ))}
      </nav>
      {!collapsed && (<div className="p-4 border-t border-gray-100"><p className="text-[11px] text-gray-400 leading-relaxed">More features coming soon.</p></div>)}
    </aside>
  );
}
