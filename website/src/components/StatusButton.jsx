export default function StatusButton({ label, sub, icon, color, activeColor, ringColor, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl transition-all text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 ${ringColor} ${
        active ? `${activeColor} scale-[1.02] ring-2 ring-white/50` : color
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-bold text-sm sm:text-base">{label}</span>
      <span className="text-[10px] opacity-80">{sub}</span>
    </button>
  );
}
