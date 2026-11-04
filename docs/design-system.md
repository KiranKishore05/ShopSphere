# ShopSphere — Editorial Fashion Design System

**Brand Identity:** ShopSphere Haute & Prêt-à-Porter  
**Aesthetic Vision:** Minimalist, editorial, architectural, warm ivory, tactile luxury.  
**Inspiration:** High-fashion publication layouts, sculptural tailoring, boutique salon spaces.

---

## 1. Color Palette & Design Tokens

The palette avoids generic RGB primaries, drawing inspiration from raw linen, warm gallery walls, rich charcoal inks, sun-warmed sands, and muted botanical sages.

### 1.1 Color Palette Specifications

| Token Name | Hex Code | HSL Value | Semantic Role | Usage Guideline |
| :--- | :--- | :--- | :--- | :--- |
| `--color-bg-ivory` | `#FDFBF7` | `40°, 43%, 98%` | Primary Canvas Background | Main body background, warm editorial canvas. |
| `--color-surface-white` | `#FFFFFF` | `0°, 0%, 100%` | Card & Elevated Surface | Product cards, popovers, dropdowns, modal windows. |
| `--color-surface-cream` | `#F7F4EC` | `43°, 36%, 95%` | Subtle Neutral Fill | Table headers, chip pills, image frame backdrops. |
| `--color-border-subtle` | `#EAE5DA` | `39°, 27%, 89%` | Primary Border & Divider | Ultra-crisp thin border rules, card outlines. |
| `--color-text-ink` | `#161513` | `30°, 8%, 8%` | Primary Editorial Text | Headings, display typography, high-contrast labels. |
| `--color-text-charcoal` | `#4B4843` | `38°, 6%, 28%` | Secondary Body Text | Paragraphs, product descriptions, secondary links. |
| `--color-text-muted` | `#827E77` | `38°, 5%, 49%` | Tertiary / Auxiliary | Captions, timestamps, disabled indicators, micro-copy. |
| `--color-accent-sand` | `#C8B293` | `34°, 34%, 68%` | Warm Sand Accent | Focus rings, promotional tags, subtle highlights. |
| `--color-accent-sand-dark` | `#9E8462` | `34°, 24%, 50%` | Deep Sand Active | Button hover transitions, active filter highlights. |
| `--color-accent-sage` | `#788A75` | `111°, 9%, 50%` | Botanic Sage Accent | Badges (e.g., "Sustainable", "In Stock", "Verified"). |
| `--color-accent-sage-dark` | `#4F604D` | `114°, 11%, 34%`| Deep Sage | Dark accent badge text, forest accents. |
| `--color-status-error` | `#BA4343` | `0°, 47%, 49%` | Danger / Form Error | Form validation alerts, out-of-stock tags. |
| `--color-status-success` | `#3D7853` | `143°, 33%, 35%`| Success / Delivered | Order confirmed, payment verified state. |
| `--color-status-warning` | `#C78828` | `36°, 66%, 47%` | Warning / Low Stock | Low-stock counters ($\le 5$ units remaining). |

---

## 2. Typography Hierarchy

ShopSphere pairs an elegant, high-contrast Editorial Serif with an ultra-clean, proportional Geometric Sans.

* **Display Serif Font:** `Playfair Display` or `Cormorant Garamond` (Hero titles, page headings, collection names, price numbers).
* **Body & UI Sans Font:** `Plus Jakarta Sans` or `Inter` (Navigation links, body copy, form fields, table data, micro-labels).

### 2.1 Type Scale

| Scale Role | Font Family | Size (px / rem) | Weight | Letter Spacing | Line Height |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | Serif | `56px / 3.5rem` | 400 (Regular) | `-0.025em` | `1.1` |
| **Section Heading (H1)** | Serif | `36px / 2.25rem`| 500 (Medium) | `-0.02em` | `1.2` |
| **Subsection (H2)** | Serif | `28px / 1.75rem`| 500 (Medium) | `-0.015em` | `1.3` |
| **Card Title (H3)** | Sans | `18px / 1.125rem`| 600 (SemiBold)| `-0.01em` | `1.4` |
| **Subheading (H4)** | Sans | `15px / 0.9375rem`| 600 (SemiBold)| `0` | `1.4` |
| **Body Large** | Sans | `16px / 1.0rem` | 400 (Regular) | `0` | `1.6` |
| **Body Regular** | Sans | `14px / 0.875rem`| 400 (Regular) | `0` | `1.5` |
| **Caption / Subtext** | Sans | `12px / 0.75rem` | 400 (Regular) | `+0.01em` | `1.4` |
| **Editorial Overline** | Sans | `11px / 0.6875rem`| 600 (SemiBold)| `+0.12em (ALL CAPS)` | `1.2` |

---

## 3. Elevation, Spacing & Border Radius Tokens

