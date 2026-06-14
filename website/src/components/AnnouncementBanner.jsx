import { useState, useEffect, useCallback } from "react";
import { fetchActiveAnnouncements } from "../services/announcements";

const FALLBACK_SLIDES = [
  { id: "f1", title: "Flood Alert", description: "Stay vigilant. Report flooding in your area.", type: "video", image_url: "https://ipkrnojfydmjqmawhrev.supabase.co/storage/v1/object/public/Assets/flood.mp4" },
  { id: "f2", title: "Disaster Preparedness", description: "Know your evacuation routes and emergency contacts.", type: "image", image_url: "https://cdia.asia/wp-content/uploads/2022/06/Drrm2-copy-1024x682.jpg" },
  { id: "f3", title: "Community Response", description: "Barangay officials are on standby. Report emergencies.", type: "image", image_url: "https://media.philstar.com/photos/2021/12/18/odette-response-22021-12-1817-26-20_2021-12-18_23-18-30.jpg" },
  { id: "f4", title: "Environmental Watch", description: "Monitor local conditions. Early warning saves lives.", type: "image", image_url: "https://imgs.mongabay.com/wp-content/uploads/sites/20/2021/02/24074757/DSC_0822.jpg" },
  { id: "f5", title: "Relief Operations", description: "Coordination centers are active. Help is on the way.", type: "image", image_url: "https://www.ifrc.org/sites/default/files/styles/article_press_release_featured_image/public/2022-01/p-PHL_8030_3.jpg?itok=W9O9jclC" },
];

export default function AnnouncementBanner() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetchActiveAnnouncements()
      .then((data) => {
        if (data && data.length > 0) setSlides(data);
      })
      .catch(() => {});
  }, []);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const id = setInterval(advance, 5000);
    return () => clearInterval(id);
  }, [advance, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative h-20 rounded-xl overflow-hidden shadow-md flex-shrink-0 group">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          aria-hidden={i !== current}
        >
          {slide.type === "video" ? (
            <video src={slide.image_url} className="absolute inset-0 w-full h-full object-cover" muted loop playsInline autoPlay />
          ) : (
            <img src={slide.image_url} className="absolute inset-0 w-full h-full object-cover" alt="" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-shield-900/85 to-shield-900/50" />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-shield-900/70 to-transparent pointer-events-none" />

      <div className="relative z-10 h-full flex items-center px-5 gap-4">
        <div className="w-10 h-10 rounded-full bg-alert-600 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-bold truncate">{slides[current].title}</p>
          <p className="text-red-200 text-xs truncate mt-0.5">{slides[current].description}</p>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 z-10">
          {slides.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-white w-3" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
