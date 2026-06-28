import { useState, useEffect, useCallback } from "react";
import { fetchEvacuationAreas } from "../services/evac.js";
import { haversine } from "../utils/geo.js";

export default function useEvacuationAreas(lat, lng) {
  const [areas, setAreas] = useState([]);
  const [nearest, setNearest] = useState(null);
  const [nearestDist, setNearestDist] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchEvacuationAreas();
      setAreas(data);

      if (lat != null && lng != null && data.length > 0) {
        let best = null;
        let bestDist = Infinity;
        for (const a of data) {
          const d = haversine(lat, lng, a.latitude, a.longitude);
          if (d < bestDist) {
            bestDist = d;
            best = a;
          }
        }
        setNearest(best);
        setNearestDist(bestDist);
      }
    } catch {
      setAreas([]);
      setNearest(null);
      setNearestDist(null);
    }
  }, [lat, lng]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { areas, nearest, nearestDist, refresh };
}
