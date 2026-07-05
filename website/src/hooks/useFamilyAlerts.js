import { useState, useEffect, useCallback } from "react";
import { getFamilyCurrentStatus, getStatusHistory } from "../services/alerts.js";

const PERIODS = [7, 15, 30];

export default function useFamilyAlerts(userId) {
  const [currentStatus, setCurrentStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCurrent = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getFamilyCurrentStatus(userId);
      setCurrentStatus(data);
    } catch (err) {
      console.error("[useFamilyAlerts] current error:", err);
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStatusHistory(userId, period);
      setHistory(data.items || []);
    } catch (err) {
      console.error("[useFamilyAlerts] history error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  function changePeriod(p) {
    if (PERIODS.includes(p)) setPeriod(p);
  }

  return {
    currentStatus,
    history,
    period,
    loading,
    error,
    changePeriod,
    refresh: fetchHistory,
  };
}
