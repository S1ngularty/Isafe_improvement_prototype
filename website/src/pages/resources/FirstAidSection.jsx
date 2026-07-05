import { useState, useMemo } from "react";
import { FIRST_AID_TOPICS } from "./resourcesData.js";

function HeartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m7-7l-7 7 7 7" />
    </svg>
  );
}

function TopicCard({ topic, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left group"
    >
      <div className="relative h-36 overflow-hidden">
        <img src={topic.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-base font-bold text-white drop-shadow-sm">{topic.title}</h3>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <p className="flex-1 text-sm text-gray-500 line-clamp-2">{topic.description}</p>
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function TopicDetail({ topic, onBack }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-shield-600 hover:text-shield-700 transition-colors"
      >
        <ArrowLeftIcon />
        Back to First Aid
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="relative h-48 overflow-hidden">
          <img src={topic.image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-xl font-bold text-white drop-shadow-sm">{topic.title}</h2>
            <p className="text-sm text-white/80 mt-1">{topic.description}</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Steps</h3>
          <ol className="space-y-3">
            {topic.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-md bg-shield-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function FirstAidSection() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return FIRST_AID_TOPICS;
    const q = search.toLowerCase();
    return FIRST_AID_TOPICS.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [search]);

  if (selectedTopic) {
    return <TopicDetail topic={selectedTopic} onBack={() => setSelectedTopic(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-shield-50 flex items-center justify-center shrink-0">
          <HeartIcon />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">First Aid</h2>
          <p className="text-xs text-gray-400">Life-saving techniques for common emergencies</p>
        </div>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search first aid topics..."
          aria-label="Search first aid topics"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-shield-300 focus:border-shield-400 outline-none transition-shadow"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((topic) => (
          <TopicCard key={topic.id} topic={topic} onClick={() => setSelectedTopic(topic)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          No first aid topics match your search
        </div>
      )}
    </div>
  );
}
