# CSI Operations - Master Architectural Guide & Sequential Dataflow Manual

---

## 1. Executive Summary & Purpose

**CSI Operations** is an enterprise-grade, institutional management platform built specifically for the **Computer Society of India (CSI) Student Branch** at **Rajagiri School of Engineering & Technology (RSET)**.

### The Real-World Operational Problem It Solves:
Managing an active technical student branch typically involves chaotic, disconnected tools:
* Event coordinators assigned manually in WhatsApp groups.
* Google Forms created by hand with inconsistent branding, wrong question formats, and misconfigured permissions (e.g., student email harvesting or requiring Google sign-in).
* Attendance sheets typed manually in Microsoft Word or Excel with misaligned tables.
* Feedback surveys manually constructed without mandatory NBA/NAAC Outcome-Based Education (OBE) course outcome (CO) and program outcome (PO) mapping.
* Certificate design and mail-merge workflows requiring Adobe Photoshop or local Python scripts to replace names, prone to typos and formatting bugs.

### The Unified Solution:
CSI Operations integrates the **entire lifecycle of a college event** into a single, cohesive web platform:
1. **Event Creation & Coordinator Workload Allocation** (tracking old vs. new coordinators, auto-balancing event counts).
2. **1-Click Google Drive Automation** (Google Apps Script webhooks automatically create official Google Forms and destination Google Sheets inside the club’s Drive folder).
3. **Institutional Document Generation** (Official Attendance Sheets with RSET/CSI crests, RSMS Notices, and Principal Permission Letters downloadable directly in `.docx` and `.pdf`).
4. **Outcome-Based Feedback Pipeline** (Dynamic Likert-scale surveys mapped directly to PO10 and PO11).
5. **Certificate Studio** (In-browser PPTX template parsing, merit winner selection for 1st/2nd/3rd place, and batch dual-folder ZIP export containing both custom PPTX and high-res vector PDFs).
6. **Cloud Database Sync** (Real-time synchronization with Supabase PostgreSQL and local offline caching).

---

## 2. Simple Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CLIENT LAYER (BROWSER)                       │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐  ┌────────────────┐   │
│   │   Next.js React    │   │   ThemeContext    │  │  LocalStorage  │   │
│   │     Dashboard      │   │ (Light/Dark Mode) │  │  Fast Cache    │   │
│   └─────────┬──────────┘   └─────────┬─────────┘  └───────┬────────┘   │
└─────────────┼────────────────────────┼────────────────────┼────────────┘
              │                        │                    │
              ▼                        ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               2. APPLICATION LOGIC & STORAGE ENGINE (SRC/)             │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      eventsStorage.ts                          │   │
│   │  • Syncs LocalStorage cache with cloud database                │   │
│   │  • Fires 'csi_events_updated' broadcast events                 │   │
│   │  • Calculates coordinator workload statistics                  │   │
│   └──────────┬─────────────────────────────┬───────────────────────┘   │
│              │                             │                           │
│              ▼                             ▼                           │
│   ┌──────────────────────┐      ┌──────────────────────────────┐       │
│   │ POST /api/google-form│      │   POST /api/convert-pptx     │       │
│   │ Webhook Dispatcher   │      │   Template Media Extractor   │       │
│   └──────────┬───────────┘      └──────────────┬───────────────┘       │
└──────────────┼─────────────────────────────────┼───────────────────────┘
               │                                 │
               ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│             3. CLOUD BACKEND & EXTERNAL WORKSPACE SERVICES             │
│                                                                        │
│   ┌──────────────────────┐              ┌──────────────────────────┐   │
│   │   Supabase Postgres  │              │   Google Apps Script     │   │
│   │   Cloud Database     │              │   Deployments (Drive)    │   │
│   │   (events & members) │              │   (Forms & Sheets)       │   │
│   └──────────────────────┘              └──────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Tour: The Purpose of Every File & Folder

