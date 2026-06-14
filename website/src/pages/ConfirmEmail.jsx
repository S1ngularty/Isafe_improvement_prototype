import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
<<<<<<< Updated upstream
import { verifyOtp, signOut } from "../js/auth";
=======
import { verifyOtp, signOut } from "../services/auth";
>>>>>>> Stashed changes
import { useToast } from "../context/ToastContext";

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") || "signup";

    if (!tokenHash) {
      setStatus("error");
      setMessage("Invalid confirmation link. Please request a new one.");
      return;
    }

    verifyOtp(tokenHash, type)
      .then(async () => {
        setStatus("success");
        setMessage("Your email has been confirmed.");
        await signOut();
        showToast("Email confirmed! Please sign in.", "success", 5000);
        setTimeout(() => navigate("/", { replace: true }), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Verification failed. The link may have expired.");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5">
          {status === "verifying" && (
            <div className="w-8 h-8 border-4 border-shield-600 border-t-transparent rounded-full animate-spin" />
          )}
          {status === "success" && (
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {status === "verifying" ? "Verifying your email..." : status === "success" ? "Email Confirmed!" : "Verification Failed"}
        </h2>
        <p className="text-gray-600 mb-6">{message}</p>
        {status === "error" && (
          <Link to="/" className="btn-primary inline-block">Back to Home</Link>
        )}
      </div>
    </div>
  );
}
