#!/usr/bin/env node
// Resume Forge - ATS-Compliant DOCX Generator
// Usage: node generate-resume-docx.js resume-data.json [output.docx]
//
// Use the "Export JSON" button in the app to get resume-data.json,
// then run this to generate a proper .docx file for ATS systems.

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, LevelFormat, BorderStyle, TabStopType,
} = require("docx");

const inputPath = process.argv[2] || "resume-data.json";
const outputPath = process.argv[3] || "resume.docx";

if (!fs.existsSync(inputPath)) {
  console.log(`Usage: node generate-resume-docx.js <resume-data.json> [output.docx]`);
  console.log(`\nGet resume-data.json by clicking "Export JSON" in the Resume Forge app.`);
  process.exit(1);
}

const p = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function build(p) {
  const children = [];
  const R = (text, opts = {}) => new TextRun({ text, font: "Calibri", size: 24, ...opts });

  // Name
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [R(p.name || "YOUR NAME", { bold: true, size: 32 })],
  }));

  // Title
  if (p.title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [R(p.title, { size: 26, color: "222222" })],
    }));
  }

  // Contact (in body, NOT header/footer - critical for ATS)
  const contact = [p.email, p.phone, p.location].filter(Boolean);
  const links = [p.linkedin, p.github, p.portfolio].filter(Boolean);
  if (contact.length) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 20 },
      children: [R(contact.join("  |  "), { size: 22, color: "333333" })],
    }));
  }
  if (links.length) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [R(links.join("  |  "), { size: 22, color: "333333" })],
    }));
  }

  // Divider
  children.push(new Paragraph({
    spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } },
    children: [],
  }));

  // Section heading helper
  const section = (title) => {
    children.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" } },
      children: [R(title.toUpperCase(), { bold: true, size: 24, characterSpacing: 60 })],
    }));
  };

  // PROFESSIONAL SUMMARY
  if (p.summary) {
    section("Professional Summary");
    children.push(new Paragraph({ spacing: { after: 80 }, children: [R(p.summary)] }));
  }

  // EDUCATION
  const edus = (p.education || []).filter((e) => e.school);
  if (edus.length) {
    section("Education");
    for (const edu of edus) {
      const deg = `${edu.degree || "Degree"}${edu.field ? " in " + edu.field : ""}`;
      children.push(new Paragraph({
        spacing: { before: 40, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [
          R(deg, { bold: true }),
          R(` | ${edu.school}`),
          R("\t"),
          R(`${edu.startYear || ""}${edu.endYear ? " - " + edu.endYear : ""}`, { size: 20 }),
        ],
      }));
    }
  }

  // TECHNICAL SKILLS
  const sk = p.skills || {};
  const skLines = [
    sk.languages && `Languages: ${sk.languages}`,
    sk.frameworks && `Frameworks/Libraries: ${sk.frameworks}`,
    sk.databases && `Databases: ${sk.databases}`,
    sk.cloud && `Cloud/DevOps: ${sk.cloud}`,
    sk.tools && `Tools: ${sk.tools}`,
    sk.other && `Other: ${sk.other}`,
  ].filter(Boolean);

  if (skLines.length) {
    section("Technical Skills");
    for (const line of skLines) {
      const [label, ...rest] = line.split(": ");
      children.push(new Paragraph({
        spacing: { after: 40 },
        children: [
          R(label + ": ", { bold: true }),
          R(rest.join(": ")),
        ],
      }));
    }
  }

  // WORK EXPERIENCE
  const exps = (p.experiences || []).filter((e) => e.company);
  if (exps.length) {
    section("Work Experience");
    for (const exp of exps) {
      // Role | Company ... Date
      children.push(new Paragraph({
        spacing: { before: 80, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [
          R(exp.role || "Role", { bold: true }),
          R(` | ${exp.company}`),
          R("\t"),
          R(`${exp.startDate || ""}${exp.endDate ? " - " + exp.endDate : ""}`, { size: 20 }),
        ],
      }));

      if (exp.description) {
        for (const bullet of exp.description.split("\n").filter(Boolean)) {
          children.push(new Paragraph({
            spacing: { after: 20 },
            numbering: { reference: "bullets", level: 0 },
            children: [R(bullet.replace(/^[-•*]\s*/, ""))],
          }));
        }
      }

      if (exp.technologies) {
        children.push(new Paragraph({
          spacing: { after: 20 },
          children: [
            R("Technologies: ", { bold: true, size: 20, color: "444444" }),
            R(exp.technologies, { size: 20, color: "444444" }),
          ],
        }));
      }
    }
  }

  // CERTIFICATIONS
  const certs = Array.isArray(p.certifications) ? p.certifications : p.certifications ? [p.certifications] : [];
  if (certs.length && certs.some((c) => c.trim())) {
    section("Certifications");
    certs.filter((c) => c.trim()).forEach((cert) => {
      children.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 40 },
        children: [R(cert)],
      }));
    });
  }

  return new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 24 } } } },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 1080, bottom: 720, left: 1080 },
        },
      },
      children,
    }],
  });
}

async function main() {
  console.log(`Generating ATS resume from ${inputPath}...`);
  const doc = build(p);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved: ${outputPath}`);
  console.log(`\nATS checklist:`);
  console.log(`  [x] Single-column layout`);
  console.log(`  [x] Calibri font (ATS-safe)`);
  console.log(`  [x] Standard section headings`);
  console.log(`  [x] No tables/graphics/columns`);
  console.log(`  [x] Contact in body (not header/footer)`);
  console.log(`  [x] Skills near top for keyword scanning`);
  console.log(`  [x] .docx format (preferred by ATS)`);
}

main().catch((err) => { console.error("Error:", err.message); process.exit(1); });
