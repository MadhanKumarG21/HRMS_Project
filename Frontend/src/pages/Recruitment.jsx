import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import "../styles/Recruitment.css";
import Icon from "../Components/Icon.jsx ";

const candidateStatuses = [
  "New",
  "Shortlisted",
  "Interview",
  "Rejected",
  "Hired",
];

const emptyRequirement = {
  jobTitle: "",
  department: "",
  requiredSkills: "",
  preferredSkills: "",
  minimumExperienceYears: "",
  education: "",
  responsibilities: "",
  additionalRequirements: "",
  location: "",
  employmentType: "Full Time",
};

function splitItems(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ItemList({ items, emptyLabel }) {
  if (!items?.length) return <p className="rec-empty-note">{emptyLabel}</p>;
  return (
    <ul className="rec-item-list">
      {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
    </ul>
  );
}

function AnalysisDetails({ analysis }) {
  return (
    <div className="rec-analysis-details">
      <p className="rec-summary">{analysis.summary || "No summary provided."}</p>
      <div className="rec-match-grid">
        <section>
          <h4>Matched skills</h4>
          <ItemList items={analysis.skills?.matched} emptyLabel="No required skills matched." />
        </section>
        <section>
          <h4>Missing skills</h4>
          <ItemList items={analysis.skills?.missing} emptyLabel="No missing skills reported." />
        </section>
        <section>
          <h4>Experience</h4>
          <p>{analysis.experience?.candidateYears ?? 0} years found; {analysis.experience?.requiredYears ?? 0} required</p>
          <span className={analysis.experience?.match ? "rec-match-yes" : "rec-match-no"}>
            {analysis.experience?.match ? "Meets requirement" : "Below requirement"}
          </span>
          {analysis.experience?.evidence && <p className="rec-evidence">{analysis.experience.evidence}</p>}
        </section>
        <section>
          <h4>Education</h4>
          <p>{analysis.education?.candidate || "Not identified"}</p>
          <span className={analysis.education?.match ? "rec-match-yes" : "rec-match-no"}>
            {analysis.education?.match ? "Meets requirement" : "Does not meet requirement"}
          </span>
          {analysis.education?.evidence && <p className="rec-evidence">{analysis.education.evidence}</p>}
        </section>
        <section>
          <h4>Strengths</h4>
          <ItemList items={analysis.strengths} emptyLabel="No strengths reported." />
        </section>
        <section>
          <h4>Gaps</h4>
          <ItemList items={analysis.gaps} emptyLabel="No gaps reported." />
        </section>
      </div>
    </div>
  );
}

export default function Recruitment() {
  const [requirements, setRequirements] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [requirementForm, setRequirementForm] = useState(emptyRequirement);
  const [resumes, setResumes] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingRequirement, setSavingRequirement] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [updatingCandidate, setUpdatingCandidate] = useState("");
  const [deletingCandidate, setDeletingCandidate] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      api.getRecruitmentRequirements(),
      api.getRecruitmentAnalyses(),
    ])
      .then(([requirementsData, analysesData]) => {
        if (!active) return;
        setRequirements(requirementsData);
        setAnalyses(analysesData);
        if (requirementsData.length) setSelectedRequirement(requirementsData[0]._id);
      })
      .catch((err) => active && setError(err.message || "Could not load recruitment data."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const handleRequirementChange = (event) => {
    const { name, value } = event.target;
    setRequirementForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateRequirement = async (event) => {
    event.preventDefault();
    setError("");
    setSavingRequirement(true);
    try {
      const created = await api.createRecruitmentRequirement({
        ...requirementForm,
        minimumExperienceYears: Number(requirementForm.minimumExperienceYears) || 0,
        requiredSkills: splitItems(requirementForm.requiredSkills),
        preferredSkills: splitItems(requirementForm.preferredSkills),
        responsibilities: splitItems(requirementForm.responsibilities),
        additionalRequirements: splitItems(requirementForm.additionalRequirements),
      });
      setRequirements((current) => [created.requirement, ...current]);
      setSelectedRequirement(created.requirement._id);
      setRequirementForm(emptyRequirement);
    } catch (err) {
      setError(err.message || "Could not create the job requirement.");
    } finally {
      setSavingRequirement(false);
    }
  };

  const handleAnalyzeResume = async (event) => {
    event.preventDefault();
    if (!selectedRequirement || resumes.length === 0) return;
    const formElement = event.currentTarget;
    setError("");
    setBatchResults([]);
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append("requirementId", selectedRequirement);
      resumes.forEach((file) => form.append("resumes", file));
      const result = await api.analyzeRecruitmentCandidate(form);
      const successfulResults = result.results.filter((item) => item.success);
      setBatchResults(result.results);
      if (successfulResults.length > 0) {
        setLatestAnalysis(successfulResults.at(-1).analysis);
        setAnalyses(await api.getRecruitmentAnalyses());
      }
      setResumes([]);
      formElement.reset();
    } catch (err) {
      setError(err.message || "Resume analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusChange = async (candidateId, status) => {
    setError("");
    setUpdatingCandidate(candidateId);
    try {
      await api.updateRecruitmentCandidateStatus(candidateId, status);
      setAnalyses((current) => current.map((item) => (
        item.candidateId?._id === candidateId
          ? { ...item, candidateId: { ...item.candidateId, status } }
          : item
      )));
    } catch (err) {
      setError(err.message || "Could not update candidate status.");
    } finally {
      setUpdatingCandidate("");
    }
  };

  const handleDeleteCandidate = async (candidateId, candidateName) => {
    if (!window.confirm(`Delete ${candidateName || "this candidate"} and all associated resume analyses? This cannot be undone.`)) {
      return;
    }

    setError("");
    setDeletingCandidate(candidateId);
    try {
      await api.deleteRecruitmentCandidate(candidateId);
      setAnalyses((current) => current.filter((item) => item.candidateId?._id !== candidateId));
    } catch (err) {
      setError(err.message || "Could not delete the candidate.");
    } finally {
      setDeletingCandidate("");
    }
  };

  return (
    <main className="recruitment-page">
      <header className="recruitment-header">
        <div>
          <p className="recruitment-eyebrow">PEOPLE OPERATIONS</p>
          <h1>Recruitment</h1>
          <p>Manage open roles and review AI-assisted candidate matches.</p>
        </div>
      </header>

      {error && (
        <div className="recruitment-error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          {error}
          <button type="button" aria-label="Dismiss error" onClick={() => setError("")}>×</button>
        </div>
      )}

      {loading ? <p className="recruitment-loading">Loading recruitment data...</p> : (
        <>
          <div className="recruitment-workspace">
            <section className="recruitment-section">
              <div className="recruitment-section-heading">
                <span>01</span>
                <div><h2>Job requirement</h2><p>Define what the role needs.</p></div>
              </div>
              <form className="recruitment-form" onSubmit={handleCreateRequirement}>
                <label>Job title<input name="jobTitle" value={requirementForm.jobTitle} onChange={handleRequirementChange} required /></label>
                <label>Department<input name="department" value={requirementForm.department} onChange={handleRequirementChange} /></label>
                <label>Required skills <small>Comma or line separated</small><textarea name="requiredSkills" value={requirementForm.requiredSkills} onChange={handleRequirementChange} rows="2" /></label>
                <label>Preferred skills <small>Optional</small><textarea name="preferredSkills" value={requirementForm.preferredSkills} onChange={handleRequirementChange} rows="2" /></label>
                <label>Minimum experience (years)<input name="minimumExperienceYears" type="number" min="0" step="0.5" value={requirementForm.minimumExperienceYears} onChange={handleRequirementChange} /></label>
                <label>Education<input name="education" value={requirementForm.education} onChange={handleRequirementChange} placeholder="e.g. Bachelor's in Computer Science" /></label>
                <label>Responsibilities <small>Comma or line separated</small><textarea name="responsibilities" value={requirementForm.responsibilities} onChange={handleRequirementChange} rows="2" /></label>
                <label>Other requirements <small>Comma or line separated</small><textarea name="additionalRequirements" value={requirementForm.additionalRequirements} onChange={handleRequirementChange} rows="2" /></label>
                <label>Location<input name="location" value={requirementForm.location} onChange={handleRequirementChange} /></label>
                <label>Employment type<select name="employmentType" value={requirementForm.employmentType} onChange={handleRequirementChange}>
                  {["Full Time", "Part Time", "Contract", "Internship", "Temporary"].map((type) => <option key={type}>{type}</option>)}
                </select></label>
                <button className="recruitment-primary-button" type="submit" disabled={savingRequirement}>
                  {savingRequirement ? "Saving..." : "Create requirement"}
                </button>
              </form>
            </section>

            <section className="recruitment-section">
              <div className="recruitment-section-heading">
                <span>02</span>
                <div><h2>Analyze resumes</h2><p>Upload up to 10 PDF or DOCX files for this role.</p></div>
              </div>
              <form className="recruitment-form recruitment-analyze-form" onSubmit={handleAnalyzeResume}>
                <label>Open requirement<select value={selectedRequirement} onChange={(event) => setSelectedRequirement(event.target.value)} required>
                  <option value="">Select a job requirement</option>
                  {requirements.filter((item) => item.status === "Open").map((item) => <option key={item._id} value={item._id}>{item.jobTitle} · {item.department}</option>)}
                </select></label>
                <label className="recruitment-upload">Resume files<input type="file" multiple accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files || []);
                  if (selectedFiles.length > 10) {
                    setResumes([]);
                    setError("Select no more than 10 resumes at a time.");
                    event.target.value = "";
                    return;
                  }
                  setError("");
                  setResumes(selectedFiles);
                }} required />
                  <small>{resumes.length ? `${resumes.length} ${resumes.length === 1 ? "resume" : "resumes"} selected · ${(resumes.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(1)} MB total` : "Select up to 10 PDF or DOCX files, max 10 MB each"}</small>
                </label>
                <button className="recruitment-primary-button" type="submit" disabled={analyzing || !selectedRequirement || resumes.length === 0}>
                  {analyzing ? `Analyzing ${resumes.length} resumes...` : `Analyze ${resumes.length || ""} ${resumes.length === 1 ? "resume" : "resumes"}`}
                </button>
              </form>
              {batchResults.length > 0 && <div className="recruitment-batch-results" role="status" aria-live="polite">
                <p>{batchResults.filter((item) => item.success).length} of {batchResults.length} resumes analyzed successfully.</p>
                <ul>{batchResults.map((item, index) => <li className={item.success ? "recruitment-batch-success" : "recruitment-batch-failure"} key={`${item.fileName}-${index}`}>
                  <span>{item.fileName}</span><span>{item.success ? `${item.candidate?.name || "Saved"} · ${item.scoring?.overallMatch ?? 0}% match` : item.message}</span>
                </li>)}</ul>
              </div>}
              {requirements.length === 0 && <p className="recruitment-empty">Create an open job requirement before uploading a resume.</p>}
            </section>
          </div>

          {latestAnalysis && (
            <section className="recruitment-section recruitment-latest">
              <div className="recruitment-section-heading"><span>AI</span><div><h2>Latest analysis</h2><p>Assistive assessment; review the resume and evidence before deciding.</p></div></div>
              <AnalysisDetails analysis={latestAnalysis} />
            </section>
          )}

          <section className="recruitment-section recruitment-candidates">
            <div className="recruitment-section-heading">
              <span>03</span>
              <div><h2>Candidate reviews</h2><p>{analyses.length} saved {analyses.length === 1 ? "analysis" : "analyses"}</p></div>
            </div>
            {analyses.length === 0 ? <p className="recruitment-empty">Analyzed candidates will appear here.</p> : (
              <div className="recruitment-candidate-list">
                {analyses.map((analysis) => {
                  const candidate = analysis.candidateId || {};
                  const requirement = analysis.requirementId || {};
                  return (
                    <article className="recruitment-candidate" key={analysis._id}>
                      <div className="recruitment-candidate-top">
                        <div className="recruitment-candidate-name">
                          <h3>{candidate.name || "Unknown candidate"}</h3>
                          <p>{candidate.email || candidate.resumeFileName || "No contact details found"} · {requirement.jobTitle || "Role unavailable"}</p>
                        </div>
                        <div className="recruitment-candidate-score">
                          <strong>{analysis.overallMatch}%</strong><span>{analysis.recommendation}</span>
                        </div>
                        <div className="recruitment-candidate-actions">
                          <label className="recruitment-status">Status
                            <select value={candidate.status || "New"} disabled={updatingCandidate === candidate._id || deletingCandidate === candidate._id} onChange={(event) => handleStatusChange(candidate._id, event.target.value)}>
                              {candidateStatuses.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          </label>
                          <button className="recruitment-delete-button" type="button" title="Delete candidate and analyses" aria-label={`Delete ${candidate.name || "candidate"}`} disabled={!candidate._id || deletingCandidate === candidate._id || updatingCandidate === candidate._id} onClick={() => handleDeleteCandidate(candidate._id, candidate.name)}>
                            <Icon name="delete" size={20} />
                          </button>
                        </div>
                      </div>
                      <AnalysisDetails analysis={analysis} />
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
