# Solana Rug Killer - Design Guidelines

## Design Approach
**System:** Dark cyberpunk dashboard inspired by Linear's clarity + Dexscreener's density + crypto terminal aesthetics. Professional security-focused interface with warm, high-tech visual treatment.

**Core Principle:** Instant risk assessment through bold typography, glowing accents, and high-contrast data hierarchy in a sophisticated dark environment.

---

## Color Palette

**Backgrounds:**
- Primary: `#0A0A0A` (near-black base)
- Card Surface: `#121212` with subtle warm gradient overlay
- Elevated Surface: `#1A1A1A`
- Input Fields: `#0F0F0F` with `#1F1F1F` focus state

**Accents (Warm Cyberpunk):**
- Primary Orange: `#FF6B2C` (CTAs, highlights)
- Amber Warning: `#FFA500` (moderate alerts)
- Deep Red: `#DC2626` (critical alerts, extreme risk)
- Safe Green: `#10B981` (low risk indicators)
- Cyan Info: `#06B6D4` (metadata, secondary info)

**Text:**
- Primary: `#FFFFFF` (headings, values)
- Secondary: `#A0A0A0` (labels, descriptions)
- Tertiary: `#666666` (timestamps, meta)
- Monospace: `#FFB366` (addresses, numbers - warm tint)

**Borders & Dividers:**
- Subtle: `#1F1F1F`
- Emphasized: `#2A2A2A`
- Glow Borders: `#FF6B2C` with 50% opacity

---

## Typography System

**Font Stack:**
- Primary: 'Inter' - UI elements
- Monospace: 'JetBrains Mono' - addresses, data

**Hierarchy:**
- Risk Score: text-7xl font-black (with warm glow effect)
- Page Titles: text-4xl font-bold
- Section Headers: text-2xl font-semibold text-white
- Metric Values: text-2xl font-bold text-white
- Metric Labels: text-xs font-medium uppercase tracking-widest text-gray-400
- Addresses: text-sm font-mono text-amber-200
- Body: text-sm text-gray-300

---

## Layout System

**Spacing:** Tailwind units 2, 4, 6, 8, 12, 16

**Structure:**
- Container: max-w-7xl mx-auto px-6
- Dashboard Grid: lg:grid-cols-3 gap-6
  - Main (col-span-2): Risk display + metrics
  - Sidebar (col-span-1): Quick stats + timeline
- Card Padding: p-6
- Section Spacing: space-y-8

---

## Component Library

### 1. Navigation Header
Fixed top, backdrop blur, dark background with subtle bottom border glow (`border-b border-orange-500/20`). Logo left, "New Analysis" button (orange gradient background) right.

### 2. Token Input Section
Full-width search with glowing orange border on focus. Dark background, search icon left, analyze button integrated right. Warm shadow on active state. Recent searches as dismissible chips with orange/10 background.

### 3. Risk Score Hero Card
Centered oversized score (0-100) with animated circular progress ring in gradient (red→amber→green based on risk). Card has subtle warm radial gradient background. Risk level text in uppercase with corresponding color. Glow effect around high-risk scores. Quick summary below in muted text.

### 4. Critical Alerts Stack
Each alert: dark card with colored left border accent (4px), warning icon, bold title, explanation text. Spacing: space-y-3. Icons from Heroicons with color matching alert severity.

### 5. Metrics Grid
3-column responsive grid. Each card: dark background, subtle border, warm gradient on hover. Icon (colored), uppercase label, large value in white, secondary info in gray-400. Icons use accent colors (orange, amber, cyan).

### 6. Top Holders Table
Dark background with zebra striping using white/5 opacity. Sticky header. Monospace addresses in amber-200. Copy icons on hover. Percentage bars inline with warm gradient fills.

### 7. Holder Distribution Chart
Horizontal bar chart with warm gradient bars (orange→amber). Dark background, grid lines in white/10. Y-axis shows truncated addresses in monospace. Legend with accent color.

### 8. Transaction Timeline
Vertical timeline with orange accent line on left. Each entry: timestamp (gray-500), transaction type icon (colored), address snippet (monospace amber). Suspicious transactions highlighted with red border-l-4.

### 9. Token Metadata Card
Compact dark card. Circular token logo with orange border. Name/symbol in white, metadata in grid layout. Status badges with colored backgrounds (green/red/amber).

### 10. Footer
Dark with subtle warm gradient. Links in gray-400 hover:text-orange-400. Disclaimer text in gray-600. Version number right-aligned.

---

## Visual Effects

**Glows:** Apply to high-risk elements, active states, and score displays using `shadow-[0_0_20px_rgba(255,107,44,0.3)]`

**Gradients:** Card backgrounds use subtle radial gradients from `#121212` to `#0F0F0F`. Buttons use orange→amber linear gradients.

**Borders:** 1px solid with low opacity, glowing accent borders on focus/hover.

---

## Icon System
**Library:** Heroicons
**Colors:** Match component context (orange for actions, red for warnings, cyan for info, green for safe)

---

## Images
No hero image. Header flows directly into search functionality - this is a data utility dashboard prioritizing immediate access to analysis tools.

---

## Animations
Minimal: Score counter on load, skeleton loaders (dark with warm shimmer), smooth chart rendering. No decorative animations.

---

## Accessibility
High contrast ratios maintained despite dark theme (WCAG AA). Focus states use orange rings. ARIA labels on icons. Keyboard navigation throughout. Color not sole indicator (icons + text for alerts).