```
R:\VSCODE\CSI_Operations
├── public/                 # Static assets served at the root URL (/)
│   ├── logos/              # Official institutional PNG logos
│   │   ├── csi_logo.png    # CSI official emblem (used in headers & certificates)
│   │   └── rset_logo.png   # RSET college seal (used in attendance sheets & letters)
│   └── templates/          # Base template images
├── src/                    # All active application source code
│   ├── app/                # Next.js 14 App Router (pages and server endpoints)
│   │   ├── api/            # Serverless backend routes
│   │   │   ├── convert-pptx/route.ts  # PPTX slide extraction & preview
│   │   │   └── google-form/route.ts   # Webhook router for Google Apps Script
│   │   ├── events/         # Events Archive & Event Container
│   │   │   ├── [id]/       # Dynamic single event container
│   │   │   │   ├── certificates/page.tsx # Dedicated Certificate Studio
│   │   │   │   └── page.tsx              # Event Master Dashboard (Forms, Attendance)
│   │   │   └── page.tsx    # All Events Grid/Table with Search, Filter & KPIs
│   │   ├── members/page.tsx# Member Directory (23 coordinators, roles, domains)
│   │   ├── globals.css     # CSS variables, typography, light/dark mode overrides
│   │   ├── layout.tsx      # Root HTML shell, anti-flash script, ThemeProvider
│   │   └── page.tsx        # Executive Overview Dashboard (KPI stats & charts)
│   ├── components/         # Reusable React components
│   │   ├── CreateEventModal.tsx # Multi-step event creation wizard with coordinator pickers
│   │   ├── Navbar.tsx      # Fixed sidebar navigation & theme toggle
│   │   └── ThemeContext.tsx# Light/Dark React Context state manager
│   └── lib/                # Pure utility logic, data engines, exporters
│       ├── certificateExport.ts # PPTX XML manipulation, jsPDF generator, ZIP builder
│       ├── data.ts          # Default initial events (13) and members (23)
│       ├── documentExport.ts# HTML-to-PDF / Word generator for attendance & notices
│       ├── eventsStorage.ts # Core sync engine (LocalStorage + Supabase + DOM events)
│       ├── feedbackFormGenerator.ts # NBA/NAAC CO/PO question builder
│       ├── formScriptGenerator.ts   # Google Apps Script code & response mapping
│       ├── supabaseClient.ts        # Supabase JavaScript SDK initializer
│       └── types.ts         # TypeScript interfaces (CSIEvent, Member, Branch)
├── supabase/               # SQL database migrations & schemas
│   ├── 01_schema.sql       # Initial table definitions
│   ├── 02_seed_members.sql # Initial 23 member profiles
│   ├── 03_seed_events.sql  # 13 historical events with coordinator assignments
│   ├── 04_rls_policies.sql # Security policy definitions
│   └── 07_migration_sync.sql# Master sync migration (adds all rich columns & unlocks RLS)
├── .env.local              # Local private environment keys (NEVER pushed to GitHub)
├── .gitignore              # Rules telling Git which files to ignore
├── next.config.mjs         # Next.js build configuration (ESLint/TS build flags)
├── package.json            # Node.js project manifest & dependencies
└── tailwind.config.ts      # Custom CSI color tokens (purple, surface, sidebar, text)
```

### Why Certain Files Are in `.gitignore`:
* **`.env.local` / `.env`:** Contains your live database keys and secrets (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). If pushed to a public GitHub repo, scrapers and bots could abuse your database quota.
* **`node_modules/`:** The third-party dependencies downloaded by `npm`. This folder is thousands of files (>200 MB); committing it would bloat the Git history. Anyone running `npm install` reconstructs it in seconds.
* **`.next/` & `build/`:** Temporary compilation outputs generated whenever `next dev` or `next build` runs. They change on every save and are specific to your local operating system architecture.
* **`*.tsbuildinfo`:** TypeScript cache files that speed up local rebuilds.

---

## 4. End-to-End Sequential Dataflow

Here is what happens step-by-step from the exact moment a user opens the website to certificate export and database storage:

