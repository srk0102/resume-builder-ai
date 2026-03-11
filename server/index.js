import "dotenv/config";
import express from "express";

const app = express();
const PORT = process.env.PORT || 4000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_TOKEN || "";

app.use(express.json());

app.post("/api/generate", async (req, res) => {
  try {
    const { profile, jd, descLength } = req.body || {};
    const isLong = descLength === "long";

    if (!profile || !jd || !jd.trim()) {
      return res.status(400).json({ error: "Missing profile or job description" });
    }
    if (!GROQ_API_KEY) {
      return res
        .status(500)
        .json({ error: "GROQ_API_KEY not configured on server" });
    }

    // Compute years of experience from earliest start date in profile
    const currentYear = new Date().getFullYear();
    const earliestYear = (profile.experiences || []).reduce((min, exp) => {
      const yr = parseInt((exp.startDate || "").match(/\d{4}/)?.[0]);
      return yr && yr < min ? yr : min;
    }, currentYear);
    const yearsExp = currentYear - earliestYear;
    const yearsLabel = `${yearsExp}+ years`;

    const bulletCount = isLong ? "7-8" : "4-5";
    const bulletDepth = isLong
      ? "Each bullet must be 1-2 sentences. EMBED specific tool/technology names directly inside each bullet (e.g. 'using React + TypeScript', 'via NestJS microservices', 'with AWS Lambda + SQS'). Include: scale/scope (users, requests, team size), quantified outcome (%, time saved, cost saved, revenue impact). Show deep technical ownership. Every bullet must name at least 2 specific technologies from the context."
      : "Each bullet must be 1 concise sentence. EMBED at least 1-2 tool names directly inside the bullet text (e.g. 'using React Native + Expo', 'via GraphQL/Apollo', 'on AWS ECS Fargate'). Include a metric and a JD keyword. Be direct and punchy.";

    const sys = `You are an expert ATS resume writer. Given STATIC profile info and a TARGET JOB DESCRIPTION, generate all dynamic resume content.

STATIC PROFILE (names, companies, roles, dates - do NOT change these):
${JSON.stringify(profile, null, 2)}

YOUR TASK: Generate resume content that maximizes ATS match score for the target JD.

CONTEXT RULES — critical:
- Each experience may have a "context" field — rough notes from the candidate about what they actually did
- Use context as the SOURCE OF TRUTH for that role. Build description bullets FROM the context, not from imagination
- If context mentions a technology, use it. If context does not mention a technology, do NOT invent it for that role
- Rewrite context notes into polished, metric-driven ATS bullets that match the JD keywords
- If no context is provided for a role, infer conservatively from role title + company type + other roles in the profile
- Keep tech stack coherent across roles — do not wildly switch stacks between companies

Return ONLY valid JSON. No markdown fences. No explanation. Just JSON.

IMPORTANT: Generate in this exact order — experiences FIRST, then skills extracted FROM those experiences:

{
  "title": "Professional title matching target role keywords",
  "summary": "2-3 sentence professional summary. The candidate has EXACTLY ${yearsLabel} of professional experience (calculated from their earliest role — do NOT guess or round down). State this accurately. Mention key technologies from JD and domain fit. Use JD keywords naturally.",
  "experiences": [
    {
      "company": "EXACT company name from profile - DO NOT CHANGE",
      "description": "${bulletCount} bullet points separated by newlines. Base bullets on the role's 'context' field — rewrite real experiences into polished ATS bullets. Each MUST start with a past-tense action verb (Architected, Built, Developed, Led, Optimized, Implemented, Designed, Deployed, Integrated, Automated, Engineered, Orchestrated, Scaled, Migrated, Reduced, Increased). ${bulletDepth} CRITICAL: weave technology names INTO the bullet text itself, not just in the technologies list — recruiters and ATS must see keywords in context.",
      "technologies": "Comprehensive comma-separated list of ALL tools used in this role. Pull from context field + every tool named inside the description bullets above. Add standard companions (React→HTML/CSS/JSX/TypeScript, Docker→containerization, CI/CD→GitHub Actions). Include testing frameworks, package managers, monitoring tools relevant to the role. 12-20 items expected."
    }
  ],
  "skills": {
    "languages": "Programming languages extracted from ALL experience descriptions above, ordered by JD relevance",
    "frameworks": "Frameworks and libraries extracted from ALL experience descriptions above, ordered by JD relevance",
    "databases": "Databases and data stores extracted from ALL experience descriptions above",
    "cloud": "Cloud platforms, DevOps, and infrastructure tools extracted from ALL experience descriptions above",
    "tools": "Dev tools, CI/CD, testing, monitoring tools extracted from ALL experience descriptions above",
    "other": "Methodologies (Agile, Scrum, TDD) and domain expertise relevant to this JD"
  }
}

ATS RULES:
- Include BOTH acronyms AND full forms: "Amazon Web Services (AWS)", "Machine Learning (ML)"
- Match JD keyword phrasing EXACTLY where truthful
- Every bullet has a number or metric
- skills section must be derived from the experience descriptions above — nothing extra
- Keep the tech stack CONSISTENT across all roles — same languages/frameworks family throughout
- Keep it real - no impossible claims
- CRITICAL: Output must be valid JSON. Use \\n between bullets inside strings, never raw newlines.`;

    const resp = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: jd },
          ],
          temperature: 0.7,
          max_tokens: isLong ? 5000 : 3000,
        }),
      }
    );

    const data = await resp.json();

    if (!resp.ok || data.error) {
      return res.status(502).json({
        error: "Groq API error",
        details: data.error || data,
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON here so the frontend doesn't have to guess
    let parsed = null;
    const cleanJson = (raw) => {
      const stripped = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      // Fix literal newlines inside JSON string values (common LLM output issue)
      return stripped.replace(/("(?:[^"\\]|\\[\s\S])*")/g, (match) =>
        match.replace(/\n/g, "\\n").replace(/\r/g, "")
      );
    };
    try {
      parsed = JSON.parse(cleanJson(text));
    } catch {
      // leave parsed as null; frontend will decide what to do
    }

    return res.json({ text, parsed });
  } catch (err) {
    console.error("Server /api/generate error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

