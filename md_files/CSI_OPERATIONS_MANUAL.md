# CSI Operations - Master Architectural Guide & Sequential Dataflow Manual

---

## 1. Executive Summary & Purpose

**CSI Operations** is an enterprise-grade, institutional management platform built specifically for the **Computer Society of India (CSI) Student Branch** at **Rajagiri School of Engineering & Technology (RSET)**.

### The Real-World Operational Problem It Solves:
Managing an active technical student branch typically involves chaotic, disconnected tools:
* Event coordinators assigned manually in WhatsApp groups without workload tracking.
* Google Forms created by hand with inconsistent branding, wrong question formats, and misconfigured permissions (e.g., student email harvesting or requiring Google sign-in).
* Attendance sheets typed manually in Microsoft Word or Excel with misaligned tables and missing college crests.
* Feedback surveys manually constructed without mandatory NBA/NAAC Outcome-Based Education (OBE) course outcome (CO) and program outcome (PO) mapping.
* Certificate design and mail-merge workflows requiring Adobe Photoshop or local Python scripts to replace names, prone to typos and formatting bugs.

### The Unified Solution:
CSI Operations integrates the **entire lifecycle of a college event** into a single, cohesive web platform:
1. **Event Creation & Coordinator Workload Allocation** (tracking old vs. new coordinators, auto-balancing event counts).
2. **1-Click Google Drive Automation** (Google Apps Script webhooks automatically create official Google Forms and destination Google Sheets inside the club’s Drive folder).
3. **Institutional Document Generation** (Official Attendance Sheets with RSET/CSI crests, RSMS Notices, and Principal Permission Letters downloadable directly in `.docx` and `.pdf`).
4. **Outcome-Based Feedback Pipeline** (Dynamic Likert-scale surveys mapped directly to PO10 and PO11, with live auditorium QR codes).
5. **Certificate Studio** (In-browser PPTX template parsing, merit winner selection for 1st/2nd/3rd place, and batch dual-folder ZIP export containing both custom PPTX and high-res vector PDFs).
6. **Cloud Database Sync** (Real-time synchronization with Supabase PostgreSQL and local offline caching).

---

## 2. High-Level Master Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               1. CLIENT / PRESENTATION LAYER                           │
│                                                                                        │
│   ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────────────┐   │
│   │   Executive Page   │    │    Events Master   │    │     Certificate Studio     │   │
│   │   (src/app/page)   │    │  (events/[id]/page)│    │(events/[id]/certificates)  │   │
│   └─────────┬──────────┘    └─────────┬──────────┘    └──────────────┬─────────────┘   │
│             │                         │                              │                 │
│             ▼                         ▼                              ▼                 │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                    Shared Components & State Context                           │   │
│   │   • Navbar.tsx                • ThemeContext.tsx (Light / Dark class)          │   │
│   │   • CreateEventModal.tsx      • DOM Event: 'csi_events_updated'                │   │
│   └───────────────────────────────────┬────────────────────────────────────────────┘   │
└───────────────────────────────────────┼────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      2. LOCAL CACHING & RUNTIME STORAGE ENGINE                         │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                      src/lib/eventsStorage.ts (The Hub)                        │   │
│   │  • Synchronous 0ms local read from browser LocalStorage                        │   │
│   │  • Fallback initial dataset from src/lib/data.ts (13 events, 23 members)       │   │
│   │  • Auto-recalculates coordinator allocation stats & loads types from types.ts  │   │
│   │  • Background polling & live persistence with Supabase SDK                     │   │
│   └──────────┬─────────────────────────────┬───────────────────────────┬───────────┘   │
└──────────────┼─────────────────────────────┼───────────────────────────┼───────────────┘
               │                             │                           │
               ▼                             ▼                           ▼
┌──────────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────────────┐
│     3. DOCUMENT EXPORTERS    │ │   4. NEXT.JS API ROUTES   │ │  5. SUPABASE BACKEND    │
│                              │ │                           │ │                         │
│ • documentExport.ts          │ │ • api/google-form/route.ts│ │ • supabaseClient.ts     │
│   (PDF / Word via jsPDF &    │ │   (Webhook Dispatcher     │ │ • Database Tables:      │
│    embedded base64 logos)    │ │    with 28s timeout/retry)│ │   - events (JSONB/array)│
│ • certificateExport.ts       │ │ • api/convert-pptx/route.ts│ │   - members (profiles)  │
│   (PPTX XML injection,       │ │   (PowerPoint COM server  │ │   - event_coordinators  │
│    jsPDF vector canvas, ZIP) │ │    preview & PDF batch)   │ │ • Triggers & Views      │
│ • logosBase64.ts /           │ └─────────────┬─────────────┘ └────────────┬────────────┘
│   coordinatorTemplateBase64  │               │                            │
└──────────────────────────────┘               │                            │
                                               ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        6. EXTERNAL WORKSPACE & GOOGLE CLOUD                            │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                     Google Apps Script Master Webhook Hub                      │   │
│   │                     (scripts/csi_master_webhook.js)                            │   │
│   │  • FormApp: Creates Registration & Feedback Forms                              │   │
│   │  • SpreadsheetApp: Creates linked destination Google Sheets                    │   │
│   │  • Data Extraction: Reads attendee rows and returns JSON to Next.js API        │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Tour: Deep File-by-File Reference

