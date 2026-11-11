import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api.js";
import Icon from "../Icon.jsx";

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getIntegrationsStatus();
      setIntegrations(data?.integrations || []);
    } catch (err) {
      setError(err.message || "Failed to check integration status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="card">
      <div className="card-title">Integration status</div>

      {loading && integrations.length === 0 ? (
        <div className="integration-row">
          <span>Checking integrations...</span>
        </div>
      ) : error ? (
        <div className="integration-row">
          <span style={{ color: "var(--danger)" }}>{error}</span>
        </div>
      ) : (
        integrations.map(({ key, icon, name, connected, status, latency }) => (
          <div className="integration-row" key={key}>
            <div className="int-left">
              <div className="int-icon">
                <Icon
                  name={icon}
                  style={{
                    color: connected ? "var(--success)" : "var(--danger)",
                    fontSize: 20,
                  }}
                />
              </div>
              <div className="int-info">
                <span className="int-name">{name}</span>
                <span className="int-latency">
                  {latency != null ? `${latency}ms` : "—"}
                </span>
              </div>
            </div>
            <span
              className={`int-status ${connected ? "int-connected" : "int-disconnected"}`}
            >
              {status}
            </span>
          </div>
        ))
      )}

      <button className="manage-btn" onClick={fetchStatus} disabled={loading}>
        {loading ? "Checking..." : "Refresh status"}
      </button>
    </div>
  );
}