function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function skillMatchScore(requiredSkills, matchedSkills) {
  const required = unique(requiredSkills);
  const matched = unique(matchedSkills);

  if (required.length === 0) {
    return 40;
  }

  const matchedCount = required.filter((skill) =>
    matched.some(
      (item) =>
        item === skill ||
        item.includes(skill) ||
        skill.includes(item)
    )
  ).length;

  return Math.round(
    (matchedCount / required.length) * 40
  );
}

function experienceScore(requiredYears, candidateYears) {
  const required = Number(requiredYears || 0);
  const candidate = Number(candidateYears || 0);

  if (required <= 0) return 25;

  return candidate >= required ? 25 : 0;
}

function educationScore(requiredEducation, educationMatch) {
  if (!requiredEducation?.trim()) {
    return 15;
  }

  return educationMatch ? 15 : 0;
}

function responsibilityScore(
  requiredResponsibilities,
  matchedResponsibilities
) {
  const required = unique(requiredResponsibilities);
  const matched = unique(matchedResponsibilities);

  if (required.length === 0) {
    return 10;
  }

  const count = required.filter((item) =>
    matched.some(
      (matchedItem) =>
        matchedItem.includes(item) ||
        item.includes(matchedItem)
    )
  ).length;

  return Math.round(
    (count / required.length) * 10
  );
}

function projectScore(projects) {
  return projects?.length > 0 ? 5 : 0;
}

function additionalRequirementScore(
  additionalRequirements,
  resumeText
) {
  if (!additionalRequirements?.length) {
    return 5;
  }

  const text = normalize(resumeText);

  const found = additionalRequirements.filter(
    (requirement) =>
      text.includes(normalize(requirement))
  );

  return Math.round(
    (found.length / additionalRequirements.length) * 5
  );
}

export function calculateRecruitmentScore({
  requirement,
  analysis,
  resumeText,
}) {
  const skills = skillMatchScore(
    requirement.requiredSkills,
    analysis.skills.matched
  );

  const experience = experienceScore(
    requirement.minimumExperienceYears,
    analysis.experience.candidateYears
  );

  const education = educationScore(
    requirement.education,
    analysis.education.match
  );

  const responsibilities =
    responsibilityScore(
      requirement.responsibilities,
      analysis.responsibilities.matched
    );

  const projects = projectScore(
    analysis.projects
  );

  const additional =
    additionalRequirementScore(
      requirement.additionalRequirements,
      resumeText
    );

  const overallMatch = Math.max(
    0,
    Math.min(
      100,
      skills +
        experience +
        education +
        responsibilities +
        projects +
        additional
    )
  );

  let recommendation;

  if (overallMatch >= 90) {
    recommendation = "Strong Match";
  } else if (overallMatch >= 75) {
    recommendation = "Shortlist";
  } else if (overallMatch >= 60) {
    recommendation = "Review";
  } else {
    recommendation = "Not Recommended";
  }

  return {
    overallMatch,
    recommendation,

    breakdown: {
      skills,
      experience,
      education,
      responsibilities,
      projects,
      additional,
    },
  };
}