```
[1. User visits /]
       │
       ▼
[layout.tsx <head> script] ──► Checks localStorage('csi_theme') ──► Injects .light or .dark to <html> (0ms flash)
       │
       ▼
[page.tsx / events/page.tsx] ──► Calls getStoredEvents() in eventsStorage.ts
       │
       ├──► 1. Synchronously reads LocalStorage cache (Renders immediately in 0ms)
       │
       └──► 2. Asynchronously fetches supabase.from('events').select('*')
                 │
                 ▼
       [Supabase returns live rows] ──► Updates LocalStorage ──► Dispatches 'csi_events_updated'
                                                                           │
                                                                           ▼
                                                    [React state updates smoothly without refresh]

─────────────────────────────────────────────────────────────────────────────

[2. User creates an Event in CreateEventModal.tsx]
       │
       ▼
[saveNewEvent(newEvent) in eventsStorage.ts]
       │
       ├──► Generates UUID / ID ('e' + timestamp)
       ├──► Updates LocalStorage immediately
       ├──► Dispatches 'csi_events_updated' (UI shows event instantly)
       ├──► Updates assigned coordinators' workload counts (+1)
       │
       └──► Sends async REST to Supabase:
                 │
                 ├──► supabase.from('events').insert(...)
                 └──► supabase.from('members').update(events_coordinated_count)

─────────────────────────────────────────────────────────────────────────────

[3. User clicks "Create Form in Drive" on /events/[id]]
       │
       ▼
[src/app/api/google-form/route.ts]
       │
       ▼
[Google Apps Script Master Webhook (script.google.com)]
       │
       ├──► FormApp.create() creates Registration Form in CSI Google Drive
       │    └── Applies official CSI settings (No email limit, no progress bar, clean branding)
       ├──► SpreadsheetApp.create() creates Destination Responses Google Sheet
       ├──► Links Form responses to this Google Sheet
       │
       └──► Returns { formUrl, editUrl, sheetUrl, sheetId }
                 │
                 ▼
[src/app/events/[id]/page.tsx]
       │
       ├──► Saves links to event.google_form_url & event.google_sheet_url
       ├──► Saves links to Supabase via updateEvent()
       └──► UI reveals: "Live Student Form", "Edit in Forms", and "Sync Final Roster to Attendance"

─────────────────────────────────────────────────────────────────────────────

[4. User clicks "Sync Final Roster to Attendance"]
       │
       ▼
[Google Apps Script reads linked Google Sheet rows]
       │
       ▼
[mapGoogleFormResponsesToAttendance in formScriptGenerator.ts]
       │
       ├──► Maps Name, Email, Department, Division into event.registered_attendees
       └──► Saves to Supabase
                 │
                 ▼
[User clicks "Download Attendance Sheet"] ──► documentExport.ts generates official Word (.docx) & PDF

─────────────────────────────────────────────────────────────────────────────

[5. Outcome-Based Feedback Form & QR Code]
       │
       ▼
[feedbackFormGenerator.ts]
       │
       ├──► Generates dynamic questions mapped to NBA PO10 (Communication) & PO11 (Project Management)
       ├──► Deploys Feedback Form & linked Feedback Sheet to Google Drive
       ├──► Generates live on-screen downloadable QR code for auditorium projection
       │
       └──► When participants submit, "Sync Feedback Responses" imports attendees into Certificate Pipeline

─────────────────────────────────────────────────────────────────────────────

[6. Dedicated Certificate Studio on /events/[id]/certificates]
       │
       ▼
[Coordinator selects 1st, 2nd, 3rd Place Winners]
       │
       ▼
[Coordinator uploads .pptx PowerPoint template (or image)]
       │
       ▼
[certificateExport.ts]
       │
       ├──► Uses JSZip to extract slide background from ppt/media/
       ├──► Generates live interactive preview of certificate
       │
       └──► User clicks "Download Certificates (.ZIP)":
                 │
                 ├──► Winners Folder: Injects names into PPTX XML + generates crisp PDFs
                 ├──► Participation Folder: Generates certificates for all verified attendees
                 └──► Browser delivers dual-folder .zip archive!
```

---

## 5. Detailed Breakdown of Each Pipeline

### Stage 1: Boot & Theme Architecture (`layout.tsx`, `ThemeContext.tsx`, `globals.css`)
1. **The Anti-Flash Script (`src/app/layout.tsx`):**
   When the browser first requests HTML, before React even mounts, an inline script in `<head>` executes:
   ```javascript
   const t = localStorage.getItem('csi_theme');
   if (t === 'light') document.documentElement.classList.add('light');
   else document.documentElement.classList.add('dark');
   ```
   This prevents the "white flash" or "dark flash" that plagues most client-side apps.
2. **The Theme Manager (`src/components/ThemeContext.tsx`):**
   Wraps `{children}`. It provides `theme` ("dark" | "light") and `toggleTheme()`. When clicked, it flips the class on `document.documentElement` and saves the preference to `localStorage.setItem('csi_theme', ...)`.
