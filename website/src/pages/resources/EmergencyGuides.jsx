import { useState } from "react";
import { EMERGENCY_GUIDES, KEY_REMINDERS, EMERGENCY_CONTACTS } from "./resourcesData.js";

function ChevronDown() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GuideCard({ guide, isOpen, onToggle }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-all ${isOpen ? "border-shield-300 shadow-md" : "border-gray-200"}`}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full text-left"
      >
        <div className="relative h-40 overflow-hidden rounded-t-xl">
          <img src={guide.image} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-lg font-bold text-white drop-shadow-sm">{guide.title}</h3>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-sm text-gray-500">{guide.description}</p>
          <span className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            <ChevronDown />
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <ol className="mt-3 space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-md bg-shield-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function EmergencyGuides() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-shield-50 flex items-center justify-center shrink-0">
          <ShieldIcon />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Emergency Guides</h2>
          <p className="text-xs text-gray-400">Step-by-step procedures for common disasters</p>
        </div>
      </div>

      <div className="space-y-4">
        {EMERGENCY_GUIDES.map((guide) => (
          <GuideCard
            key={guide.id}
            guide={guide}
            isOpen={openId === guide.id}
            onToggle={() => setOpenId(openId === guide.id ? null : guide.id)}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-shield-600 p-5">
        <div className="flex items-center gap-2 mb-3">
          <InfoIcon />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Key Reminders</h3>
        </div>
        <div className="space-y-2">
          {KEY_REMINDERS.map((reminder, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="shrink-0 w-4 h-4 rounded bg-shield-600 flex items-center justify-center mt-0.5">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <p className="text-sm text-gray-600">{reminder}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <PhoneIcon />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emergency Numbers</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {EMERGENCY_CONTACTS.map((contact, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: contact.color + "20" }}>
                <PhoneIcon />
              </div>
              <div>
                <p className="text-xs text-gray-500">{contact.label}</p>
                <p className="text-sm font-bold text-gray-900">{contact.number}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
