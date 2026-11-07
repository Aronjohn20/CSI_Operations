# CSI Operations Platform

An enterprise-grade operational orchestration and event automation platform engineered for the **Computer Society of India (CSI) Student Branch at Rajagiri School of Engineering & Technology (RSET)**.

---

## 🚀 Overview

CSI Operations centralizes all event lifecycle workflows into a single dashboard. Instead of manually drafting notices, generating registration forms, formatting attendance sheets, calculating Program Outcome (PO) feedback, and designing certificates, this platform automates the entire pipeline from event inception to certificate distribution.

```
Event Creation ➔ Approvals (RSMS & Permission Letters) ➔ Registration Forms ➔ Attendance ➔ Feedback & PO Mapping ➔ Certificate Studio
```

---

## 🌟 Key Features & Implemented Systems

### 1. 📊 Central Operations Dashboard (`/`)
- **Key Metrics**: Real-time counter of total members, new coordinators vs. senior coordinators, active events, and completed archives.
- **Quick Links**: Direct shortcuts to active event containers and roster management.

### 2. 📅 Event Management Hub (`/events`)
- **Event Creation**: Single-form entry capturing Event Name, Date, Start/End Time, Venue, Mode (Offline / Online), Target Departments (CS, AI, DS, IT, ECE, EEE, ME, CE, etc.), and Required Coordinators.
- **Smart Coordinator Assignment**: Automated allocation from the verified 23-member student roster with class and batch metadata (e.g., `S5 CSBS`, `S7 IT`).
- **Persistence & Archive**: Events are persisted in browser storage and can be updated, reviewed, or deleted at any time.

### 3. 📑 Event Container Pipeline (`/events/[id]`)

Every event gets a dedicated operational container with 5 automated phases:

#### Phase 1: Institutional Approvals & Notices
- **RSMS Notice**: Generates officially formatted RSMS technical announcements ready for college intranet publication (Exportable as **PDF** and editable **Word `.docx`**).
- **Principal & HoD Permission Letter**: Automatically populates institutional headers, target dates, venue requirements, faculty coordinator endorsements (**Dr. Tripti C**), and student coordinators. Exportable as **PDF** and **Word `.docx`**.

#### Phase 2: Registration & Google Forms Automation
- **Google Apps Script Generator**: Generates production-ready Apps Script code to create branded Google Forms with validation, year choices, and branch restrictions.
- **Google Drive Direct Integration**: Direct API integration to create and open forms in Google Drive with a single click.
- **Live Google Sheet Sync**: Connect a Google Sheet response link to instantly map registered attendees, student roll numbers, and departments into the local attendance database.
- **Registration Controller**: Toggle registrations between `Open` and `Closed` dynamically.

#### Phase 3: Registration QR & Shortlinks
- **Instant QR Generator**: Auto-renders high-definition downloadable SVG/PNG QR codes pointing to registration forms.
- **Link Hub**: Copyable direct URLs, Bitly shortlinks, and social broadcast copy formatted for WhatsApp and Instagram.

#### Phase 4: Attendance & On-Site Verification
- **Official Attendance Sheets**: One-click generation of printable sign-in rosters carrying verified RSET & CSI SB RSET logos, table column headers, and faculty sign-off blocks (Exportable to **PDF** and **Word `.docx`**).

#### Phase 5: Feedback & NBA Program Outcome (PO) Mapping
- **Standardized Questionnaires**: Pre-configured feedback forms aligned with NBA accreditation requirements:
  - Technical relevance & clarity
  - Practical exposure & hands-on depth
  - Speaker/Mentor evaluation
  - PO-mapped ratings (PO1, PO2, PO3, PO5, PO9, PO10, PO12)
- **Feedback Apps Script & Sheet Sync**: Generate Google Form feedback scripts and sync real responses back to calculate average rating metrics.

---

### 4. 🎓 Certificate Studio (`/events/[id]/certificates`)

A comprehensive certificate generation and batch export suite:

- **Dual-Track Certification**:
  1. **Certificates of Merit & Appreciation**: Awarded to 1st, 2nd, and 3rd place winners with designated position badges.
  2. **Certificates of Participation**: Generated for all validated attendees.
- **Multi-Format Custom Template Support**:
  - **PowerPoint (`.pptx`, `.ppt`)**: Upload custom presentation templates. Automatically substitutes tags (`<<name>>`, `<<event>>`, `<<date>>`, `<<position>>`, `[Event Name]`, etc.) and batch-converts them to high-resolution PDFs.
  - **PDF (`.pdf`)**: Client-side high-DPI rasterization via PDF.js with automated name and event stamping.
  - **Images (`.png`, `.jpg`, `.jpeg`)**: Full-bleed background stamping with customizable typography.