3. **The Styling Engine (`src/app/globals.css`):**
   Tailwind CSS is customized with semantic variables (`--background`, `--foreground`). In light mode (`html.light`), surfaces invert to crisp `#ffffff` and text becomes `#0f172a`, while in dark mode they revert to deep violet-black (`#0b0914`).

---

### Stage 2: The Hybrid Cache & Sync Engine (`eventsStorage.ts`)
To ensure the app feels instantaneous and never shows a blank loading spinner, it uses an **Optimistic Cache-First Strategy**:
1. **Read Path:**
   * When `getStoredEvents()` is called, it reads synchronously from `localStorage`.
   * It immediately returns the cached array, so the page renders in **0 milliseconds**.
   * If in a browser and 20 seconds have elapsed, it quietly fires `syncEventsWithSupabase()` in the background.
   * When Supabase responds with the latest database records, it updates `localStorage` and triggers:
     ```typescript
     window.dispatchEvent(new CustomEvent("csi_events_updated", { detail: mergedEvents }));
     ```
   * Any page listening to this event automatically updates its React state without reloading the browser.
2. **Write Path:**
   * When `saveNewEvent()` is called, it assigns a UUID (`crypto.randomUUID()`), prepends it to the local array, and writes to `localStorage`.
   * It dispatches `"csi_events_updated"` so the UI reflects the new event in less than 1 frame (16ms).
   * It asynchronously runs `supabase.from('events').insert(...)` to persist the event in the cloud.

---

### Stage 3: Event Wizard & Workload Balancing (`CreateEventModal.tsx`)
1. The coordinator opens the modal. It reads the 23 club members from `getStoredMembers()`.
2. As coordinators are selected for an event, the badge displays their classification:
   * **Old Coordinator:** Senior executive mentor.
   * **New Coordinator:** Junior coordinator gaining hands-on event leadership.
3. Upon submission:
   * The assigned coordinator names are saved into `event.assigned_coordinators: TEXT[]`.
   * The app increments `events_coordinated_count` for each assigned member in `members` table in Supabase.

---

