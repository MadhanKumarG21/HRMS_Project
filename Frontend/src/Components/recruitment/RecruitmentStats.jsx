export default function RecruitmentStats({ results }) {
  const total = results.length;
  const top = results.filter((r) => r.matchScore >= 70).length;
  const mid = results.filter(
    (r) => r.matchScore >= 40 && r.matchScore < 70,
  ).length;
  const low = results.filter((r) => r.matchScore < 40).length;
  const avgScore =
    total > 0
      ? Math.round(results.reduce((s, r) => s + r.matchScore, 0) / total)
      : 0;

  const CARDS = [
    {
      label: "Total Screened",
      value: total,
      sub: "resumes processed",
      cls: "",
    },
    {
      label: "Strong Match",
      value: top,
      sub: "score ≥ 70%",
      cls: "rs-val-green",
    },
    {
      label: "Average Match",
      value: mid,
      sub: "score 40–69%",
      cls: "rs-val-orange",
    },
    { label: "Low Match", value: low, sub: "score < 40%", cls: "rs-val-red" },
    {
      label: "Avg. ATS Score",
      value: `${avgScore}%`,
      sub: "across all resumes",
      cls: "rs-val-blue",
    },
  ];

  return (
    <div className="rs-grid">
      {CARDS.map(({ label, value, sub, cls }) => (
        <div key={label} className="rs-card">
          <p className="rs-label">{label}</p>
          <p className={`rs-value ${cls}`}>{value}</p>
          <p className="rs-sub">{sub}</p>
        </div>
      ))}
    </div>
  );
}
