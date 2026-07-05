import { useState, useEffect, useCallback } from "react";
import { getFamilyCurrentStatus, getStatusHistory } from "../services/alerts.js";

const PERIODS = [7, 15, 30];
const HISTORY_LIMIT = 20;

export default function useFamilyAlerts(userId) {
  const [currentStatus, setCurrentStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const fetchCurrent = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getFamilyCurrentStatus(userId);
      setCurrentStatus(data);
    } catch (err) {
      console.error("[useFamilyAlerts] current error:", err);
    }
  }, [userId]);

  const fetchHistory = useCallback(async (page = 1, append = false) => {
    if (!userId) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getStatusHistory(userId, period, page, HISTORY_LIMIT);
      if (append) {
        setHistory((prev) => [...prev, ...(data.items || [])]);
      } else {
        setHistory(data.items || []);
      }
      setHistoryTotal(data.total || 0);
      setHistoryPage(page);
    } catch (err) {
      console.error("[useFamilyAlerts] history error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  function changePeriod(p) {
    if (PERIODS.includes(p)) {
      setPeriod(p);
      setHistoryPage(1);
    }
  }

  function loadMore() {
    if (!loadingMore && history.length < historyTotal) {
      fetchHistory(historyPage + 1, true);
    }
  }

  const hasMore = history.length < historyTotal;

  return {
    currentStatus,
    history,
    period,
    loading,
    loadingMore,
    error,
    hasMore,
    changePeriod,
    loadMore,
    refresh: () => fetchHistory(1),
  };
}
