import { EMERGENCY_CONTACTS, SUPPORT_SERVICES } from "./resourcesData.js";

function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function getServiceIcon(type) {
  const cls = "w-6 h-6";
  switch (type) {
    case "medical":
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
    case "rescue":
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    case "food":
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case "shelter":
      return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    default:
      return <PhoneIcon />;
  }
}

export default function EmergencyCall() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
          <AlertIcon />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Emergency Call</h2>
          <p className="text-xs text-gray-400">Quick access to emergency services and support</p>
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mx-auto shadow-lg animate-pulse">
          <PhoneIcon />
        </div>
        <div>
          <p className="text-lg font-bold text-red-900">Emergency?</p>
          <p className="text-sm text-red-700 mt-1">Call emergency services immediately</p>
        </div>
        <a
          href="tel:911"
          className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-bold text-lg rounded-xl hover:bg-red-700 transition-colors shadow-md"
          aria-label="Call 911 emergency"
        >
          <PhoneIcon />
          Call 911
        </a>
        <p className="text-xs text-red-500">or dial 112 from any mobile phone</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Support Services</p>
        </div>
        <div className="divide-y divide-gray-50">
          {SUPPORT_SERVICES.map((svc, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: svc.color + "15" }}
              >
                <span style={{ color: svc.color }}>{getServiceIcon(svc.icon)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{svc.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{svc.description}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer" style={{ color: svc.color, borderColor: svc.color + "40" }}>
                Request
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emergency Contacts</p>
        </div>
        <div className="divide-y divide-gray-50">
          {EMERGENCY_CONTACTS.map((contact, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: contact.color + "15" }}>
                <PhoneIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{contact.label}</p>
                <p className="text-xs text-gray-400">{contact.number}</p>
              </div>
              <a
                href={`tel:${contact.number.replace(/[^0-9]/g, "")}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: contact.color, backgroundColor: contact.color + "10" }}
              >
                Call
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
