import { useState } from "react";
import React from "react";
import ScoreRing from "./ScoreRing.jsx";
import Icon from "../Icon.jsx";

const RANK_COLORS = ["#F59E0B", "#94A3B8", "#D97706"];

function getRankLabel(i) {
  if (i === 0) return { label: "#1", color: "#F59E0B" };
  if (i === 1) return { label: "#2", color: "#94A3B8" };
  if (i === 2) return { label: "#3", color: "#D97706" };
  return { label: `#${i + 1}`, color: "#64748B" };
}

function KeywordPill({ word, matched }) {
  return (
    <span className={`kw-pill ${matched ? "kw-match" : "kw-miss"}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
        {matched ? "check" : "close"}
      </span>
      {word}
    </span>
  );
}

function ExpandedRow({ candidate }) {
  return (
    <tr className="lb-expanded-row">
      <td colSpan={7} className="lb-expanded-td">
        <div className="lb-expanded-content">

          {/* Details grid */}
          <div className="lb-expanded-grid">
            {[
              { icon: "mail",   label: "Email",      value: candidate.email      || "Not found"     },
              { icon: "phone",  label: "Phone",      value: candidate.phone      || "Not found"     },
              { icon: "work",   label: "Experience", value: candidate.experience || "Not mentioned" },
              {
                icon: "school", label: "Education",
                value: candidate.education?.length > 0
                  ? candidate.education.join(", ")
                  : "Not found",
              },
            ].map(({ icon, label, value }) => (
              <div key={label} className="lb-detail-item">
                <Icon name={icon} className="material-symbols-outlined" />
                <div>
                  <p className="lb-detail-label">{label}</p>
                  <p className="lb-detail-val">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {candidate.skills?.length > 0 && (
            <div className="lb-skills">
              <p className="lb-sub-label">Detected Skills</p>
              <div className="lb-skill-tags">
                {candidate.skills.map((s, idx) => (
                  <span key={idx} className="lb-skill-tag">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Matched vs Missing keywords */}
          <div className="lb-keywords">
            <div className="lb-kw-col">
              <p className="lb-sub-label lb-sub-green">
                ✅ Matched Keywords ({candidate.matchedKeywords?.length || 0})
              </p>
              <div className="lb-kw-list">
                {candidate.matchedKeywords?.slice(0, 20).map((k) => (
                  <KeywordPill key={k} word={k} matched />
                ))}
                {candidate.matchedKeywords?.length > 20 && (
                  <span className="lb-kw-more">
                    +{candidate.matchedKeywords.length - 20} more
                  </span>
                )}
              </div>
            </div>

            <div className="lb-kw-col">
              <p className="lb-sub-label lb-sub-red">
                ❌ Missing Keywords ({candidate.missingKeywords?.length || 0})
              </p>
              <div className="lb-kw-list">
                {candidate.missingKeywords?.slice(0, 20).map((k) => (
                  <KeywordPill key={k} word={k} matched={false} />
                ))}
                {candidate.missingKeywords?.length > 20 && (
                  <span className="lb-kw-more">
                    +{candidate.missingKeywords.length - 20} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Parse error */}
          {candidate.error && (
            <div className="lb-error-note">
              <span className="material-symbols-outlined">warning</span>
              Parse error: {candidate.error}
            </div>
          )}

        </div>
      </td>
    </tr>
  );
}

export default function LeaderboardTable({ results, onExport }) {
  const [expanded, setExpanded] = useState(null);

  const toggle = (i) => setExpanded((prev) => (prev === i ? null : i));

  return (
    <div className="lb-card">

      {/* Header */}
      <div className="lb-card-header">
        <div>
          <h3 className="lb-card-title">Candidate Leaderboard</h3>
          <p className="lb-card-sub">
            {results.length} candidate{results.length !== 1 ? "s" : ""} ranked by ATS match score
          </p>
        </div>
        <button className="lb-export-btn" onClick={onExport}>
          <Icon name="download" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="lb-table-wrap">
        <table className="lb-table">
          <thead>
            <tr>
              <th className="lb-th">Rank</th>
              <th className="lb-th">Candidate</th>
              <th className="lb-th">Score</th>
              <th className="lb-th">Experience</th>
              <th className="lb-th">Skills</th>
              <th className="lb-th">File</th>
              <th className="lb-th" />
            </tr>
          </thead>

          <tbody>
            {results.map((c, i) => {
              const { label, color } = getRankLabel(i);
              const isOpen = expanded === i;

              return (
            
                <React.Fragment key={i}>
                  <tr
                    className={`lb-row ${isOpen ? "lb-row-open" : ""} ${c.error ? "lb-row-error" : ""}`}
                    onClick={() => toggle(i)}
                  >
                    {/* Rank */}
                    <td className="lb-td">
                      <span className="lb-rank" style={{ color, borderColor: color }}>
                        {label}
                      </span>
                    </td>

                    {/* Candidate */}
                    <td className="lb-td">
                      <div className="lb-candidate">
                        <div
                          className="lb-avatar"
                          style={{ background: RANK_COLORS[i] || "#64748B" }}
                        >
                          {(c.candidateName || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="lb-name">{c.candidateName || "Unknown"}</p>
                          <p className="lb-email">{c.email || "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Score ring */}
                    <td className="lb-td">
                      <ScoreRing score={c.matchScore} />
                    </td>

                    {/* Experience */}
                    <td className="lb-td lb-muted">{c.experience || "—"}</td>

                    {/* Top 3 skills */}
                    <td className="lb-td">
                      <div className="lb-skill-preview">
                        {(c.skills || []).slice(0, 3).map((s, idx) => (
                          <span key={idx} className="lb-skill-tag">{s}</span>
                        ))}
                        {(c.skills || []).length > 3 && (
                          <span className="lb-skill-more">+{c.skills.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* File name */}
                    <td className="lb-td lb-mono lb-muted" style={{ fontSize: 11 }}>
                      {c.fileName || "—"}
                    </td>

                    {/* Expand toggle */}
                    <td className="lb-td lb-td-right">
                      <button className="lb-expand-btn">
                          {isOpen ? <Icon name="expand_less" /> : <Icon name="expand_more" /> }
                       
                      </button>
                    </td>
                  </tr>

                  {/* Expanded detail row — no extra key needed */}
                  {isOpen && <ExpandedRow candidate={c} />}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}