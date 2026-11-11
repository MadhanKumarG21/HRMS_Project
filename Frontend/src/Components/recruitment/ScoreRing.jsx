export default function ScoreRing({ score }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;
  const color = score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";

  return (
    <div className="sr-wrap">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="5"
        />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={fill}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="sr-label" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}
