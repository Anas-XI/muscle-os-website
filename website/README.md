<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:6C63FF,100:3B82F6&height=130&section=header&text=Muscle%20OS%20Website&fontSize=40&fontAlignY=30" />
</div>

<h1 align="center">Muscle OS — Coaching Website</h1>

<p align="center">
  <strong>Bilingual (EN/AR) fitness coaching platform — Tools, Guides, Books, and AI Coach</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/bilingual-EN_|_AR-6C63FF?style=flat-square" />
  <img src="https://img.shields.io/badge/status-live-brightgreen?style=flat-square" />
</p>

<p align="center">
  <a href="https://muscleos.xyz"><strong>Visit Website →</strong></a>
</p>

---

## ✨ Features

- **Interactive Fitness Tools** — TDEE calculator, macro calculator, RPE load calculator, training volume calculator, split selector quiz, training tool
- **Knowledge Hub** — Evidence-based guides, books, and resources with inline PDF viewer
- **Bilingual Support** — Full English/Arabic interface with RTL layout
- **Mobile Responsive** — Thumb-friendly navigation, hamburger menu, micro-interactions
- **PDF Viewer** — Continuous scroll with search, download, and print support
- **Worker Backend** — Cloudflare Workers for PDF proxying, JWT auth, and API endpoints

---

## 📁 Structure

```
├── index.html              # Main landing page
├── tools/                  # Interactive fitness calculators
│   ├── index.html          # Tools overview
│   ├── tdee_adaptive_engine.html
│   ├── tdee_macro_calculator.html
│   ├── rpe_load_calculator.html
│   ├── volume_set_calculator.html
│   ├── split_selector_quiz.html
│   └── training_tool.html
├── books/                  # Program books and guides
├── guides/                 # Training and nutrition guides
├── knowledge-hub/          # Knowledge base articles
├── pdf/                    # PDF viewer library
├── assets/                 # Images and static assets
├── worker/                 # Cloudflare Workers backend
└── scripts/                # Build and utility scripts
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS |
| Styling | Custom CSS with CSS Variables |
| PDF Rendering | Custom viewer with continuous scroll |
| Backend | Cloudflare Workers |
| Auth | JWT-based worker authentication |
| Hosting | GitHub Pages + Cloudflare |

---

## 🚀 Deployment

```bash
# Website is served via GitHub Pages from the main branch
# Push to main → auto-deploys to muscleos.xyz

# Deploy Worker
cd worker
npx wrangler deploy
```

---

<p align="center">
  <a href="https://muscleos.xyz">muscleos.xyz</a> &nbsp;·&nbsp;
  <a href="https://github.com/Anas-XI/muscle-os-website">GitHub</a>
</p>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:6C63FF,100:3B82F6&height=80&section=footer" />
</div>