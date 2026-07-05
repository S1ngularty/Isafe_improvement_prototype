import { useState } from "react";
import EmergencyGuides from "./EmergencyGuides.jsx";
import FirstAidSection from "./FirstAidSection.jsx";
import ChecklistsSection from "./ChecklistsSection.jsx";
import EmergencyCall from "./EmergencyCall.jsx";
import { EMERGENCY_GUIDES, FIRST_AID_TOPICS, CHECKLISTS } from "./resourcesData.js";

function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m7-7l-7 7 7 7" />
    </svg>
  );
}

const SECTIONS = [
  {
    id: "guides",
    label: "Emergency Guides",
    description: "Step-by-step procedures for disasters",
    count: EMERGENCY_GUIDES.length,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    color: "text-shield-600",
    bgColor: "bg-shield-50",
    borderColor: "border-shield-200",
  },
  {
    id: "firstaid",
    label: "First Aid",
    description: "Life-saving techniques and procedures",
    count: FIRST_AID_TOPICS.length,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    id: "checklists",
    label: "Checklists",
    description: "Track your emergency preparedness",
    count: CHECKLISTS.length,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "emergency-call",
    label: "Emergency Call",
    description: "SOS, support services, and contacts",
    count: null,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
];

function ResourceCard({ section, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-xl shadow-sm border ${section.borderColor} overflow-hidden hover:shadow-md transition-all text-left group`}
    >
      <div className={`p-5 ${section.bgColor}`}>
        <div className={`w-14 h-14 rounded-xl ${section.bgColor} border ${section.borderColor} flex items-center justify-center ${section.color} group-hover:scale-105 transition-transform`}>
          {section.icon}
        </div>
      </div>
      <div className="px-5 py-4 space-y-1">
        <h3 className="text-base font-bold text-gray-900">{section.label}</h3>
        <p className="text-sm text-gray-500">{section.description}</p>
        {section.count !== null && (
          <p className="text-xs text-gray-400">{section.count} topics</p>
        )}
      </div>
    </button>
  );
}

export default function ResourcesHub() {
  const [view, setView] = useState(null);

  if (view) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => setView(null)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeftIcon />
            Back to Resources
          </button>
        </div>
        {view === "guides" && <EmergencyGuides />}
        {view === "firstaid" && <FirstAidSection />}
        {view === "checklists" && <ChecklistsSection />}
        {view === "emergency-call" && <EmergencyCall />}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Resources</h2>
        <p className="text-xs text-gray-400 mt-1">Emergency preparedness guides, first aid, checklists, and contacts</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <ResourceCard
            key={section.id}
            section={section}
            onClick={() => setView(section.id)}
          />
        ))}
      </div>
    </div>
  );
}
