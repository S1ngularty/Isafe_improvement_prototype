export default function ConfirmDialog({ title, message, confirmLabel, confirmClass, onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-5 w-72 mx-4">
        <p className="text-sm font-bold text-gray-900 mb-1">{title}</p>
        <p className="text-xs text-gray-500 mb-4">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onCancel} className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
