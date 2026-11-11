import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import StatCards from "../Components/dashboard/StatCards.jsx";
import UserSummary from "../Components/dashboard/UserSummary.jsx";
import ModuleStatus from "../Components/dashboard/ModuleStatus.jsx";
import AuditLog from "../Components/dashboard/AuditLog.jsx";
import PendingApprovals from "../Components/dashboard/PendingApprovals.jsx";
import QuickActions from "../Components/dashboard/QuickActions.jsx";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.getStats();
        if (active) {
          setStats(res.data || res);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // useEffect(() => {
  //   const fetchModules = async () => {
  //     try {
  //       const data = await api.getModules();
  //       console.log(data);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   };

  //   fetchModules();
  // }, []);
  return (
    <div className="dashboard-content">
      {/*Page Header*/}
      <div className="page-head">
        <div className="page-head-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Real-time overview of TechNova HRMS</p>
        </div>
        <div className="page-head-right">
          <span className="live-indicator">
            <span className="live-dot" />
            Live
          </span>
          <span className="page-date">{dateStr}</span>
        </div>
      </div>

      {/*  Stats Cards  */}
      <StatCards stats={stats} loading={loading} />

      {/*  Middle Row  */}
      <div className="mid-row">
        <UserSummary stats={stats} loading={loading} />
        <ModuleStatus />
       
      </div>

      {/*  Bottom Row  */}
      <div className="bottom-row">
        <AuditLog />
        <PendingApprovals />
      </div>

      {/*  Quick Actions  */}
      <QuickActions />
    </div>
  );
}