# Clear Fault Legal — High-Conversion Pro Se Litigation Tools & Official Court Forms Suite

A conversion-focused, static, GitHub Pages-ready website targeting self-represented (*pro se*) litigants with an interactive **Verified Official Court Forms Database** and **7 Client-Side Legal Drafting & Visual Exhibit Tools**.

## What's Inside
* **Official Court Forms Database (`/forms/index.html`)** — Searchable directory of verified Federal Civil Pro Se (Pro Se 1–14, AO 240, AO 88A/88B), Federal Bankruptcy (B 101–B 122A-1), and California Judicial Council Civil, Probate (DE-111, DE-150, GC-310), Small Claims (SC-100–SC-120), Discovery, and Fee Waiver forms with official `.gov` portal links and custom Filing Packet Checklist CSV/Print exports.
* **7 Interactive Pro Se Tools:**
  1. **Pro Se Pleading & Motion Drafter** (`/tools/pleading-drafter/index.html`) — Civil Complaints, Answers, Motions, Declarations, Proofs of Service, Probate Intake, and Bankruptcy Prep worksheets exported to Word (`.doc`), Print/PDF, TXT, and JSON.
  2. **Demand Package Assembler** (`/tools/demand-package/index.html`) — Formal settlement demand letters with live itemized damages calculation and enclosure checklists.
  3. **2D Incident Reconstruction Studio** (`/studio/index.html`) — Audited & bug-fixed 2D scene exhibit builder.
  4. **Simple 3D Incident Animation Studio** (`/tools/3d-scene-stager/index.html`) — Beginner-friendly drag-and-play 3D animator (1-click ground backdrops, drag Start→End directly on the 3D floor, Play/Pause/Scrub timeline, WebM video recording, PNG snapshot, and printable 3-frame storyboard).
  5. **Document Organizer & Bates Indexer** (`/tools/document-indexer/index.html`) — Local file ingestion, Plaintiff/Defendant Exhibit numbering, and Bates stamping.
  6. **Case Chronology & Fact Matrix** (`/tools/chronology-builder/index.html`) — Auto-sorted dated timeline tied to Exhibits.
  7. **Litigation Prep & Proof Planner** (`/tools/case-strategy-planner/index.html`) — Claim element Proof Matrix, gap counter, witness roster, and Trial/Intake Brief.
* **5 High-Intent Conversion Filing Pages (`/filing/`):** Civil Lawsuits, Demand Letters, Probate, Bankruptcy, and Small Claims.
* **Modular Payment Checkpoint (`assets/js/export-gate.js`):** All exports across every tool and form checklist route through `window.ExhibitExportGate.requestExport()`.

## Deploy to GitHub Pages
1. Extract `clearfaultlegal-prose-3d-github-v2.zip` directly into the root of your GitHub repository.
2. Push to `main`.
3. Enable **Settings → Pages** using **GitHub Actions** (`.github/workflows/deploy.yml`) or **Deploy from a branch** (`main` / root).
