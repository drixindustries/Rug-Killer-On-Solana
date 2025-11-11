# Solana Rug Detector - Design Guidelines

## Design Approach
**System:** Modern dashboard design inspired by Linear's clarity and Dexscreener's data density, optimized for technical information display and rapid risk assessment.

**Core Principle:** Information hierarchy that guides users from token input → instant risk score → detailed metrics → supporting data.

---

## Typography System

**Font Stack:**
- Primary: 'Inter' (Google Fonts) - all UI elements
- Monospace: 'JetBrains Mono' - token addresses, wallet IDs, numerical data

**Hierarchy:**
- Hero/Page Title: text-4xl font-bold
- Section Headers: text-2xl font-semibold
- Risk Score Display: text-6xl font-bold (oversized for immediate visibility)
- Metric Labels: text-sm font-medium uppercase tracking-wide
- Metric Values: text-xl font-semibold
- Body/Description: text-base
- Wallet Addresses: text-sm font-mono
- Timestamps/Meta: text-xs

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, m-4, gap-6, space-y-8, etc.)

**Grid Structure:**
- Container: max-w-7xl mx-auto px-6
- Dashboard: Two-column layout on desktop (lg:grid-cols-3)
  - Left column (2/3): Risk score card + detailed metrics
  - Right column (1/3): Quick stats sidebar
- Mobile: Single column stack

**Section Spacing:** py-8 between major sections, py-4 for card interiors

---

## Component Library

### 1. Token Input Section
- Full-width search bar with subtle border
- Search icon (Heroicons) left-aligned
- "Analyze Token" button right-aligned within input
- Recent searches chips below (dismissible, rounded-full)
- Example token address placeholder text
- Validation error state messaging

### 2. Risk Score Display (Hero Card)
- Oversized centered score (0-100 scale)
- Ring/circular progress indicator around score
- Risk level text below score ("EXTREME RISK" | "HIGH RISK" | "MODERATE" | "LOW RISK")
- Quick summary: "X/10 red flags detected"
- Timestamp of analysis

### 3. Critical Alerts Section
- Stacked alert cards for immediate red flags
- Icon (Heroicons: exclamation-triangle, shield-exclamation) + alert text
- Mint Authority status | Freeze Authority status | LP Status
- Each alert: icon + bold title + explanation text
- Compact spacing (space-y-2)

### 4. Metrics Grid
**3-column responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3):**
- Total Supply card
- Top Holder Concentration card
- Liquidity Pool Status card
- Creation Date card
- Transaction Volume card
- Holder Count card

Each card: Icon + Label + Large Value + Secondary info text

### 5. Top Holders Analysis
- Table layout with columns: Rank | Address (truncated) | Balance | % of Supply
- First 10 rows visible, "Show more" expansion
- Copy button (Heroicons: clipboard) next to addresses
- Sticky header on scroll
- Zebra striping for readability

### 6. Holder Distribution Chart
- Horizontal bar chart showing top 10 wallets
- Y-axis: Wallet addresses (truncated to first/last 4 chars)
- X-axis: Percentage of total supply
- Chart.js implementation
- Legend showing "Top 10 holders control X% of supply"

### 7. Transaction Timeline
- Vertical timeline (left border accent)
- Each entry: timestamp + transaction type + wallet address snippet
- Highlight bundled/suspicious transactions
- "Load more" at bottom
- Icons for tx types: swap, transfer, mint

### 8. Token Metadata Card
- Compact info display: Name | Symbol | Decimals
- Token logo placeholder (circular, border)
- Metadata mutability status indicator
- Social links if available (Heroicons: globe, document-text)

### 9. Navigation Header
- Logo/Brand left
- "New Analysis" button right
- Minimal, fixed top position
- Subtle bottom border separator

### 10. Footer
- Links: Documentation | API | Report Issue
- Disclaimer text about risk assessment accuracy
- Version number

---

## Icon System
**Library:** Heroicons (via CDN)
**Usage:**
- Alert states: exclamation-triangle, shield-check, shield-exclamation
- Actions: magnifying-glass, clipboard, arrow-path
- Data: chart-bar, wallet, banknote
- Navigation: home, document-text, cog

---

## Animations
**Minimal Approach:**
- Score counter animation on load (count-up effect)
- Skeleton loaders during analysis
- Smooth chart rendering
- No page transitions, hover effects, or decorative animations

---

## Images
**No hero image** - This is a utility dashboard. Header goes straight to token input functionality.

---

## Accessibility
- All form inputs with labels
- ARIA labels for icon-only buttons
- Keyboard navigation for table and timeline
- Focus visible states on all interactive elements
- Screen reader announcements for risk level changes