import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Modal from "./Modal";

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const PASSWORD_RULES = [
  { re: /.{8,}/, label: "At least 8 characters" },
  { re: /[A-Z]/, label: "At least 1 uppercase letter" },
  { re: /[a-z]/, label: "At least 1 lowercase letter" },
  { re: /[0-9]/, label: "At least 1 number" },
  { re: /[^A-Za-z0-9]/, label: "At least 1 special character" },
];

export default function AuthModal({ open, onClose, initialTab = "login" }) {
  const { login, signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [fullName, setFullName] = useState("");
  const [barangay, setBarangay] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [ruleResults, setRuleResults] = useState([]);
  const [strength, setStrength] = useState(0);
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchTab(t) {
    setTab(t);
    setErrors({});
    setTouched({});
    setServerError("");
    setRuleResults([]);
    setStrength(0);
    setConfirm("");
    setPassword("");
    setFullName("");
    setBarangay("");
    setPhoneNumber("");
    setBloodType("");
    setHouseholdSize("");
    setSpecialNeeds("");
  }

  function validate(field, value) {
    if (field === "fullName") {
      if (!value.trim()) return "Full name is required.";
      if (value.trim().length < 2) return "Name must be at least 2 characters.";
    }
    if (field === "barangay") {
      if (!value.trim()) return "Barangay is required.";
    }
    if (field === "phoneNumber") {
      if (value && !/^\+63\d{10}$/.test(value)) return "Use +63 format (e.g. +639123456789).";
    }
    if (field === "email") {
      if (!value.trim()) return "Email is required.";
      if (!EMAIL_RE.test(value)) return "Please enter a valid email address.";
    }
    if (field === "password" && tab === "signup") {
      // full rules evaluated via evalPassword, no inline error here
      return "";
    }
    if (field === "password" && tab === "login") {
      if (!value) return "Password is required.";
    }
    if (field === "confirm") {
      if (!value) return "Please confirm your password.";
      if (value !== password) return "Passwords do not match.";
    }
    return "";
  }

  function evalPassword(pw) {
    const results = PASSWORD_RULES.map((r) => r.re.test(pw));
    setRuleResults(results);
    setStrength(results.filter(Boolean).length);
  }

  function markTouched(field) {
    setTouched((p) => ({ ...p, [field]: true }));
  }

  function handleBlur(field) {
    markTouched(field);
    if (field === "fullName") setErrors((p) => ({ ...p, fullName: validate("fullName", fullName) }));
    if (field === "barangay") setErrors((p) => ({ ...p, barangay: validate("barangay", barangay) }));
    if (field === "phoneNumber") setErrors((p) => ({ ...p, phoneNumber: validate("phoneNumber", phoneNumber) }));
    if (field === "email") setErrors((p) => ({ ...p, email: validate("email", email) }));
    if (field === "confirm") setErrors((p) => ({ ...p, confirm: validate("confirm", confirm) }));
  }

  function handleEmailChange(val) {
    setEmail(val);
    if (touched.email) setErrors((p) => ({ ...p, email: validate("email", val) }));
    setServerError("");
  }

  function handlePhoneChange(val) {
    setPhoneNumber(val);
    if (touched.phoneNumber) setErrors((p) => ({ ...p, phoneNumber: validate("phoneNumber", val) }));
  }

  function handleFullNameChange(val) {
    setFullName(val);
    if (touched.fullName) setErrors((p) => ({ ...p, fullName: validate("fullName", val) }));
  }

  function handleBarangayChange(val) {
    setBarangay(val);
    if (touched.barangay) setErrors((p) => ({ ...p, barangay: validate("barangay", val) }));
  }

  function handlePasswordChange(val) {
    setPassword(val);
    if (tab === "signup") {
      evalPassword(val);
      if (touched.confirm) setErrors((p) => ({ ...p, confirm: validate("confirm", confirm) }));
    }
  }

  function handleConfirmChange(val) {
    setConfirm(val);
    if (touched.confirm) setErrors((p) => ({ ...p, confirm: validate("confirm", val) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const emailErr = validate("email", email);
    setErrors((p) => ({ ...p, email: emailErr }));
    markTouched("email");

    if (tab === "login") {
      const pwErr = validate("password", password);
      setErrors((p) => ({ ...p, password: pwErr }));
      markTouched("password");
      if (emailErr || pwErr) return;
    }

    if (tab === "signup") {
      const nameErr = validate("fullName", fullName);
      const brgyErr = validate("barangay", barangay);
      setErrors((p) => ({ ...p, fullName: nameErr, barangay: brgyErr }));
      markTouched("fullName");
      markTouched("barangay");
      if (nameErr || brgyErr) return;
      if (strength < PASSWORD_RULES.length) return;
      const confirmErr = validate("confirm", confirm);
      setErrors((p) => ({ ...p, confirm: confirmErr }));
      markTouched("confirm");
      if (confirmErr) return;
    }

    setSubmitting(true);
    try {
      if (tab === "login") {
        const { role } = await login(email, password);
        onClose();
        navigate(role === "admin" ? "/admin" : "/dashboard", { replace: true });
      } else {
        const data = await signup(email, password, {
          full_name: fullName.trim(),
          barangay: barangay.trim(),
          phone_number: phoneNumber.trim(),
          blood_type: bloodType,
          household_size: householdSize || null,
          special_needs: specialNeeds.trim(),
        });
        onClose();
        if (!data.session) {
          showToast("Account created! Check your email to confirm your address.", "success", 7000);
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    } catch (err) {
      setServerError(err.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field) =>
    "input-field" + (errors[field] && touched[field] ? " input-error" : touched[field] && !errors[field] ? " input-valid" : "");

  const barColor = strength <= 2 ? "bg-red-500" : strength <= 4 ? "bg-yellow-500" : "bg-green-500";

  return (
    <Modal open={open} onClose={onClose}>
      <div className="px-8 py-6">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-shield-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">CityShield</h2>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              tab === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab("signup")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              tab === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="auth-email"
              type="email"
              className={inputClass("email")}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur("email")}
              autoComplete="email"
            />
            {errors.email && touched.email && <p className="field-error">{errors.email}</p>}
          </div>

          {tab === "login" && (
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="auth-password"
                type="password"
                className={inputClass("password")}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => handleBlur("password")}
                autoComplete="current-password"
              />
              {errors.password && touched.password && <p className="field-error">{errors.password}</p>}
            </div>
          )}

          {tab === "signup" && (
            <>
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  className={inputClass("fullName")}
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  onBlur={() => handleBlur("fullName")}
                  autoComplete="name"
                />
                {errors.fullName && touched.fullName && <p className="field-error">{errors.fullName}</p>}
              </div>
              <div>
                <label htmlFor="auth-barangay" className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                <input
                  id="auth-barangay"
                  type="text"
                  className={inputClass("barangay")}
                  placeholder="Barangay San Isidro"
                  value={barangay}
                  onChange={(e) => handleBarangayChange(e.target.value)}
                  onBlur={() => handleBlur("barangay")}
                  autoComplete="address-level3"
                />
                {errors.barangay && touched.barangay && <p className="field-error">{errors.barangay}</p>}
              </div>
              <div>
                <label htmlFor="auth-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  id="auth-phone"
                  type="tel"
                  className={inputClass("phoneNumber")}
                  placeholder="+639123456789"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={() => handleBlur("phoneNumber")}
                  autoComplete="tel"
                />
                {errors.phoneNumber && touched.phoneNumber && <p className="field-error">{errors.phoneNumber}</p>}
              </div>
              <div>
                <label htmlFor="auth-blood" className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                <select
                  id="auth-blood"
                  className="input-field"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                >
                  <option value="">Not specified</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="auth-hh" className="block text-sm font-medium text-gray-700 mb-1">Household Size</label>
                <input
                  id="auth-hh"
                  type="number"
                  min="1"
                  max="20"
                  className="input-field"
                  placeholder="Number of persons in household"
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="auth-needs" className="block text-sm font-medium text-gray-700 mb-1">Special Needs</label>
                <textarea
                  id="auth-needs"
                  className="input-field min-h-[60px] resize-y"
                  placeholder="Disabilities, medical conditions, or accessibility requirements"
                  value={specialNeeds}
                  onChange={(e) => setSpecialNeeds(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPw ? "text" : "password"}
                    className="input-field pr-10"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPw ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a10.04 10.04 0 012.332-3.613m3.278-2.097A9.958 9.958 0 0112 5c5 0 9.27 3.11 11 7.5a10.037 10.037 0 01-4.5 5.562M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18"/></svg>
                    )}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div className={`password-strength-bar ${barColor}`} style={{ width: `${(strength / PASSWORD_RULES.length) * 100}%` }} />
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {PASSWORD_RULES.map((r, i) => (
                        <li key={i} className={`flex items-center gap-2 ${ruleResults[i] ? "text-green-600" : "text-gray-400"}`}>
                          <span>{ruleResults[i] ? "\u2713" : "\u25CF"}</span> {r.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="auth-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  id="auth-confirm"
                  type="password"
                  className={inputClass("confirm")}
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => handleConfirmChange(e.target.value)}
                  onBlur={() => handleBlur("confirm")}
                  autoComplete="new-password"
                />
                {errors.confirm && touched.confirm && <p className="field-error">{errors.confirm}</p>}
              </div>
            </>
          )}

          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{serverError}</div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
            {submitting
              ? tab === "login" ? "Signing in..." : "Creating account..."
              : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