- **Batch ZIP Export**: Exports two clean zip archives:
  - `Appreciation_Certificates_[Event].zip` (Winners & Merit)
  - `Participation_Certificates_[Event].zip` (All Attendees)
- **Single PDF Download**: Preview any individual certificate live and download its individual PDF.

---

### 5. 👥 Team & Members Roster (`/members`)
- Complete database of CSI Student Branch coordinators:
  - Full Name, Role (Lead, Technical, Media, Web, Content, Design)
  - College Class & Batch (e.g. `S5 CSBS`, `S7 AD`)
  - Status (Active / Senior / Old Coordinator)
- Used across the platform to auto-populate event coordinators and attendance sheets.

---

## 📖 How to Use (Guide for Team Associates)

### Workflow 1: Organizing a New Event
1. Navigate to **Events** (`/events`) and click **"Create Event"**.
2. Enter the event details:
   - Event Title (e.g. *Glitch Heist*, *Off the Script*)
   - Date, Time, and Venue
   - Select student coordinators from the dropdown
3. Click **"Save Event"** to create the event container.

### Workflow 2: Getting Institutional Approvals
1. Open the created event container (`/events/[id]`).
2. Scroll to **Phase 1: Pre-Event Documents**:
   - Click **"Download RSMS Notice (PDF / Word)"** for college intranet announcement.
   - Click **"Download Permission Letter (PDF / Word)"** to submit to the Principal / HoD.

### Workflow 3: Setting Up Registration
1. In **Phase 2: Registration & Drive Integration**:
   - Click **"Copy Google Apps Script"** or **"Create Form in Drive"**.
   - Paste the script into Google Apps Script (`script.google.com`) and run `createEventForm()` to generate the form automatically.
   - Copy the Google Form link and paste it into the **Form URL** field.
2. In **Phase 3: QR Code & Sharing**:
   - Download the generated QR code for inclusion in posters or flyers.
   - Click **"Copy Message"** for ready-to-share WhatsApp broadcast templates.

### Workflow 4: Taking Attendance & Syncing Registrations
1. In **Phase 4: Attendance Sheet**:
   - Download the attendance sheet as **PDF** or **Word** for physical sign-ins.
2. If using Google Forms:
   - Click **"Sync from Google Sheet"**, paste your Google Sheet response link, and attendees will populate automatically.

### Workflow 5: Generating Certificates
1. Navigate to **Phase 6** or click **"Open Certificate Studio"** (`/events/[id]/certificates`).
2. **Assign Winners**:
   - Select 1st, 2nd, and 3rd place winners from the attendee list.
3. **Choose Template**:
   - Use the pre-baked official CSI SB RSET template or click **"Upload Custom Template"** to upload a `.pptx` or `.pdf` design.
4. **Export**:
   - Click **"Download Appreciation Certificates ZIP"** for winners.
   - Click **"Download Participation Certificates ZIP"** for attendees.
   - Or click **"Download PDF"** next to any specific student to download their individual certificate.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom CSI dark-mode theme
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) & [PDF.js](https://mozilla.github.io/pdf.js/)
- **Document Processing**: [docx](https://docx.js.org/) for Word exports, [JSZip](https://stuk.github.io/jszip/) for batch packaging
- **Presentation Engine**: OpenXML tag replacement & PowerPoint COM converter API
- **Icons**: [Lucide React](https://lucide.dev/)
- **QR Codes**: [node-qrcode](https://github.com/soldair/node-qrcode)

---

## 💻 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (LTS recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- Windows, macOS, or Linux

### 1. Clone & Install
```bash
git clone https://github.com/Aronjohn20/CSI_Operations.git
cd CSI_Operations
npm install
```

### 2. Environment Variables (Optional for Google Drive API)
Create a `.env.local` file in the project root if you want direct Google Drive API form generation:
```env
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```
*(If omitted, you can still copy the auto-generated Google Apps Script directly into script.google.com!)*

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🌐 Deployment (Vercel)

This repository is configured for automated CI/CD deployment on **Vercel**:
1. Connect your GitHub repository to Vercel.
2. In Project Settings, set Framework Preset to **Next.js**.
3. (Optional) Add your `.env.local` environment variables under **Environment Variables**.
4. Every push to the `main` branch automatically deploys to production.

---

## 🛡️ License & Credits

- Built for **Computer Society of India (CSI) Student Branch**, Rajagiri School of Engineering & Technology (RSET), Kakkanad, Kochi.
- Maintained by the CSI SB RSET Operations Team.
