import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthModal from "../components/AuthModal";

const SLIDES = [
  {
    type: "video",
    src: "https://ipkrnojfydmjqmawhrev.supabase.co/storage/v1/object/public/Assets/flood.mp4",
  },
  { type: "image", src: "https://cdia.asia/wp-content/uploads/2022/06/Drrm2-copy-1024x682.jpg" },
  { type: "image", src: "https://media.philstar.com/photos/2021/12/18/odette-response-22021-12-1817-26-20_2021-12-18_23-18-30.jpg" },
  { type: "image", src: "https://imgs.mongabay.com/wp-content/uploads/sites/20/2021/02/24074757/DSC_0822.jpg" },
  { type: "image", src: "https://www.ifrc.org/sites/default/files/styles/article_press_release_featured_image/public/2022-01/p-PHL_8030_3.jpg?itok=W9O9jclC" },
];

export default function Home() {
  const { session, role, logout } = useAuth();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("login");
  const [current, setCurrent] = useState(0);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(advance, 5000);
    return () => clearInterval(intervalRef.current);
  }, [advance]);

  useEffect(() => {
    if (videoRef.current) {
      if (SLIDES[current].type === "video") {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [current]);

  function goTo(i) {
    setCurrent(i);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(advance, 5000);
  }

  function openModal(tab) {
    setModalTab(tab);
    setModalOpen(true);
  }

  async function handleLogout() {
    await logout();
    showToast("Logged out successfully.", "info", 4000);
  }

  return (
    <div className="min-h-screen flex flex-col">

      <header className="bg-shield-800 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-white">Prototype</span>
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <a href="#features" className="hidden sm:inline text-white/70 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hidden sm:inline text-white/70 hover:text-white transition-colors">How It Works</a>
              {session ? (
                <>
                  <span className="text-white/70 hidden md:inline">{session.user.email}</span>
                  {role === "admin" && (
                    <Link to="/admin" className="bg-alert-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-alert-500 transition-colors">Admin</Link>
                  )}
                  <Link to="/dashboard" className="border-2 border-white/30 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/10 transition-colors text-sm">Dashboard</Link>
                  <button onClick={handleLogout} className="text-white/70 hover:text-white transition-colors">Log Out</button>
                </>
              ) : (
                <>
                  <button onClick={() => openModal("login")} className="border-2 border-white/30 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/10 transition-colors text-sm">Log In</button>
                  <button onClick={() => openModal("signup")} className="bg-white text-shield-800 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors text-sm">Sign Up</button>

                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative h-screen min-h-[600px] max-h-[900px] flex items-center overflow-hidden">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === current ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-hidden={i !== current}
            >
              {slide.type === "video" ? (
                <video
                  ref={i === 0 ? videoRef : null}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={slide.src}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  className="absolute inset-0 w-full h-full object-cover"
                  src={slide.src}
                  alt=""
                  loading="lazy"
                />
              )}
            </div>
          ))}

          <div className="absolute inset-0 bg-gradient-to-br from-shield-900/80 via-shield-800/70 to-shield-700/60 z-[5]" />

          <button
            onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => goTo((current + 1) % SLIDES.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === current ? "bg-white w-6" : "bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-white drop-shadow-lg">
                Protecting Communities.<br />
                <span className="text-alert-500">Responding Faster.</span>
              </h1>

              <p className="text-lg sm:text-xl text-red-100 mb-10 leading-relaxed max-w-2xl drop-shadow">

                Prototype connects barangay officials and residents in real time during disasters and emergencies. Report incidents, receive alerts, and coordinate responses — all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {session ? (
                  <Link to="/dashboard" className="btn-alert px-8 py-4 text-lg inline-block text-center">Go to Dashboard</Link>
                ) : (
                  <button onClick={() => openModal("signup")} className="btn-alert px-8 py-4 text-lg inline-block text-center">Get Started</button>
                )}
                <a href="#features" className="btn-outline px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-shield-700 inline-block text-center">Learn More</a>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent z-10" />
        </section>

        <section id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Built for Rapid Response</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Everything you need to keep your community safe and informed during critical moments.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-alert-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Emergency Reporting</h3>
                <p className="text-gray-600">Instantly report fires, floods, earthquakes, and other emergencies with location details and severity levels.</p>
              </div>
              <div className="card text-center">

                <div className="w-14 h-14 bg-shield-100 rounded-xl flex items-center justify-center mx-auto mb-5">

                  <svg className="w-7 h-7 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Alerts</h3>
                <p className="text-gray-600">Receive instant notifications from barangay officials about evacuations, road closures, and safety advisories.</p>
              </div>
              <div className="card text-center">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Barangay Coordination</h3>
                <p className="text-gray-600">Streamlined communication between officials and residents. Assign response teams, share resources, and track incidents.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Getting started with CityShield takes less than a minute.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Create Your Account", desc: "Sign up as a resident or barangay official with your email address." },
                { step: "2", title: "Report or Monitor", desc: "Submit emergency reports or view active alerts from your barangay." },
                { step: "3", title: "Stay Informed", desc: "Receive real-time updates and coordinate with your community for faster response." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="relative">
                  <div className="flex items-center justify-center w-12 h-12 bg-shield-600 text-white rounded-full text-xl font-bold mx-auto mb-4">{step}</div>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h3>
                  <p className="text-gray-600 text-center">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-shield-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to protect your community?</h2>

            <p className="text-lg text-red-200 mb-10 max-w-2xl mx-auto">Join thousands of barangays already using CityShield to safeguard their residents during emergencies.</p>

            {session ? (
              <Link to="/dashboard" className="btn-alert px-8 py-4 text-lg inline-block">Go to Dashboard</Link>
            ) : (
              <button onClick={() => openModal("signup")} className="btn-alert px-8 py-4 text-lg inline-block">Start Free Today</button>
            )}
          </div>
        </section>
      </main>


      <footer className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-shield-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="text-gray-900 font-bold">Prototype</span>
          </div>
          <p className="text-sm text-gray-400">&copy; 2026 Prototype. All rights reserved.</p>

        </div>
      </footer>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab={modalTab} />
    </div>
  );
}