### Stage 4: Google Drive Automation (`/api/google-form/route.ts`)
1. In the event details page ([`src/app/events/[id]/page.tsx`](file:///r:/VSCODE/CSI_Operations/src/app/events/[id]/page.tsx)), clicking **"Create Form in Drive"** sends a POST request to `/api/google-form`.
2. The route inspects `payload.action`:
   * If action is registration-related (`create_form`, `toggle_registration`, `fetch_sheet_data`), it calls `NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL`.
   * If action is feedback-related (`create_feedback_form`, `toggle_feedback`), it calls `NEXT_PUBLIC_CSI_FEEDBACK_WEBHOOK_URL`.
3. The Google Apps Script executes inside the club's Google account:
   * Calls `FormApp.create("Event Name Registration Form")`.
   * Applies CSI brand settings: **collect emails is disabled**, **single-response limit disabled**, **allow edits disabled**, and **progress bar disabled**.
   * Injects the 9 institutional RSET questions (Title, Name, Rajagiri Email, WhatsApp, Year, Department, Division, CSI Membership status, Membership ID).
   * Calls `SpreadsheetApp.create("Event Name - Registrations (Responses)")`.
   * Links the form to the spreadsheet using `form.setDestination(FormApp.DestinationType.SPREADSHEET, sheetId)`.
4. The webhook returns the published form URL, edit URL, and spreadsheet URL.
5. The Next.js app receives these URLs, updates `event.google_form_url` and `event.google_sheet_url`, and saves them to Supabase!
6. Instantly, the UI reveals the **"Live Student Form"**, **"Edit in Forms"**, and **"Responses Sheet"** buttons!

---

### Stage 5: Attendance Sheet & Document Pipeline (`documentExport.ts`)
1. Once registrations close, the coordinator clicks **"Sync Final Roster to Attendance"**.
2. The webhook reads the rows of the Google Sheet and returns the student roster.
3. The names, roll numbers, and branches are mapped into `event.registered_attendees`.
4. When the coordinator clicks **Download Attendance Sheet**:
   * If `event.mode === "Online"`, the system notifies that physical attendance sheets are not applicable for online webinars.
   * If `event.mode === "Offline"`, [`documentExport.ts`](file:///r:/VSCODE/CSI_Operations/src/lib/documentExport.ts) generates:
     * **Official Attendance Sheet (.docx / .pdf):** Formatted with RSET and CSI headers, faculty coordinator signatures, and sign-in columns.
     * **Principal Permission Letter (.docx / .pdf):** Formatted institutional request letter addressed to the Principal.
     * **RSMS Notice (.docx / .pdf):** Clean text notice formatted for student intranet publication.

---

### Stage 6: Outcome-Based Feedback Pipeline (`feedbackFormGenerator.ts`)
1. Before event conclusion, the coordinator opens the Feedback section.
2. The platform generates dynamic feedback questions compliant with NBA/NAAC criteria:
   * **PO10 (Communication):** Quality of speaker delivery, presentation clarity.
   * **PO11 (Project Management):** Timeliness, logistics, audio-visual arrangement.
3. Clicking **"Create Feedback Form in Drive"** deploys the survey to Google Drive and generates an on-screen **downloadable QR code** (using `qrcode` canvas) that coordinators can project onto auditorium screens!

---

### Stage 7: The Dedicated Certificate Studio (`certificates/page.tsx`, `certificateExport.ts`)
1. **Attendee Loading:**
   When student feedback responses sync, verified participants populate the Certificate Studio.
2. **Winner Selection:**
   Coordinators select 1st, 2nd, and 3rd place winners from searchable attendee dropdowns (multi-winner teams supported).
3. **Template Ingestion:**
   Coordinators upload their official PowerPoint certificate template (`.pptx`) or image (`.png`/`.jpg`).
4. **Pure Client-Side PPTX & PDF Generation (`certificateExport.ts`):**
   * Using **`JSZip`**, the application opens the `.pptx` file directly in memory.
   * It extracts the high-resolution slide background from `ppt/media/`.
   * For the PowerPoint archive, it replaces the XML placeholder `<<name>>` and merit positions directly inside `ppt/slides/slide1.xml`.
   * For the PDF archive, **`jsPDF`** draws the extracted template background, calculates centered coordinates, and renders the student's name in crisp vector typography.
5. **Dual-Folder ZIP Export:**
   The browser packages two organized folders into a single `.zip` file:
   * `Winners_Appreciation_Certificates/` (1st, 2nd, 3rd place PDFs & PPTXs)
   * `Participation_Certificates/` (All verified attendee PDFs & PPTXs)

---

## 6. Supabase Database Schema Reference

The platform uses two tables connected by coordinator name arrays:

### `events` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Unique ID (e.g. `'e1'` or UUID) |
| `event_name` | `TEXT NOT NULL` | Title of the event |
| `event_date` | `TEXT NOT NULL` | Date in `'YYYY-MM-DD'` format |
| `time_start` / `time_end` | `TEXT` | Event time window |
| `mode` | `TEXT DEFAULT 'Offline'` | `'Offline'` or `'Online'` |
| `venue` | `TEXT` | Auditorium, Lab, or HackerRank platform |
| `target_branches` | `TEXT[]` | Target student branches (`CSE`, `IT`, `CSBS`, etc.) |
| `status` | `TEXT` | `'planned'`, `'confirmed'`, `'completed'` |
| `assigned_coordinators` | `TEXT[]` | Array of student coordinator names |
| `google_form_url` | `TEXT` | Published Google Form link |
| `google_sheet_url` | `TEXT` | Linked Google Sheet responses URL |
| `registered_attendees` | `JSONB` | Array of students registered |
| `feedback_attendees` | `JSONB` | Array of students who submitted feedback |
| `winners` | `JSONB` | JSON object containing `first_place`, `second_place`, `third_place` |

### `members` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID / TEXT PRIMARY KEY` | Member unique identifier |
| `name` | `TEXT NOT NULL` | Full student name |
| `role` | `TEXT` | Leadership designation (e.g. President, Creative Lead) |
| `domain` | `TEXT` | Domain (`Executive`, `Operations`, `Technical`, etc.) |
| `class_batch` | `TEXT` | Semester & Class (e.g. `S7 CS A`, `S5 CSBS`) |
| `member_type` | `TEXT` | `'old_coordinator'` or `'new_coordinator'` |
| `is_active` | `BOOLEAN` | Active term status (`true` / `false`) |
| `events_coordinated_count` | `INTEGER` | Real-time count of events coordinated |

