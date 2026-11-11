export default function ModuleStats({ modules, loading }) {
  const total      = modules.length;
  const active     = modules.filter((m) => m.status === "Active").length;
  const suspended  = modules.filter((m) => m.status === "Suspended").length;
  const categories = new Set(modules.map((m) => m.category).filter(Boolean)).size;

  const v = (n) => (loading ? "—" : n);

  const CARDS = [
    { label: "Total Modules",     value: v(total),      sub: "registered",        cls: ""              },
    { label: "Active",            value: v(active),     sub: "running now",       cls: "ms-val-green"  },
    { label: "Suspended",         value: v(suspended),  sub: "disabled",          cls: "ms-val-red"    },
    { label: "Categories",        value: v(categories), sub: "module groups",     cls: "ms-val-blue"   },
  ];

  return (
    <div className="ms-stats-grid">
      {CARDS.map(({ label, value, sub, cls }) => (
        <div key={label} className="ms-stat-card">
          <p className="ms-stat-label">{label}</p>
          <div className="ms-stat-row">
            <span className={`ms-stat-value ${cls}`}>{value}</span>
            <span className="ms-stat-sub">{sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}