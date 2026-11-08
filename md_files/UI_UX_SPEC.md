# UI / UX Specification

## Brand Identity & Aesthetic
The UI must feel clean, modern, administrative, and trustworthy, reflecting the professional standards of the Computer Society of India (CSI).

## Color Palette
```
Primary Brand (CSI Blue):   #1E3A8A (Tailwind: blue-900)
Primary Accent:             #2563EB (Tailwind: blue-600)
Secondary Accent:           #38BDF8 (Tailwind: sky-400)
Background Canvas:          #F8FAFC (Tailwind: slate-50)
Surface / Card Background:  #FFFFFF (Tailwind: white)
Dark Surface (Sidebar/Nav): #0F172A (Tailwind: slate-900)
Border / Divider:           #E2E8F0 (Tailwind: slate-200)

Status & Feedback Colors:
- Success / Free Status:    #16A34A (Tailwind: green-600) / #DCFCE7 (green-100)
- Busy / Active Status:     #D97706 (Tailwind: amber-600) / #FEF3C7 (amber-100)
- Error / Destructive:      #DC2626 (Tailwind: red-600)
```

## Typography
- **Primary Font**: Inter / Geist Sans (Clean, legible system sans-serif)
- **Headings**: Semi-bold to Bold (`font-semibold` / `font-bold`), dark slate (`text-slate-900`)
- **Body & Labels**: Medium weight (`text-slate-700` and `text-slate-500` for helper captions)

## Layout Structure
1. **Top Navbar / Header**:
   - CSI Chapter Logo & Title ("CSI Operations").
   - Navigation links: `Dashboard`, `Events Archive`, `Member Database`.
   - Discrete, invisible hotspot for the Admin Easter Egg (e.g., specific corner or brand logo click pattern).
2. **Main Dashboard View**:
   - Prominent **`+ Create Event`** primary CTA button.
   - Quick statistics (Active Events, Total Members, Hosted Count).
3. **Event Container (Drawer or Dedicated Page)**:
   - Tabbed or sectioned card view displaying all 6 generation modules side-by-side or stacked cleanly.
   - Live document preview panels with "Copy Text" and "Export PDF/DOCX" action triggers.

## Component Patterns
- **Cards**: Soft borders (`border border-slate-200`), rounded corners (`rounded-xl`), subtle shadows (`shadow-sm hover:shadow-md transition`).
- **Modals**: Center-staged, dim backdrop (`bg-slate-900/50 backdrop-blur-sm`).
- **Inputs & Dropdowns**: Focus rings with `ring-2 ring-blue-500`, high contrast, clear placeholder text.

