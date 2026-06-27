export default function AnnouncementDetail({ announcement, onClose }) {
  if (!announcement) return null;

  const isVideo = announcement.type === "video";

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[8vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="relative">
          {announcement.image_url ? (
            isVideo ? (
              <video
                src={announcement.image_url}
                className="w-full h-56 sm:h-72 object-cover rounded-t-2xl bg-gray-900"
                controls
                autoPlay
              />
            ) : (
              <img
                src={announcement.image_url}
                className="w-full h-56 sm:h-72 object-cover rounded-t-2xl bg-gray-100"
                alt=""
              />
            )
          ) : (
            <div className="w-full h-40 bg-shield-800 rounded-t-2xl flex items-center justify-center">
              <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{announcement.title}</h2>
          <p className="text-xs text-gray-500 mb-4">
            {new Date(announcement.created_at).toLocaleDateString("en-PH", {
              year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>

          {announcement.long_description ? (
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
              {announcement.long_description}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No additional details available.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
