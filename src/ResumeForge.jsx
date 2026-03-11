import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "rf_profile_v3";
const GENERATED_KEY = "rf_generated_v3";
const OPENROUTER_ENV_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// Fallback storage so the app works in a normal browser (no custom window.storage needed)
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const value = window.localStorage.getItem(key);
        return value ? { value } : null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore
      }
    }
  };
}

const placeholderJSON = `{
  "name": "Your Name",
  "title": "Software Engineer",
  "email": "you@email.com",
  "phone": "+1 (555) 123-4567",
  "location": "City, ST",
  "linkedin": "linkedin.com/in/you",
  "github": "github.com/you",
  "portfolio": "",

  "experiences": [
    {
      "company": "Company A",
      "role": "Lead Software Engineer",
      "startDate": "November 2025",
      "endDate": "March 2026",
      "context": "Brief notes about what you actually worked on — tech used, problems solved, team size, domain. AI rewrites this into polished ATS bullets."
    },
    {
      "company": "Company B",
      "role": "Software Engineer",
      "startDate": "June 2024",
      "endDate": "September 2024",
      "context": "What you did here. Keep it rough — a few sentences is enough."
    }
  ],

  "education": [
    {
      "school": "University Name",
      "degree": "Master of Science",
      "field": "Computer Science",
      "startYear": "2022",
      "endYear": "2024"
    }
  ],

  "certifications": []
}`;

function tryParse(text) {
  try { return { ok: true, data: JSON.parse(text) }; }
  catch (e) { return { ok: false, error: e.message }; }
}

function parseAI(text) {
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch { return null; }
}

