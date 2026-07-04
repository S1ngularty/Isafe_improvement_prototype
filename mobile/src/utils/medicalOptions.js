export const DISABILITY_OPTIONS = [
  { id: "visual", label: "Visual impairment" },
  { id: "hearing", label: "Hearing impairment" },
  { id: "mobility", label: "Mobility impairment (wheelchair, crutches)" },
  { id: "speech", label: "Speech impairment" },
  { id: "cognitive", label: "Cognitive / intellectual disability" },
  { id: "mental", label: "Mental health condition" },
  { id: "deaf", label: "Hard of hearing / Deaf" },
];

export const COMORBIDITY_OPTIONS = [
  { id: "diabetes", label: "Diabetes" },
  { id: "hypertension", label: "Hypertension / High blood pressure" },
  { id: "heart", label: "Heart disease" },
  { id: "asthma", label: "Asthma / Respiratory condition" },
  { id: "kidney", label: "Kidney disease" },
  { id: "cancer", label: "Cancer" },
  { id: "stroke", label: "Stroke survivor" },
  { id: "epilepsy", label: "Epilepsy / Seizure disorder" },
  { id: "pregnancy", label: "Pregnancy-related condition" },
  { id: "immunocompromised", label: "Immunocompromised" },
];

export const AGE_RELATED_OPTIONS = [
  { id: "senior", label: "Senior citizen (60+)" },
  { id: "living_alone", label: "Living alone" },
  { id: "bedridden", label: "Bedridden / Homebound" },
];

export const ALL_GROUPS = [
  { heading: "Disabilities", options: DISABILITY_OPTIONS },
  { heading: "Medical Conditions", options: COMORBIDITY_OPTIONS },
  { heading: "Age-related", options: AGE_RELATED_OPTIONS },
];

export function encodeSpecialNeeds(selectedIds, otherText) {
  const ids = selectedIds.filter(Boolean);
  if (otherText && otherText.trim()) {
    ids.push(`other::${otherText.trim()}`);
  }
  return ids.length > 0 ? JSON.stringify(ids) : "";
}

export function decodeSpecialNeeds(value) {
  if (!value) return { selected: [], other: "" };
  try {
    const arr = JSON.parse(value);
    if (!Array.isArray(arr)) return { selected: [], other: String(value) };
    const selected = arr.filter((v) => !v.startsWith("other::"));
    const other = arr.find((v) => v.startsWith("other::"));
    return { selected, other: other ? other.slice(7) : "" };
  } catch {
    return { selected: [], other: String(value) };
  }
}

export function formatSpecialNeeds(value) {
  const { selected, other } = decodeSpecialNeeds(value);
  const allLabels = [...DISABILITY_OPTIONS, ...COMORBIDITY_OPTIONS, ...AGE_RELATED_OPTIONS];
  const labels = selected.map((id) => {
    const found = allLabels.find((o) => o.id === id);
    return found ? found.label : id;
  });
  if (other) labels.push(other);
  return labels;
}
