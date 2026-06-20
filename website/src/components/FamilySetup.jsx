import { useState } from "react";
import { createFamily, joinFamily } from "../services/family.js";
import { useToast } from "../context/ToastContext";

export default function FamilySetup({ onDone }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const family = await createFamily(name.trim());
      setGeneratedCode(family.code);
      showToast("Family created!", "success");
      onDone();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await joinFamily(code.trim());
      showToast("Joined family!", "success");
      onDone();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 w-full max-w-md mx-auto">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Family Setup</h3>
      <p className="text-sm text-gray-500 mb-4">Create or join a family to share real-time locations.</p>

      <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
        <button
          onClick={() => setTab("create")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === "create" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Create Family
        </button>
        <button
          onClick={() => setTab("join")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === "join" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Join Family
        </button>
      </div>

      {tab === "create" ? (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Family Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dela Cruz Household"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
            maxLength={50}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="mt-3 w-full py-2 bg-shield-600 text-white rounded-lg text-sm font-semibold hover:bg-shield-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "Creating..." : "Create Family"}
          </button>
          {generatedCode && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-xs text-green-700 font-medium mb-1">Share this code with family members:</p>
              <p className="text-2xl font-bold text-green-800 tracking-widest">{generatedCode}</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Family Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            maxLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none tracking-widest text-center uppercase"
          />
          <button
            onClick={handleJoin}
            disabled={loading || code.trim().length < 6}
            className="mt-3 w-full py-2 bg-shield-600 text-white rounded-lg text-sm font-semibold hover:bg-shield-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "Joining..." : "Join Family"}
          </button>
        </div>
      )}
    </div>
  );
}