function ResumePreview({ profile, generated }) {
  const p = profile || {};
  const g = generated || {};
  const contact = [p.email, p.phone, p.location].filter(Boolean);
  const links = [p.linkedin, p.github, p.portfolio].filter(Boolean);

  const mergedExps = (p.experiences || []).map((exp) => {
    const match = (g.experiences || []).find(
      (ge) => ge.company?.toLowerCase().trim() === exp.company?.toLowerCase().trim()
    );
    return { ...exp, ...(match || {}) };
  });

  const sk = g.skills || {};
  const hasSk = Object.values(sk).some((v) => v?.trim());

  return (
    <div
      id="resume-preview"
      style={{
        fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
        color: "#000",
        maxWidth: 800,
        margin: "0 auto",
        padding: "52px 64px",
        background: "#fff",
        lineHeight: 1.5,
        fontSize: 13,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.01em" }}>
          {p.name || "YOUR NAME"}
        </div>
        {(g.title || p.title) && (
          <div style={{ fontSize: 14.5, color: "#222", marginTop: 3, fontWeight: 500 }}>{g.title || p.title}</div>
        )}
      </div>

      {(contact.length > 0 || links.length > 0) && (
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#333",
            marginBottom: 12,
            lineHeight: 1.7,
          }}
        >
          {contact.length > 0 && <div>{contact.join("  |  ")}</div>}
          {links.length > 0 && <div>{links.join("  |  ")}</div>}
        </div>
      )}
      <hr
        style={{
          border: "none",
          borderTop: "1.5px solid #000",
          margin: "0 0 14px 0",
        }}
      />

      {g.summary && (
        <div style={{ marginBottom: 16 }}>
          <div style={SH}>PROFESSIONAL SUMMARY</div>
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 13 }}>{g.summary}</p>
        </div>
      )}

      {p.education?.some((e) => e.school) && (
        <div style={{ marginBottom: 14 }}>
          <div style={SH}>EDUCATION</div>
          {p.education
            .filter((e) => e.school)
            .map((edu, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <div>
                  <strong>
                    {edu.degree}
                    {edu.field ? ` in ${edu.field}` : ""}
                  </strong>{" "}
                  | {edu.school}
                </div>
                <div style={{ fontSize: 12, color: "#333" }}>
                  {edu.startYear}
                  {edu.endYear ? ` – ${edu.endYear}` : ""}
                </div>
              </div>
            ))}
        </div>
      )}

      {hasSk && (
        <div style={{ marginBottom: 14 }}>
          <div style={SH}>TECHNICAL SKILLS</div>
          <div style={{ lineHeight: 1.7 }}>
            {sk.languages && (
              <div>
                <strong>Languages:</strong> {sk.languages}
              </div>
            )}
            {sk.frameworks && (
              <div>
                <strong>Frameworks/Libraries:</strong> {sk.frameworks}
              </div>
            )}
            {sk.databases && (
              <div>
                <strong>Databases:</strong> {sk.databases}
              </div>
            )}
            {sk.cloud && (
              <div>
                <strong>Cloud/DevOps:</strong> {sk.cloud}
              </div>
            )}
            {sk.tools && (
              <div>
                <strong>Tools:</strong> {sk.tools}
              </div>
            )}
            {sk.other && (
              <div>
                <strong>Other:</strong> {sk.other}
              </div>
            )}
          </div>
        </div>
      )}

      {mergedExps.some((e) => e.company) && (
        <div style={{ marginBottom: 14 }}>
          <div style={SH}>WORK EXPERIENCE</div>
          {mergedExps
            .filter((e) => e.company)
            .map((exp, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 13.5 }}>
                    <strong>{exp.role}</strong> | {exp.company}
                  </div>
                  <div style={{ fontSize: 12, whiteSpace: "nowrap", color: "#333" }}>
                    {exp.startDate}
                    {exp.endDate ? ` – ${exp.endDate}` : ""}
                  </div>
                </div>
                {exp.description && (
                  <ul style={{ margin: "5px 0 0 0", paddingLeft: 22 }}>
                    {exp.description
                      .split("\n")
                      .filter(Boolean)
                      .map((line, j) => (
                        <li key={j} style={{ marginBottom: 3, lineHeight: 1.55, fontSize: 13 }}>
                          {line.replace(/^[-•*]\s*/, "")}
                        </li>
                      ))}
                  </ul>
                )}
                {exp.technologies && (
                  <div style={{ fontSize: 11.5, color: "#444", marginTop: 5 }}>
                    <strong style={{ color: "#111" }}>Technologies:</strong> {exp.technologies}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {p.certifications?.length > 0 && (
        <div>
          <div style={SH}>CERTIFICATIONS</div>
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            {(Array.isArray(p.certifications)
              ? p.certifications
              : [p.certifications]
            ).map((cert, i) => (
              <li key={i} style={{ marginBottom: 3, lineHeight: 1.55, fontSize: 13 }}>
                {cert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!g.summary && !hasSk && !mergedExps.some((e) => e.description) && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#999",
            fontSize: 13,
          }}
        >
          Paste your JSON in Profile tab, then paste a JD in Generate tab.
          <br />
          AI fills everything here.
        </div>
      )}
    </div>
  );
}

const SH = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: "1.5px solid #000",
  paddingBottom: 3,
  marginBottom: 10,
  marginTop: 2,
};

export default function ResumeForge() {
  const [profileJSON, setProfileJSON] = useState(placeholderJSON);
  const [profile, setProfile] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [jsonErr, setJsonErr] = useState("");
  const [tab, setTab] = useState("profile");
  const [jd, setJd] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [apiProvider, setApiProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [showApi, setShowApi] = useState(false);
  const [descLength, setDescLength] = useState("short");

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) {
          setProfileJSON(r.value);
          const p = tryParse(r.value);
          if (p.ok) {
            setProfile(p.data);
            setJsonErr("");
          }
        }
      } catch {}
      try {
        const g = await window.storage.get(GENERATED_KEY);
        if (g?.value) setGenerated(JSON.parse(g.value));
      } catch {}
    })();
  }, []);

  const applyJSON = useCallback(async (text) => {
    setProfileJSON(text);
    const result = tryParse(text);
    if (result.ok) {
      setProfile(result.data);
      setJsonErr("");
      try {
        await window.storage.set(STORAGE_KEY, text);
      } catch {}
    } else {
      setJsonErr(result.error);
    }
  }, []);

  const generate = async () => {
    if (!jd.trim() || !profile) return;

    setGenerating(true);
    setStatus("Reading JD and generating ATS-optimized resume...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, jd, descLength }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus(
          `Server Error: ${
            typeof data.error === "string"
              ? data.error
              : JSON.stringify(data.error || data)
          }`
        );
        setGenerating(false);
        return;
      }

      const text = data.text || "";
      const parsed = data.parsed || parseAI(text);
      if (parsed) {
        setGenerated(parsed);
        try {
          await window.storage.set(GENERATED_KEY, JSON.stringify(parsed));
        } catch {}
        setStatus("Done! Switch to Preview.");
        setTab("preview");
      } else {
        setStatus("AI returned bad format. Try again.");
        console.log("Raw:", text);
      }
    } catch (err) {
      setStatus(`Network error: ${err.message}`);
    }
    setGenerating(false);
  };

  const exportGenerated = () => {
    if (!generated) return;
    const merged = {
      ...profile,
      title: generated.title || profile.title,
      summary: generated.summary,
      skills: generated.skills,
      experiences: (profile.experiences || []).map((exp) => {
        const match = (generated.experiences || []).find(
          (ge) => ge.company?.toLowerCase().trim() === exp.company?.toLowerCase().trim()
        );
        return { ...exp, ...(match || {}) };
      }),
    };
    const blob = new Blob([JSON.stringify(merged, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const T = ({ id, label, ico }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "8px 16px",
        background: tab === id ? "#b8e636" : "transparent",
        color: tab === id ? "#000" : "#666",
        border: "none",
        borderRadius: 5,
        cursor: "pointer",
        fontSize: 11.5,
        fontWeight: 700,
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span style={{ fontSize: 13 }}>{ico}</span> {label}
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060606",
        color: "#ccc",
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #141414",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          background: "#090909",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              background: "#b8e636",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
              color: "#000",
            }}
          >
            R
          </div>
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>Resume Forge</span>
          <span
            style={{
              fontSize: 8.5,
              padding: "2px 5px",
              background: "#151515",
              borderRadius: 3,
              color: "#b8e636",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            ATS
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 2,
            background: "#0c0c0c",
            borderRadius: 6,
            padding: 2,
          }}
        >
          <T id="profile" label="Profile JSON" ico="{ }" />
          <T id="generate" label="Generate" ico="⚡" />
          <T id="preview" label="Preview" ico="◎" />
        </div>

        <button
          onClick={() => setShowApi(!showApi)}
          style={{
            padding: "6px 10px",
            background: "#0c0c0c",
            color: "#555",
            border: "1px solid #1a1a1a",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 10,
            fontFamily: "inherit",
          }}
        >
          ⚙ API
        </button>
      </div>

      {showApi && (
        <div
          style={{
            padding: "12px 18px",
            background: "#090909",
            borderBottom: "1px solid #141414",
          }}
        >
          <div
            style={{
              maxWidth: 650,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#b8e636",
              }}
            >
              API Provider
            </div>
            <div
              style={{
                fontSize: 9.5,
                color: "#555",
                lineHeight: 1.5,
              }}
            >
              This app calls a local Node server that uses your GROQ_API_KEY from the backend
              environment. The frontend never sees the key.
            </div>
            <div
              style={{
                display: "flex",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              {[
                { id: "groq", n: "Groq via backend", d: "Uses GROQ_API_KEY on server" },
              ].map((pv) => (
                <button
                  key={pv.id}
                  onClick={() => setApiProvider(pv.id)}
                  style={{
                    flex: "1 1 140px",
                    padding: "7px 10px",
                    background: apiProvider === pv.id ? "#b8e63610" : "#060606",
                    border:
                      apiProvider === pv.id
                        ? "1px solid #b8e636"
                        : "1px solid #1a1a1a",
                    borderRadius: 5,
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#ccc",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                    }}
                  >
                    {pv.n}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#444",
                      marginTop: 2,
                    }}
                  >
                    {pv.d}
                  </div>
                </button>
              ))}
            </div>
            {apiProvider === "groq" && (
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                style={{ ...inputS, marginTop: 4 }}
              />
            )}
          </div>
        </div>
      )}

      <div
        style={{
          padding: "18px",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        {tab === "profile" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#555",
                background: "#0c0c0c",
                padding: "10px 14px",
                borderRadius: 7,
                border: "1px solid #151515",
                lineHeight: 1.7,
              }}
            >
              <span
                style={{
                  color: "#b8e636",
                  fontWeight: 600,
                }}
              >
                Paste your static info as JSON.
              </span>{" "}
              Name, contact, companies + roles + dates, education, certs. AI generates
              everything else (summary, bullets, skills, technologies) from the JD.
            </div>

            <div style={{ position: "relative" }}>
              <textarea
                value={profileJSON}
                onChange={(e) => applyJSON(e.target.value)}
                spellCheck={false}
                style={{
                  ...inputS,
                  minHeight: 480,
                  resize: "vertical",
                  lineHeight: 1.6,
                  fontSize: 12.5,
                  tabSize: 2,
                }}
                onFocus={(e) => (e.target.style.borderColor = "#b8e636")}
                onBlur={(e) => (e.target.style.borderColor = "#1a1a1a")}
              />
              {jsonErr && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    right: 8,
                    padding: "6px 10px",
                    background: "#1a0808",
                    border: "1px solid #331515",
                    borderRadius: 5,
                    fontSize: 10,
                    color: "#ff6666",
                  }}
                >
                  JSON Error: {jsonErr}
                </div>
              )}
            </div>

            {profile && !jsonErr && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#0c0c0c",
                  borderRadius: 7,
                  border: "1px solid #151515",
                  fontSize: 10.5,
                  color: "#555",
                  lineHeight: 1.7,
                }}
              >
                <span style={{ color: "#b8e636" }}>Valid</span>
                {" - "}
                {profile.name || "?"} | {(profile.experiences || []).length} roles |{" "}
                {(profile.education || []).length} edu |{" "}
                {(profile.certifications || []).length} certs
              </div>
            )}
          </div>
        )}

        {tab === "generate" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#555",
                background: "#0c0c0c",
                padding: "10px 14px",
                borderRadius: 7,
                border: "1px solid #151515",
                lineHeight: 1.7,
              }}
            >
              <span
                style={{
                  color: "#b8e636",
                  fontWeight: 600,
                }}
              >
                Paste the full job description.
              </span>{" "}
              AI generates: professional summary, experience bullets with metrics per
              company, technologies per role, categorized skills section, optimized
              title. All matched to ATS keywords.
            </div>

            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              style={{
                ...inputS,
                minHeight: 240,
                resize: "vertical",
                lineHeight: 1.5,
              }}
              placeholder={
                "Paste full JD from LinkedIn, company website, etc.\n\nThe more detail, the better ATS keyword matching.\n\nExample:\nSenior Full Stack Engineer - Fintech Startup\nRequirements: 3+ years React, Node.js, AWS, PostgreSQL...\nResponsibilities: Build scalable microservices..."
              }
              onFocus={(e) => (e.target.style.borderColor = "#b8e636")}
              onBlur={(e) => (e.target.style.borderColor = "#1a1a1a")}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#0c0c0c",
                border: "1px solid #151515",
                borderRadius: 7,
                padding: "10px 14px",
              }}
            >
              <span style={{ fontSize: 10, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Description
              </span>
              {[
                { id: "short", label: "Short", hint: "4–5 bullets, concise" },
                { id: "long",  label: "Long",  hint: "7–8 bullets, detailed" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDescLength(opt.id)}
                  style={{
                    padding: "5px 12px",
                    background: descLength === opt.id ? "#b8e636" : "#060606",
                    color: descLength === opt.id ? "#000" : "#555",
                    border: descLength === opt.id ? "1px solid #b8e636" : "1px solid #1a1a1a",
                    borderRadius: 5,
                    cursor: "pointer",
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>{opt.hint}</span>
                </button>
              ))}
            </div>

            <button
              onClick={generate}
              disabled={generating || !jd.trim() || !profile}
              style={{
                padding: "12px 20px",
                background: generating
                  ? "#1a1a1a"
                  : !jd.trim() || !profile
                  ? "#111"
                  : "#b8e636",
                color:
                  generating || !jd.trim() || !profile
                    ? "#555"
                    : "#000",
                border: "none",
                borderRadius: 7,
                cursor:
                  generating || !jd.trim() || !profile
                    ? "not-allowed"
                    : "pointer",
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              {generating
                ? "Generating..."
                : !profile
                ? "Paste profile JSON first"
                : "Generate ATS Resume"}
            </button>

            {status && (
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  background: status.includes("rror")
                    ? "#140808"
                    : status.includes("Done")
                    ? "#081408"
                    : "#141408",
                  border: `1px solid ${
                    status.includes("rror")
                      ? "#2a1010"
                      : status.includes("Done")
                      ? "#102a10"
                      : "#2a2a10"
                  }`,
                  color: status.includes("rror")
                    ? "#ff7777"
                    : status.includes("Done")
                    ? "#77ff77"
                    : "#b8e636",
                }}
              >
                {status}
              </div>
            )}

            {profile && (
              <div
                style={{
                  background: "#0c0c0c",
                  borderRadius: 7,
                  border: "1px solid #151515",
                  padding: 12,
                  fontSize: 10.5,
                  color: "#444",
                  lineHeight: 1.8,
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: "#555",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 4,
                  }}
                >
                  Profile loaded
                </div>
                <div>
                  <span style={{ color: "#666" }}>Name:</span> {profile.name}
                </div>
                <div>
                  <span style={{ color: "#666" }}>Roles:</span>{" "}
                  {(profile.experiences || [])
                    .map((e) => `${e.role} @ ${e.company}${e.context ? " ✓" : " ⚠"}`)
                    .join(" › ")}
                </div>
                <div>
                  <span style={{ color: "#666" }}>Edu:</span>{" "}
                  {(profile.education || [])
                    .map(
                      (e) => `${e.degree} in ${e.field}, ${e.school}`
                    )
                    .join("; ")}
                </div>
                {profile.certifications?.length > 0 && (
                  <div>
                    <span style={{ color: "#666" }}>Certs:</span>{" "}
                    {profile.certifications.join(", ")}
                  </div>
                )}
              </div>
            )}

            {!profile && (
              <div
                style={{
                  padding: "9px 12px",
                  background: "#140e04",
                  border: "1px solid #2a2010",
                  borderRadius: 6,
                  fontSize: 10.5,
                  color: "#c6a835",
                }}
              >
                Go to Profile JSON tab first and paste your info.
              </div>
            )}
          </div>
        )}

        {tab === "preview" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#444",
                }}
              >
                ATS layout: single column, standard headings, Calibri, no
                tables/graphics.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 5,
                }}
              >
                {generated && (
                  <button onClick={exportGenerated} style={btnS}>
                    Export JSON (for .docx)
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  style={btnS}
                >
                  Print / PDF
                </button>
              </div>
            </div>
            <div
              style={{
                background: "#fff",
                borderRadius: 7,
                overflow: "hidden",
                boxShadow: "0 2px 24px #0003",
              }}
            >
              <ResumePreview profile={profile} generated={generated} />
            </div>

            {generated && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "#0c0c0c",
                  borderRadius: 7,
                  border: "1px solid #151515",
                  fontSize: 9.5,
                  color: "#444",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "#666" }}>
                  For best ATS parsing:
                </strong>{" "}
                Click "Export JSON", then run{" "}
                <code
                  style={{
                    color: "#b8e636",
                    background: "#111",
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  node generate-resume-docx.js resume-data.json resume.docx
                </code>{" "}
                to get a proper .docx file. ATS systems parse Word docs more
                reliably than PDF.
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-preview, #resume-preview * { visibility: visible; }
          #resume-preview {
            position: absolute; left: 0; top: 0;
            width: 100%; padding: 0.4in 0.6in; font-size: 11pt;
          }
        }
      `}</style>
    </div>
  );
}

const inputS = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #1a1a1a",
  borderRadius: 6,
  background: "#0a0a0a",
  color: "#ddd",
  fontSize: 12,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'IBM Plex Mono', monospace",
  transition: "border-color 0.15s",
};

const btnS = {
  padding: "6px 12px",
  background: "#0c0c0c",
  color: "#888",
  border: "1px solid #1a1a1a",
  borderRadius: 5,
  cursor: "pointer",
  fontSize: 10,
  fontFamily: "'IBM Plex Mono', monospace",
};