### 3.1 Spacing Scale
* `--space-2xs`: `4px` (0.25rem) — tight icon gaps.
* `--space-xs`: `8px` (0.5rem) — chip padding, compact row gaps.
* `--space-sm`: `12px` (0.75rem) — input padding, button internal gaps.
* `--space-md`: `16px` (1.0rem) — card content padding, standard stack margins.
* `--space-lg`: `24px` (1.5rem) — section container padding, modal body inset.
* `--space-xl`: `32px` (2.0rem) — grid column gaps, editorial separation.
* `--space-2xl`: `48px` (3.0rem) — page section spacing.
* `--space-3xl`: `80px` (5.0rem) — hero and banner breathing margins.

### 3.2 Border Radius System
* `--radius-none`: `0px` — Used on editorial full-bleed gallery items and crisp borders.
* `--radius-sm`: `3px` — Subtle rounding for form controls and action buttons.
* `--radius-md`: `6px` — Standard for product cards and dropdown menus.
* `--radius-lg`: `12px` — Modal containers and notification drawers.
* `--radius-full`: `9999px` — Color swatches, tag pills, pill buttons.

### 3.3 Shadow Elevation
* `--shadow-sm`: `0 1px 3px rgba(22, 21, 19, 0.05)` (Product cards default).
* `--shadow-md`: `0 4px 12px rgba(22, 21, 19, 0.08)` (Product card hover, dropdowns).
* `--shadow-lg`: `0 12px 32px rgba(22, 21, 19, 0.12)` (Modals, cart slide-over drawer).

---

## 4. Core Component Specifications

### 4.1 Buttons
* **Primary Button (The Ink Block):**
  * Background: `#161513` (Ink Deep); Text: `#FDFBF7` (Ivory).
  * Padding: `14px 28px`; Font: `13px` SemiBold, tracking `+0.06em`, uppercase.
  * Hover: Background fades to `#4B4843` with smooth `150ms ease-out` transition.
  * Loading State: Centered subtle spinner; disabled click events.
* **Secondary Button (The Sand Outline):**
  * Border: `1px solid #C8B293`; Background: Transparent; Text: `#161513`.
  * Hover: Background `#F7F4EC` (Cream fill).
* **Ghost / Text Button:**
  * Background: Transparent; Text: `#161513`; Underline on hover.

### 4.2 Product Card Anatomy
1. **Aspect Ratio:** `3:4` vertical portrait ratio standard for apparel presentation.
2. **Image Container:**
   * Soft neutral frame `#F7F4EC`.
   * Primary image visible by default.
   * Secondary alternate view (lookbook angle or detail shot) cross-fades on hover (`duration-500 ease-in-out`).
   * Subtle top-right Wishlist heart icon button (SVG Lucide `Heart`), filling with `#BA4343` when active.
   * Top-left badges: `NEW ARRIVAL` (Ivory badge), `SALE -20%` (Sand badge), `LOW STOCK` (Amber badge).
3. **Card Body Details:**
   * Overline category: `11px`, tracking `+0.08em`, text muted.
   * Product Title: `15px`, medium weight, line clamp 1.
   * Color Swatches: Mini `12px` circular swatches displaying available shades.
   * Price Display: Current price bolded; compare-at price struck through in muted gray.
   * Quick Add Slide-up: On desktop hover, an editorial "Quick Add" drawer slides up from the bottom of the card displaying available sizes.

### 4.3 Form Controls & Validation
* Inputs feature a clean bottom border or subtle full border `#EAE5DA`.
* On focus: Border smoothly transitions to `#161513` with no glaring browser outline.
* Inline error message: Appears directly beneath the input in `#BA4343` with Lucide `AlertCircle` icon.

### 4.4 Status Badges & Indicators
* **Order Status Pills:**
  * `pending_payment`: Amber background `#FEF3C7`, text `#92400E`.
  * `confirmed`: Sand background `#F5EBE1`, text `#785E3B`.
  * `processing`: Blue-slate background `#E0E7FF`, text `#3730A3`.
  * `shipped`: Purple-sage background `#EDE9FE`, text `#5B21B6`.
  * `delivered`: Sage green background `#D1FAE5`, text `#065F46`.
  * `cancelled`: Red background `#FEE2E2`, text `#991B1B`.

### 4.5 Loading Skeletons & Shimmer States
* Warm ivory base color `#EFEBE2` with an animated linear shimmer `#F8F6F0`.
* Skeletons replicate the exact aspect ratios and dimensional heights of real components (e.g. 3:4 portrait blocks for cards, text bars for titles).

---

## 5. Accessibility & Responsive Breakpoints

* **Color Contrast:** All body text meets WCAG AA standards with contrast ratios $> 7:1$ (`#161513` on `#FDFBF7`).
* **Focus States:** High-visibility keyboard focus rings (`outline: 2px solid #C8B293; outline-offset: 2px`) for keyboard accessibility.
* **Touch Targets:** All interactive elements (size buttons, color swatches, icon toggles) adhere to a minimum $44 \times 44\text{px}$ touch target on mobile viewports.
* **Breakpoints:**
  * Mobile: `< 640px` (Single column catalog, drawer filters).
  * Tablet: `640px - 1024px` (2 column grid, collapsible filters).
  * Desktop: `1024px - 1440px` (3-4 column grid, sticky filter sidebar).
  * Ultra-wide: `> 1440px` (Max container width capped at `1400px` for optimal reading line length).