This section details every single file in the project, explaining why it exists, what functions or routes it exposes, and how other files consume it.

```
R:\Downloads\CSI_Operations-main\CSI_Operations-main
├── public/                 # Static assets served at root HTTP path
│   ├── logos/              # High-resolution PNG brand logos
│   │   ├── csi_logo.png    # CSI official crest
│   │   └── rset_logo.png   # RSET college emblem
│   └── templates/          # Graphic templates
│       └── coordinator_cert_template.png # Official coordinator certificate background
├── src/                    # Application source code
│   ├── app/                # Next.js 14 App Router
│   │   ├── api/            # Serverless backend HTTP endpoints
│   │   │   ├── convert-pptx/route.ts # Windows PowerPoint COM slide extractor & PDF batch
│   │   │   └── google-form/route.ts  # Relay proxy to Google Apps Script Webhooks
│   │   ├── events/         # Events archive & detail views
│   │   │   ├── [id]/       # Dynamic single event container
│   │   │   │   ├── certificates/
│   │   │   │   │   ├── pdf/page.tsx   # Client-side vector PDF certificate studio
│   │   │   │   │   └── page.tsx       # Dual PPTX/PDF batch certificate studio
│   │   │   │   └── page.tsx           # Single event operations master control
│   │   │   └── page.tsx    # All events table with search, filters & KPIs
│   │   ├── members/        # Club executive member roster
│   │   │   └── page.tsx    # Member directory, domain filters, workload counts
│   │   ├── globals.css     # CSS design tokens, dark/light themes, typography
│   │   ├── layout.tsx      # Root HTML document, anti-flash script, ThemeProvider
│   │   └── page.tsx        # Executive dashboard with summary cards & charts
│   ├── components/         # Reusable React components
│   │   ├── CreateEventModal.tsx # Multi-step event creation wizard with coordinator pickers
│   │   ├── Navbar.tsx      # Sidebar navigation & theme toggle
│   │   └── ThemeContext.tsx# React context provider for light/dark theme switching
│   └── lib/                # Pure logic, data layer & export utilities
│       ├── certificateExport.ts        # PPTX XML parser, jsPDF renderer, dual ZIP packaging
│       ├── coordinatorTemplateBase64.ts# Inlined Base64 data URI of coordinator certificate
│       ├── data.ts                     # Initial fallback seed data (13 events, 23 members)
│       ├── documentExport.ts           # Word (.doc) and PDF generators for attendance/notices
│       ├── eventsStorage.ts            # Core sync engine (LocalStorage + Supabase + DOM events)
│       ├── feedbackFormGenerator.ts    # NBA/NAAC CO/PO feedback question generator & parser
│       ├── formScriptGenerator.ts      # Google Form script generator & response roster mapper
│       ├── logosBase64.ts               # Inlined Base64 data URIs for RSET and CSI logos
│       ├── supabaseClient.ts           # Supabase JavaScript SDK initialization
│       └── types.ts                    # TypeScript data models and interfaces
├── scripts/                # Standalone automation scripts (Google Apps Script)
│   ├── csi_master_webhook.js           # Multi-action Google Apps Script web app
│   └── google_apps_script_registration.js # Manual single-run Apps Script for registration forms
├── supabase/               # PostgreSQL schemas, migrations, views & triggers
│   ├── 01_schema.sql       # Initial table definitions (`events`, `members`, `event_coordinators`)
│   ├── 02_seed_members.sql # SQL seed statements for the 23 club members
│   ├── 03_seed_events.sql  # SQL seed statements for the 13 historical events
│   ├── 04_rls_policies.sql # Row Level Security policy templates
│   ├── 05_auto_count_trigger.sql # PostgreSQL trigger for auto-counting events
│   ├── 06_useful_views.sql # SQL reporting views (member workload, domain stats)
│   ├── 07_migration_sync.sql # Master migration script (adds rich columns & unlocks RLS)
│   └── README.md           # Step-by-step setup guide for Supabase database
├── .gitignore              # Files excluded from version control
├── next.config.mjs         # Next.js build and runtime configuration
├── package.json            # Node.js project manifest & dependencies
├── run.bat                 # 1-click Windows development server launcher
├── tailwind.config.ts      # Tailwind CSS color system and design tokens
└── tsconfig.json           # TypeScript configuration and path aliases (`@/*`)
```

---

### Detailed File Descriptions

#### 1. Core Pages & Layouts (`src/app/`)
* **`src/app/layout.tsx`**:
  * **Role**: Root application layout wrapping every page.
  * **Key Mechanism**: Contains an inline `<script>` in `<head>` that reads `localStorage.getItem('csi_theme')` before HTML rendering to inject `.light` or `.dark` directly onto `document.documentElement`, ensuring zero visual flicker (0ms flash). Wraps `{children}` inside `ThemeProvider` and mounts `Navbar.tsx` alongside the main content viewport.
* **`src/app/globals.css`**:
  * **Role**: Design system stylesheet defining CSS custom properties (`--background`, `--foreground`, `--surface`, `--border`, `--accent`).
  * **Key Mechanism**: Provides smooth theme switching. Light mode (`html.light`) sets crisp white surfaces (`#ffffff`) and slate text (`#0f172a`), while dark mode (`html.dark`) sets deep obsidian purple backgrounds (`#0b0914`).
* **`src/app/page.tsx`**:
  * **Role**: Executive Overview Dashboard.
  * **Key Mechanism**: Calls `getStoredEvents()` and `getStoredMembers()` from `eventsStorage.ts`. Listens to the `csi_events_updated` and `csi_members_updated` custom window events. Displays 4 real-time KPI cards (Active Coordinators, Total Events, Completed Events, Active Term Progress) and quick-action shortcuts.
* **`src/app/events/page.tsx`**:
  * **Role**: Master Events Archive directory.
  * **Key Mechanism**: Displays all club events in an interactive grid/table with real-time text search, status filters (`all`, `planned`, `confirmed`, `completed`), date sorting, and KPI summary counters. Hosts the trigger for opening `CreateEventModal.tsx`.
* **`src/app/events/[id]/page.tsx`**:
  * **Role**: Single Event Master Operational Container.
  * **Key Mechanism**: The central command center for a selected event. Coordinates:
    1. Event metadata display and status toggle.
    2. Google Form creation via `/api/google-form/route.ts`.
    3. Roster synchronization from Google Sheets.
    4. 1-click export of Attendance Sheets, Principal Permission Letters, and RSMS Notices via `documentExport.ts`.
    5. Outcome-based feedback configuration, Drive deployment, and auditorium QR code generation.
    6. Secret Easter Egg (click the lock icon in the top header, enter the secret passkey `"Bayern Munich"`) to reveal the coordinator appreciation certificate generator.
* **`src/app/events/[id]/certificates/page.tsx`**:
  * **Role**: Dedicated Dual PPTX/PDF Certificate Studio.
  * **Key Mechanism**: Ingests participant feedback responses. Provides interactive winner pickers (1st, 2nd, 3rd place). Accepts PowerPoint templates (`.pptx`) or image backgrounds (`.png`/`.jpg`). Executes client-side XML substitution and vector rendering via `certificateExport.ts` and exports a organized `.zip` archive containing both custom `.pptx` slides and high-resolution `.pdf` files.
* **`src/app/events/[id]/certificates/pdf/page.tsx`**:
  * **Role**: Pure Client-Side Vector PDF Certificate Studio.
  * **Key Mechanism**: Lightweight alternative focused exclusively on generating high-speed, vector-rendered participant and winner certificates in PDF format via `jsPDF`, with real-time in-browser preview and canvas rendering.
* **`src/app/members/page.tsx`**:
  * **Role**: Member Directory & Workload Tracker.
  * **Key Mechanism**: Visualizes all 23 student branch coordinators. Displays their domain (`Executive`, `Operations`, `Technical`, `Creative`, `Marketing`, `Documentation`), role, class/batch, coordinator type (`old_coordinator` vs `new_coordinator`), and real-time count of events coordinated.

#### 2. Backend Serverless API Routes (`src/app/api/`)
* **`src/app/api/google-form/route.ts`**:
  * **Role**: Server-side proxy and retry dispatcher for Google Apps Script Webhooks.
  * **Key Mechanism**: Protects client requests from CORS issues. Inspects `payload.action`: routes feedback actions to `NEXT_PUBLIC_CSI_FEEDBACK_WEBHOOK_URL` and registration actions to `NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL`. Implements an automatic 2-attempt retry loop with an `AbortController` (28-second timeout) to gracefully handle Google Apps Script cold starts.
* **`src/app/api/convert-pptx/route.ts`**:
  * **Role**: Server-side PowerPoint conversion utility (Windows environments).
  * **Key Mechanism**:
    * **Action `preview`**: On Windows machines with Microsoft PowerPoint installed, runs a temporary PowerShell script using PowerPoint COM (`PowerPoint.Application`) to export Slide 1 as a crisp 1920x1080 JPEG data URI. On non-Windows platforms (e.g., Linux/Vercel), immediately returns `{ fallbackToVector: true }` so the browser renders client-side vector previews.
    * **Action `batch_convert`**: Converts uploaded PPTX files into PDFs on Windows or cleanly signals `{ fallbackToClient: true }` for client-side jsPDF rendering.

#### 3. Reusable UI Components (`src/components/`)
* **`src/components/CreateEventModal.tsx`**:
  * **Role**: 2-Step Event Creation Wizard.
  * **Key Mechanism**:
    * **Step 1 (Event Details)**: Captures event title, date, start/end time, mode (`Offline`/`Online`), venue, eligible branches (AEI, CSE, CSBS, IT, AD, ME, CE, EEE, ECE), and required coordinators count.
    * **Step 2 (Coordinator Allocation)**: Displays member cards with badges indicating whether each member is a senior/old coordinator or new coordinator, along with their past workload count. Upon confirmation, calls `saveNewEvent()` in `eventsStorage.ts`, updating both LocalStorage and Supabase, and navigates directly to `/events/[newId]`.
* **`src/components/Navbar.tsx`**:
  * **Role**: Fixed sidebar navigation bar.
  * **Key Mechanism**: Provides quick navigation between Dashboard (`/`), Events (`/events`), and Members (`/members`). Contains the global Light/Dark mode toggle button wired to `useTheme()`.
* **`src/components/ThemeContext.tsx`**:
  * **Role**: React Context state manager for application-wide theming.
  * **Key Mechanism**: Maintains `theme` state (`"dark"` | `"light"`). On mount, reads `localStorage.getItem('csi_theme')`. When `toggleTheme()` is invoked, toggles the `.light` / `.dark` class on `document.documentElement` and persists the preference to `localStorage`.

#### 4. Logic, Storage & Data Layer (`src/lib/`)
* **`src/lib/types.ts`**:
  * **Role**: Central TypeScript definitions.
  * **Key Models**:
    * `CSIEvent`: Event model containing all metadata, coordinator assignments, Drive URLs, attendee arrays (`registered_attendees`, `feedback_attendees`), winners, and template configs.
    * `Member`: Member model with name, role, domain, class/batch, member type (`old_coordinator` | `new_coordinator`), and `events_coordinated_count`.
    * `RegisteredAttendee`: Student registration profile (name, roll no, class, email, gender).
    * `FeedbackAttendee`: Post-event feedback attendee profile (name, UID, branch, ratings, comments).
    * `FeedbackQuestion`: Question structure mapped to NBA/NAAC POs with Likert-scale options.
* **`src/lib/data.ts`**:
  * **Role**: Initial static seed database.
  * **Key Data**: Contains default arrays of the **13 historical events** and all **23 student coordinators**. Used as the instant local fallback if LocalStorage is empty and Supabase is not yet connected.
* **`src/lib/supabaseClient.ts`**:
  * **Role**: Supabase JavaScript client initialization.
  * **Key Mechanism**: Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the environment. Returns an active Supabase client instance or `null` if credentials are not configured.
* **`src/lib/eventsStorage.ts`**:
  * **Role**: The core synchronization engine.
  * **Key Functions**:
    * `getStoredEvents()`: Synchronously returns cached events from `localStorage` in 0ms. Triggers a background call to `syncEventsWithSupabase()` if more than 20 seconds have elapsed.
    * `syncEventsWithSupabase()`: Queries Supabase `events` table, merges cloud rows with local fields, updates `localStorage`, and fires `window.dispatchEvent(new CustomEvent("csi_events_updated"))`.
    * `saveNewEvent(event)`: Creates a new UUID, prepends the event to local storage, fires the update event, increments the assigned coordinators' counts in both LocalStorage and Supabase, and executes `supabase.from('events').insert(...)`.
    * `updateEvent(event)`: Persists changes (such as added Google Form links or attendee lists) to both LocalStorage and Supabase.
    * `deleteEvent(id)`: Removes the event, decrements the coordinator counts, and updates Supabase.
* **`src/lib/formScriptGenerator.ts`**:
  * **Role**: Code generator and CSV/TSV response mapper for Registration Forms.
  * **Key Functions**:
    * `generateEventGoogleAppsScript(event)`: Produces copy-paste ready Google Apps Script code customized with the event title and branch filters.
    * `mapGoogleFormResponsesToAttendance(headers, rows)`: Fuzzy-matches response column headers (detecting "Name", "Student Name", "Class & Batch", "Department", "Gender") and maps them into an array of `RegisteredAttendee` objects.
* **`src/lib/feedbackFormGenerator.ts`**:
  * **Role**: Outcome-Based Education (OBE) survey builder and response analyzer.
  * **Key Functions**:
    * `generateDefaultFeedbackQuestions(event)`: Generates dynamic survey questions mapped to **PO10** (Communication) and **PO11** (Project Management) tailored to the event type (Contest, Workshop, Talk, or Seminar).
    * `generateFeedbackGoogleAppsScript(event, questions)`: Builds the Google Apps Script that creates the Feedback Form with page breaks and Likert scale ratings.
    * `mapGoogleSheetToFeedbackAttendees(headers, rows)`: Extracts attendee identities and ratings from feedback responses.
    * `generateFeedbackAnalysisDocx(event, attendees, questions)`: Produces an official NBA/NAAC summary report document in `.docx` format with statistical averages per Program Outcome.
* **`src/lib/documentExport.ts`**:
  * **Role**: Institutional document generator (Word and PDF).
  * **Key Functions**:
    * `exportAttendancePDF()` / `exportAttendanceWord()`: Generates formal attendance sheets with RSET and CSI headers, metadata blocks, and student sign-in tables.
    * `exportPrincipalLetterPDF()` / `exportPrincipalLetterWord()`: Generates formal permission request letters addressed to the Principal.
    * `exportRSMSNoticePDF()` / `exportRSMSNoticeWord()`: Generates official college broadcast announcements.
* **`src/lib/certificateExport.ts`**:
  * **Role**: Certificate generation engine (over 1,600 lines of XML and vector rendering logic).
  * **Key Functions**:
    * `formatCertificateName(name)`: Cleans names (inserts spaces after dots, applies proper title casing, and removes stray punctuation).
    * `extractPptxData(file)`: Uses **JSZip** to parse uploaded `.pptx` presentations, locating slide XML and slide media backgrounds.
    * `replacePositionInSlideXml()` / `replaceWriteupInSlideXml()`: Injects recipient names and winner titles (1st, 2nd, 3rd Place) directly into PowerPoint XML (`ppt/slides/slide1.xml`).
    * `renderCertificatePage()`: Renders crisp vector certificates using **jsPDF**.
    * `exportCertificatesZip()`: Packages the generated PPTX and PDF files into a dual-folder ZIP file (`Winners_Appreciation_Certificates/` and `Participation_Certificates/`).
    * `exportCoordinatorCertificatesZip()`: Generates appreciation certificates for the student coordinators themselves.
* **`src/lib/logosBase64.ts`**:
  * **Role**: Inlined Base64 Data URIs of the RSET seal and CSI crest.
  * **Why it exists alongside `public/logos/`**: Static image files in `public/` are served over HTTP for `<img src="...">` tags in the browser. However, when compiling documents offline or generating PDFs in memory via `jsPDF` or Word XML, fetching local HTTP URLs can fail or cause CORS issues. Embedding the images directly as Base64 strings guarantees immediate, 100% offline generation without network requests.
* **`src/lib/coordinatorTemplateBase64.ts`**:
  * **Role**: Inlined Base64 Data URI of the coordinator certificate graphic template (`coordinator_cert_template.png`). Ensures the secret coordinator certificate generator works instantly without external asset fetching.

#### 5. Automation Scripts (`scripts/`)
* **`scripts/csi_master_webhook.js`**:
  * **Role**: The master Google Apps Script Web App deployed to the club's Google account.
  * **Supported Actions**:
    1. `create_form`: Creates an official Registration Form with standard questions and links it to a destination Google Sheet.
    2. `create_feedback_form`: Creates a two-section Feedback Survey (Attendee Profile + NBA PO Likert ratings) and links it to a destination Google Sheet.
    3. `get_responses` / `get_feedback_responses`: Reads all rows from the linked Google Sheet and returns them as structured JSON.
    4. `close_form`: Opens or closes form submissions via `form.setAcceptingResponses(boolean)`.
* **`scripts/google_apps_script_registration.js`**:
  * **Role**: A standalone script for coordinators who prefer to manually run the registration generator from the Google Apps Script editor.

#### 6. Supabase SQL Database Files (`supabase/`)
* **`supabase/01_schema.sql`**: Initial schema defining `members`, `events`, and the `event_coordinators` junction table with foreign keys and performance indexes.
* **`supabase/02_seed_members.sql`**: Seed data inserting all 23 active student branch members.
* **`supabase/03_seed_events.sql`**: Seed data inserting 13 foundational events with coordinator mappings.
* **`supabase/04_rls_policies.sql`**: Row Level Security definitions for authenticated access.
* **`supabase/05_auto_count_trigger.sql`**: PostgreSQL trigger function (`update_member_event_count`) that automatically recalculates a member's `events_coordinated_count` whenever an assignment row is added or deleted.
* **`supabase/06_useful_views.sql`**: Database reporting views (`v_events_with_coordinators`, `v_member_workload`, `v_domain_stats`).
* **`supabase/07_migration_sync.sql`**: **Master Migration Script**. Adds rich columns (time windows, URLs, JSONB attendee arrays, winner objects) to the `events` table and unlocks RLS so the web application can perform live synchronization.
* **`supabase/README.md`**: Step-by-step setup documentation for configuring the Supabase project.

#### 7. Project Root Files
* **`run.bat`**: Windows batch script to launch the local development server at `http://localhost:3000` with one click.
* **`package.json`**: Lists third-party dependencies (`next`, `react`, `@supabase/supabase-js`, `jspdf`, `jszip`, `lucide-react`, `qrcode`, `tailwindcss`).
* **`next.config.mjs`**: Next.js configuration enabling React strict mode and ignoring non-critical build warnings.
* **`tailwind.config.ts`**: Configures custom colors (`csi-purple`, `csi-surface`, `csi-border`, `csi-card`).
* **`tsconfig.json`**: TypeScript compiler configuration with absolute path mapping (`@/*` pointing to `./src/*`).
* **`.gitignore`**: Excludes `node_modules/`, `.next/`, `build/`, `.env.local`, and cache files from Git.

---

## 4. End-to-End Sequential Dataflow

Here is what happens step-by-step from the moment a user opens the website to certificate export and database storage:

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
[Google Apps Script Master Webhook (scripts/csi_master_webhook.js)]
       │
       ├──► FormApp.create() creates Registration Form in CSI Google Drive
       │    └── Applies official CSI settings (No email limit, clean branding)
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

## 5. File-to-File Data Flow & Pipeline Matrix

This matrix traces how data passes across file boundaries during the 6 core operational pipelines:

### Pipeline 1: Boot, Theme Hydration & Optimistic Data Synchronization
* **Participating Files**:
  * `src/app/layout.tsx`
  * `src/components/ThemeContext.tsx`
  * `src/app/globals.css`
  * `src/lib/eventsStorage.ts`
  * `src/lib/supabaseClient.ts`
  * `src/lib/data.ts`
  * `src/app/page.tsx`
* **Flow Details**:
  1. `layout.tsx` runs an inline `<script>` before React hydration, reading `csi_theme` from `localStorage` and setting `.light` or `.dark` on `document.documentElement`.
  2. `page.tsx` mounts and calls `getStoredEvents()` and `getStoredMembers()` from `eventsStorage.ts`.
  3. `eventsStorage.ts` reads `csi_operations_events` from `localStorage`. If empty, it seeds it using `initialEvents` from `data.ts`. Data is returned to the page in **0ms**.
  4. In the background, `eventsStorage.ts` checks if `supabaseClient.ts` is configured. If more than 20 seconds have elapsed, it executes `supabase.from('events').select('*')`.
  5. When Supabase returns live records, `eventsStorage.ts` updates `localStorage` and dispatches the window event:
     ```typescript
     window.dispatchEvent(new CustomEvent("csi_events_updated", { detail: mergedEvents }));
     ```
  6. `page.tsx` receives the event via its `useEffect` listener and updates state smoothly without a page reload.

### Pipeline 2: Event Creation & Workload Allocation
* **Participating Files**:
  * `src/components/CreateEventModal.tsx`
  * `src/lib/eventsStorage.ts`
  * `src/lib/types.ts`
  * `src/lib/supabaseClient.ts`
  * `src/app/events/[id]/page.tsx`
* **Flow Details**:
  1. User triggers the modal from `Navbar.tsx` or `/events`.
  2. `CreateEventModal.tsx` fetches members using `getStoredMembers()` to display workload badges (`old_coordinator` vs `new_coordinator`, past events count).
  3. Upon form submission, the modal builds an `Omit<CSIEvent, "id">` object and calls `saveNewEvent(payload)` in `eventsStorage.ts`.
  4. `eventsStorage.ts` generates a UUID, updates the local events cache, increments `events_coordinated_count` for assigned coordinators, dispatches `csi_events_updated` and `csi_members_updated`, and asynchronously writes to Supabase:
     ```typescript
     supabase.from("events").insert({ ... });
     supabase.from("members").update({ events_coordinated_count }).eq("name", coordName);
     ```
  5. The modal receives the new ID and calls `router.push('/events/' + newEventId)`.

### Pipeline 3: Google Drive Automation & Form Deployment
* **Participating Files**:
  * `src/app/events/[id]/page.tsx`
  * `src/app/api/google-form/route.ts`
  * `scripts/csi_master_webhook.js`
  * `src/lib/eventsStorage.ts`
* **Flow Details**:
  1. On the event page, the user clicks **"Create Form in Drive"**.
  2. `page.tsx` sends a POST request to `/api/google-form` with:
     ```json
     { "action": "create_form", "eventName": "...", "targetDepartments": ["AI&DS", "CSBS", "CSE", "IT"] }
     ```
  3. `/api/google-form/route.ts` reads `NEXT_PUBLIC_CSI_GOOGLE_WEBHOOK_URL` and posts the JSON to the Google Apps Script Web App with a 28s timeout.
  4. `csi_master_webhook.js` runs in Google Cloud:
     * Calls `FormApp.create()`, disables email harvesting, sets single response limits, and adds the 9 standard institutional questions.
     * Calls `SpreadsheetApp.create()` to generate the destination responses spreadsheet.
     * Links form submissions to the spreadsheet via `form.setDestination()`.
     * Returns `{ formUrl, editUrl, sheetUrl, sheetId }`.
  5. `/api/google-form/route.ts` forwards this response back to `page.tsx`.
  6. `page.tsx` updates the event's `google_form_url` and `google_sheet_url` via `updateEvent()`, persisting them to Supabase and revealing the live form and sheet buttons in the UI.

### Pipeline 4: Registration Sync to Attendance & Document Export
* **Participating Files**:
  * `src/app/events/[id]/page.tsx`
  * `src/app/api/google-form/route.ts`
  * `scripts/csi_master_webhook.js`
  * `src/lib/formScriptGenerator.ts`
  * `src/lib/documentExport.ts`
  * `src/lib/logosBase64.ts`
* **Flow Details**:
  1. The user clicks **"Sync Final Roster to Attendance"**.
  2. `page.tsx` calls `/api/google-form` with `{ action: "get_responses", sheetId: event.google_sheet_id }`.
  3. `csi_master_webhook.js` opens the spreadsheet, reads `values = sheet.getDataRange().getValues()`, and returns `{ headers, rows }`.
  4. `page.tsx` passes these arrays to `mapGoogleFormResponsesToAttendance()` in `formScriptGenerator.ts`.
  5. The mapper fuzzy-matches columns for Name, Department, and Division, producing a clean `RegisteredAttendee[]` array.
  6. `updateEvent()` stores this array in `event.registered_attendees`.
  7. When the user clicks **"Download Attendance Sheet"**, `documentExport.ts` is invoked:
     * For Word export, `exportAttendanceWord()` embeds `RSET_LOGO_BASE64` and `CSI_LOGO_BASE64` from `logosBase64.ts` into a Word XML document and downloads a `.doc` file.
     * For PDF export, `exportAttendancePDF()` renders the attendance roster using `jsPDF`.

### Pipeline 5: Outcome-Based Feedback & Auditorium QR Code
* **Participating Files**:
  * `src/app/events/[id]/page.tsx`
  * `src/lib/feedbackFormGenerator.ts`
  * `src/app/api/google-form/route.ts`
  * `scripts/csi_master_webhook.js`
  * Third-party library `qrcode`
* **Flow Details**:
  1. Before an event concludes, `feedbackFormGenerator.ts` generates survey questions mapped to **PO10** (Communication) and **PO11** (Project Management).
  2. Clicking **"Create Feedback Form in Drive"** sends `{ action: "create_feedback_form", questions, ... }` through `/api/google-form`.
  3. `csi_master_webhook.js` creates a 2-page Google Form (Section 1: Attendee Profile; Section 2: Likert-scale questions) and a linked responses spreadsheet, returning the form's public URL.
  4. `page.tsx` takes `feedback_google_form_url` and uses `QRCode.toCanvas()` to render an auditorium-ready QR code that coordinators can project on screen.
  5. After participants submit feedback, clicking **"Sync Feedback Responses"** fetches the data and maps it into `event.feedback_attendees`.
  6. The user can also generate an NBA/NAAC CO/PO summary report in `.docx` format via `generateFeedbackAnalysisDocx()`.

### Pipeline 6: Certificate Studio (Winner Selection & ZIP Export)
* **Participating Files**:
  * `src/app/events/[id]/certificates/page.tsx`
  * `src/app/events/[id]/certificates/pdf/page.tsx`
  * `src/lib/certificateExport.ts`
  * `src/app/api/convert-pptx/route.ts`
  * `src/lib/eventsStorage.ts`
* **Flow Details**:
  1. `certificates/page.tsx` loads the event and its verified `feedback_attendees`.
  2. Coordinators select 1st, 2nd, and 3rd place winners using multi-select dropdowns. Winner IDs are saved to `event.winners` via `updateEvent()`.
  3. Coordinators upload their presentation template (`.pptx`) or certificate image.
  4. `certificateExport.ts` parses the file:
     * For `.pptx`, **JSZip** extracts the slide background image from `ppt/media/` for real-time preview.
     * For image templates, a data URL is created.
  5. The user clicks **"Download Certificates (.ZIP)"**:
     * `certificateExport.ts` loops through all attendees.
     * Names are formatted via `formatCertificateName()`.
     * `getWinnerPosition()` checks if an attendee is a winner.
     * For the PPTX bundle, `replacePositionInSlideXml()` and `replaceWriteupInSlideXml()` inject names and awards into `ppt/slides/slide1.xml`.
     * For the PDF bundle, `renderCertificatePage()` draws the template background and adds centered typography using `jsPDF`.
     * **JSZip** packages everything into two subfolders:
       - `Winners_Appreciation_Certificates/`
       - `Participation_Certificates/`
     * The final `.zip` file is downloaded directly in the browser.

---

## 6. Supabase Database Schema & Sync Engine

The cloud database uses two primary tables (`events` and `members`) along with optional junction tables and views:

### `events` Table
| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | — | Unique identifier (`crypto.randomUUID()` or `'e' + timestamp`) |
| `event_name` | `TEXT NOT NULL` | — | Official title of the event |
| `event_date` | `TEXT NOT NULL` | — | ISO date string (`'YYYY-MM-DD'`) |
| `time_start` | `TEXT` | `'01:30 PM'` | Event start time |
| `time_end` | `TEXT` | `'04:30 PM'` | Event end time |
| `mode` | `TEXT NOT NULL` | `'Offline'` | Event delivery mode (`'Offline'` or `'Online'`) |
| `venue` | `TEXT NOT NULL` | `'Auditorium'` | Hall, lab room, or online link |
| `target_branches` | `TEXT[]` | `'{}'` | Array of eligible branches (`AEI`, `CSE`, `CSBS`, `IT`, `AD`, etc.) |
| `faculty_in_charge` | `TEXT NOT NULL` | `'Dr. Tripti C'` | Faculty mentor in charge of the event |
| `brief_description` | `TEXT` | `''` | Event summary and objectives |
| `status` | `TEXT NOT NULL` | `'confirmed'` | `'planned'`, `'confirmed'`, or `'completed'` |
| `required_coordinators`| `INTEGER` | `2` | Number of coordinators needed |
| `assigned_coordinators`| `TEXT[]` | `'{}'` | Array of student coordinator names |
| `google_form_url` | `TEXT` | `NULL` | Public Google Form link for registrations |
| `google_form_edit_url` | `TEXT` | `NULL` | Private Drive link to edit the registration form |
| `google_form_id` | `TEXT` | `NULL` | Google Form ID |
| `google_sheet_url` | `TEXT` | `NULL` | Destination Google Sheet link for registrations |
| `google_sheet_id` | `TEXT` | `NULL` | Google Sheet ID |
| `is_registration_closed`| `BOOLEAN` | `false` | Whether registrations are locked |
| `registered_attendees` | `JSONB` | `'[]'` | Array of registered student objects |
| `feedback_google_form_url` | `TEXT` | `NULL` | Public Google Form link for feedback |
| `feedback_google_sheet_url`| `TEXT` | `NULL` | Destination Google Sheet link for feedback |
| `is_feedback_closed` | `BOOLEAN` | `false` | Whether feedback submissions are locked |
| `feedback_attendees` | `JSONB` | `'[]'` | Array of attendees who completed feedback |
| `winners` | `JSONB` | `'{}'` | Winners object (`{ first_place, second_place, third_place }`) |
| `certificate_templates` | `JSONB` | `'{}'` | Template preferences and image references |

### `members` Table
| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID / TEXT PRIMARY KEY` | — | Unique member identifier |
| `name` | `TEXT NOT NULL` | — | Full student name |
| `role` | `TEXT NOT NULL` | — | Designation (e.g. `President`, `Operations Lead`) |
| `domain` | `TEXT NOT NULL` | — | Functional team (`Executive`, `Operations`, `Technical`, etc.) |
| `class_batch` | `TEXT NOT NULL` | — | Class and semester (e.g. `S7 CS A`, `S5 CSBS`) |
| `member_type` | `TEXT NOT NULL` | — | Classification (`'old_coordinator'` or `'new_coordinator'`) |
| `is_active` | `BOOLEAN` | `true` | Active membership term status |
| `events_coordinated_count` | `INTEGER` | `0` | Auto-calculated count of events coordinated |

### Auto-Count Trigger (`supabase/05_auto_count_trigger.sql`)
```sql
CREATE OR REPLACE FUNCTION update_member_event_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE members 
    SET events_coordinated_count = events_coordinated_count + 1
    WHERE id = NEW.member_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE members 
    SET events_coordinated_count = GREATEST(0, events_coordinated_count - 1)
    WHERE id = OLD.member_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Cross-File Dependency Matrix

| File | Depends On (Imports) | Consumed By (Imported By) |
| :--- | :--- | :--- |
| `src/lib/types.ts` | None (pure definitions) | Almost all files in `src/` |
| `src/lib/data.ts` | `types.ts` | `eventsStorage.ts`, `page.tsx`, `members/page.tsx` |
| `src/lib/supabaseClient.ts` | `@supabase/supabase-js` | `eventsStorage.ts`, `events/[id]/page.tsx` |
| `src/lib/logosBase64.ts` | None (pure data strings) | `documentExport.ts`, `certificateExport.ts` |
| `src/lib/coordinatorTemplateBase64.ts` | None (pure data string) | `certificateExport.ts` |
| `src/lib/eventsStorage.ts` | `types.ts`, `data.ts`, `supabaseClient.ts` | All pages, modals, and certificate studios |
| `src/lib/formScriptGenerator.ts` | `types.ts` | `events/[id]/page.tsx`, `feedbackFormGenerator.ts` |
| `src/lib/feedbackFormGenerator.ts` | `types.ts`, `formScriptGenerator.ts`, `jszip` | `events/[id]/page.tsx`, `certificates/page.tsx` |
| `src/lib/documentExport.ts` | `jspdf`, `logosBase64.ts` | `events/[id]/page.tsx`, `certificateExport.ts` |
| `src/lib/certificateExport.ts` | `jspdf`, `jszip`, `logosBase64.ts`, `coordinatorTemplateBase64.ts`, `types.ts`, `documentExport.ts` | `certificates/page.tsx`, `certificates/pdf/page.tsx` |
| `src/components/ThemeContext.tsx` | React | `layout.tsx`, `Navbar.tsx` |
| `src/components/Navbar.tsx` | `lucide-react`, `ThemeContext.tsx` | `layout.tsx` |
| `src/components/CreateEventModal.tsx` | `types.ts`, `eventsStorage.ts`, `lucide-react` | `events/page.tsx`, `events/[id]/page.tsx` |
| `src/app/api/google-form/route.ts` | `next/server` | `events/[id]/page.tsx` (via HTTP fetch) |
| `src/app/api/convert-pptx/route.ts` | `next/server`, `child_process`, `fs`, `jszip` | `certificates/page.tsx` (via HTTP fetch) |
| `scripts/csi_master_webhook.js` | Google Apps Script services (`FormApp`, `SpreadsheetApp`) | `/api/google-form/route.ts` (via HTTP webhook) |

---

## 8. Operational FAQ & Troubleshooting

### Q1: What happens if Supabase is offline or environment variables are missing?
**Answer:** The app uses an **Optimistic Cache-First Strategy**. If `NEXT_PUBLIC_SUPABASE_URL` is empty, `supabaseClient.ts` returns `null`. `eventsStorage.ts` automatically falls back to `localStorage`. If `localStorage` is also empty, it seeds data from `src/lib/data.ts`. The UI remains fully interactive with zero downtime.

### Q2: Why are there two certificate pages (`certificates/page.tsx` and `certificates/pdf/page.tsx`)?
* **`certificates/page.tsx`**: The dual PPTX/PDF studio. It can parse PowerPoint templates, perform XML text substitution, and export both editable `.pptx` presentations and `.pdf` files inside a combined `.zip` file.
* **`certificates/pdf/page.tsx`**: A dedicated vector PDF studio. It bypasses PPTX XML manipulation and uses `jsPDF` for lightweight, vector PDF generation with real-time canvas previews.

### Q3: Why are images stored in both `public/logos/` and `src/lib/logosBase64.ts`?
* **`public/logos/`**: Standard image files served over HTTP at `/logos/...`, used for web browser `<img>` tags.
* **`src/lib/logosBase64.ts`**: Contains identical images encoded as Base64 data URIs. This allows `jsPDF` and Word HTML exporters to embed images directly in memory without making external network requests, preventing CORS failures and enabling offline exports.

### Q4: How does the Secret Coordinator Certificate Easter Egg work?
On any event page (`/events/[id]`), click the subtle lock icon in the top header. When prompted, enter the secret passkey:
```
Bayern Munich
```
This unlocks a hidden panel that uses `COORDINATOR_TEMPLATE_BASE64` and `certificateExport.ts` to generate official coordinator appreciation certificates for all students assigned to lead the event.
