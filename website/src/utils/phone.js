export const COUNTRY_CODE = "+63";
export const COUNTRY_LABEL = "PH +63";

export function normalizePhone(number) {
  if (!number) return "";
  const digits = number.replace(/\D/g, "");
  if (digits.length < 10) return number;
  if (digits.startsWith("63") && digits.length >= 11) return "+" + digits;
  if (digits.startsWith("0")) return COUNTRY_CODE + digits.slice(1);
  return COUNTRY_CODE + digits;
}
