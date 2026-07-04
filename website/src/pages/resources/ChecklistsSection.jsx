import { useState, useEffect, useCallback } from "react";
import { CHECKLISTS } from "./resourcesData.js";

function ListIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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

function getStoredItems() {
  try {
    return JSON.parse(localStorage.getItem("checklist_progress") || "{}");
  } catch {
    return {};
  }
}

function setStoredItems(items) {
  try {
    localStorage.setItem("checklist_progress", JSON.stringify(items));
  } catch {
    // localStorage unavailable
  }
}

function ChecklistCard({ checklist, checkedCount, total, onClick }) {
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left group"
    >
      <div className="relative h-36 overflow-hidden">
        <img src={checklist.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-base font-bold text-white drop-shadow-sm">{checklist.title}</h3>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <ListIcon />
            {checkedCount} of {total} completed
          </span>
          <span className="text-sm font-bold" style={{ color: checklist.color }}>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: checklist.color }}
          />
        </div>
      </div>
    </button>
  );
}

function ChecklistDetail({ checklist, onBack }) {
  const [checked, setChecked] = useState(() => {
    const stored = getStoredItems();
    const result = {};
    for (let i = 0; i < checklist.items.length; i++) {
      result[i] = stored[`${checklist.id}-${i}`] || false;
    }
    return result;
  });

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const total = checklist.items.length;
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const allDone = checkedCount === total;

  const toggleItem = useCallback(
    (index) => {
      setChecked((prev) => {
        const next = { ...prev, [index]: !prev[index] };
        const stored = getStoredItems();
        stored[`${checklist.id}-${index}`] = next[index];
        setStoredItems(stored);
        return next;
      });
    },
    [checklist.id]
  );

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-shield-600 hover:text-shield-700 transition-colors"
      >
        <ArrowLeftIcon />
        Back to Checklists
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="relative h-44 overflow-hidden">
          <img src={checklist.image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-xl font-bold text-white drop-shadow-sm">{checklist.title}</h2>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Progress</span>
            <span className="text-lg font-bold" style={{ color: checklist.color }}>{progress}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{checkedCount} of {total} completed</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: checklist.color }}
            />
          </div>
        </div>

        <div className="px-5 py-4 space-y-1">
          {checklist.items.map((item, i) => {
            const isChecked = checked[i];
            return (
              <button
                key={i}
                onClick={() => toggleItem(i)}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group/item"
                aria-label={`${item}${isChecked ? " (completed)" : ""}`}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-all ${
                    isChecked
                      ? "border-transparent"
                      : "border-gray-300 group-hover/item:border-gray-400"
                  }`}
                  style={{ backgroundColor: isChecked ? checklist.color : "transparent" }}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm leading-relaxed ${isChecked ? "text-gray-400 line-through" : "text-gray-700"}`}>
                  {item}
                </span>
              </button>
            );
          })}
        </div>

        {allDone && (
          <div className="mx-5 mb-5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-green-800">All items completed. Great job!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChecklistsSection() {
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [checklistState, setChecklistState] = useState(() => getStoredItems());

  const getCheckedCount = (id, items) => {
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      if (checklistState[`${id}-${i}`]) count++;
    }
    return count;
  };

  useEffect(() => {
    function handleStorage() {
      setChecklistState(getStoredItems());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (selectedChecklist) {
    return (
      <ChecklistDetail
        checklist={selectedChecklist}
        onBack={() => setSelectedChecklist(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-shield-50 flex items-center justify-center shrink-0">
          <ListIcon />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Checklists</h2>
          <p className="text-xs text-gray-400">Track your preparedness with essential checklists</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CHECKLISTS.map((cl) => (
          <ChecklistCard
            key={cl.id}
            checklist={cl}
            checkedCount={getCheckedCount(cl.id, cl.items)}
            total={cl.items.length}
            onClick={() => setSelectedChecklist(cl)}
          />
        ))}
      </div>
    </div>
  );
}
