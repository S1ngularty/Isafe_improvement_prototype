import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);
  const timers = useRef({});

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    idCounter.current += 1;
    const id = idCounter.current;
    
    setToasts((prev) => [...prev, { id, message, type }]);
    
    const timerId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, duration);
    
    timers.current[id] = timerId;
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
