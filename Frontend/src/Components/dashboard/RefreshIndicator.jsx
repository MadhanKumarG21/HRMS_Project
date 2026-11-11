import { useState, useEffect } from "react";

export default function RefreshIndicator() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="refresh-indicator">
      <span className="live-dot" />
      Live · Updated {lastRefresh.toLocaleTimeString()}
    </div>
  );
}
