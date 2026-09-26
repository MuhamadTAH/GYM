# GYM Design System & Interface Architecture

## 1. Design Philosophy: "Say More With Less"
- **High Data-to-Ink Ratio**: Remove visual noise, duplicate banners, nested cards, gratuitous rainbow gradients, and redundant explanation text.
- **Single Responsibility per Page**: Each view only contains the controls, data, and actions critical to its purpose.
- **Gym-Grade Clarity**: High contrast, legible typography, instant feedback, thumb-friendly tap targets.

---

## 2. Core Foundations & Tokens

### Palette
| Token | Class | Hex / Role |
|---|---|---|
| Background Canvas | `bg-black` | `#000000` — Pure dark baseline |
| Surface / Cards | `bg-zinc-950` / `bg-zinc-900/70` | `#09090b` / `#18181b` — Crisp neutral elevation |
| Subtle Borders | `border-zinc-800` | `#27272a` — Restrained definition without heavy lines |
| Primary Accent | `amber-400` / `amber-500` | `#fbbf24` — Athletic fuel, active selection, energy |
| Secondary Accent | `emerald-400` / `emerald-500` | `#34d399` — Training sets, completion, protein |
| Semantic Danger | `rose-400` / `rose-500` | `#f87171` — Calorie surplus, pain warning, deletion |
| Text Primary | `text-zinc-100` | `#f4f4f5` — Maximum readability |
| Text Secondary | `text-zinc-400` | `#a1a1aa` — Concise labels and metadata |
| Text Dim | `text-zinc-500` | `#71717a` — Units and timestamps |

### Typography
- **Headings & Body**: Sans-serif (`font-sans` Geist) for fast reading and clean layouts.
- **Metrics & Numbers**: Monospace (`font-mono` Geist Mono) for weights, calories, sets, and dates.
- **Hierarchy**:
  - Page Title: `text-xl sm:text-2xl font-bold tracking-tight text-white`
  - Section Header: `text-xs font-semibold uppercase tracking-wider text-zinc-400`
  - Hero Stat: `text-3xl sm:text-4xl font-black font-mono tracking-tight text-white`
  - Body Text: `text-sm text-zinc-300`
  - Metadata / Microcopy: `text-xs text-zinc-500 font-mono`

### Spacing & Layout Rhythm
- Base scale: `4px` (1), `8px` (2), `12px` (3), `16px` (4), `24px` (6).
- Card Padding: `p-4 sm:p-5` for content density without crowding.
- Radii: `rounded-xl` for buttons and inputs, `rounded-2xl` for primary cards.

---

## 3. Page Boundaries (Zero Overlap)

| Page | Tab Key | Single Purpose | Excluded (belongs elsewhere) |
|---|---|---|---|
| **Fuel (Nutrition)** | `cal` | Daily calorie budget, food entry, AI food review, today's meals list, 14-day history. | Workouts, water/step logs, periodization. |
| **Train (Workout)** | `workout` | Active session checklist, set logging (weight/reps/RPE/pain), exercise guides, rest timer. | Nutrition logging, food databases. |
| **Targets (Goals)** | `goals` | Daily calorie & macro target setting, hydration & step habits, 7-day split schedule. | Food entry inputs, camera meal scanner. |
| **Program (Plan)** | `command_center` | Periodization mesocycle generator, weekly phase overview, macro blueprint. | Active set logger, food items. |
| **Coach (AI)** | `coach` | Conversational coaching, safety & autoregulation directives, Q&A. | Redundant multi-page widget banners. |

---

## 4. Copy Guidelines: "Say the Same Thing Using Less"
- ❌ *"1,900 kcal is optimal for steady fat loss deficit while preserving lean muscle in your current phase."*
- ✅ *"Target: 1,900 kcal (Deficit)"*
- ❌ *"Advance to new day (archives today's calories to progress history and resets today's tracking to 0)"*
- ✅ *"Start New Day (Archives & resets today)"*
- ❌ *"⚡ Changing this food's calories will immediately recalculate and update your total daily calories."*
- ✅ *"Updates food & today's total."*
