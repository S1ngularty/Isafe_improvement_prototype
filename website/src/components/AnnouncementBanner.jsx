import { useState, useEffect, useCallback } from "react";
import { fetchActiveAnnouncements } from "../services/announcements";

export default function AnnouncementBanner({ onClick }) {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadAnnouncements() {
      try {
        const data = await fetchActiveAnnouncements();
        if (!cancelled) setSlides(data || []);
      } catch {
        // Silently fail — banner stays empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAnnouncements();
    return () => { cancelled = true; };
  }, []);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % (slides.length || 1));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const id = setInterval(advance, 5000);
    return () => clearInterval(id);
  }, [advance, slides.length]);

  if (loading) {
    return (
      <div className="h-24 rounded-xl bg-shield-800/60 animate-pulse flex items-center px-5 gap-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-shield-700/60" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-shield-700/60 rounded w-1/3" />
          <div className="h-3 bg-shield-700/60 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (slides.length === 0) return null;

  const s = slides[current];

  return (
    <div
      onClick={() => onClick?.(s)}
      className="relative h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-shield-900 cursor-pointer group"
    >
      {s.type === "video" ? (
        <video
          src={s.image_url}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          loop
          playsInline
          autoPlay
        />
      ) : (
        <img
          src={s.image_url}
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-shield-900/80 via-shield-900/50 to-transparent" />

      <div className="relative z-10 h-full flex items-center px-5 gap-4">
        <div className="w-11 h-11 rounded-full bg-alert-600/90 flex items-center justify-center shrink-0 ring-2 ring-white/20">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-bold truncate">{s.title}</p>
          <p className="text-red-200 text-xs truncate mt-0.5">{s.description}</p>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current ? "bg-white w-5 h-2" : "bg-white/30 w-2 h-2 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
