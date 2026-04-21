# Design System: The Civic Editorial

## 1. Overview & Creative North Star

The Creative North Star for this design system is **"The Digital Curator."**

To honor a long-standing community voting platform entering its second decade, the design bridges **Institutional Trust** (the reliability of a 10-year-old platform) with **Modern Accessibility** (the ease of use expected today). We move away from "web portal" clutter toward a "digital editorial" feel — high-quality typography, intentional whitespace, and a sense of curated importance for every vote.

We achieve this by breaking rigid, boxed-in grids. Instead, we use intentional asymmetry, significant negative space, and a "layered paper" philosophy — creating a sense of history and trust ("Established") while using vibrant tonal shifts to signal progress ("Evolving").

---

## 2. Visual Principles

- **Trust through Clarity:** Use a sophisticated serif for headlines to evoke the feeling of a respected newspaper or official document.
- **Active Participation:** Primary actions use a deep "Civic Blue" that feels stable and authoritative, not tech-startup vibrant.
- **Data as Narrative:** Poll results and statistics are treated as part of the story, not just raw data. Progress bars and charts are clean and integrated.
- **Human-Centric:** Remind users that this platform is built by people, not algorithms.

---

## 3. Color Palette

### Core Colors

| Role       | Name        | Hex       | Usage                                              |
|------------|-------------|-----------|-----------------------------------------------------|
| Primary    | Civic Blue  | `#1A43BF` | Primary CTAs, brand identity, active navigation      |
| Secondary  | Cyan        | `#00D1FF` | Secondary actions, confirmation states, accent highlights |
| Tertiary   | Burnt Orange| `#FF5C00` | Attention-grabbing accents, warnings, "Closing Soon" states |
| Neutral    | Dark Slate  | `#44474E` | Body text, labels, metadata, neutral UI elements     |

### Surface Hierarchy

Treat the UI as a physical stack of materials. Depth is conveyed through **tonal layering**, not borders.

- **Base Level:** `#F9F9FF` — overall page background
- **Content Zones:** `surface-container-low` — defines large content areas
- **Interactive Elements:** `#FFFFFF` — cards and "active" surfaces for crisp, clean lift
- **Dark Surfaces:** `#002C98` to `#1A43BF` gradient at 135 degrees — for hero sections, primary CTAs

### The "No-Line" Rule

**1px solid borders are prohibited for sectioning.** Boundaries are defined through background color shifts. The eye should perceive depth through color, not drawn lines.

### The "Ghost Border" Fallback

If accessibility requires a visible stroke, use `#C4C5D6` at 20% opacity. It should be felt, not seen.

---

## 4. Typography

The typographic strategy pairs the intellectual rigor of a Serif with the functional clarity of a geometric Sans-Serif.

| Scale     | Font         | Usage                                    |
|-----------|-------------|------------------------------------------|
| Headline  | **Noto Serif**  | Display headings, hero text, ballot titles — editorial, trustworthy weight |
| Body      | **Manrope**     | UI text, body copy, data labels — modern proportions, high readability    |
| Label     | **Manrope**     | Metadata, tags, small UI elements — all-caps with 0.05em tracking for institutional feel |

### Hierarchy Tips

- Use `display-lg` sparingly to anchor major community milestones.
- Contrast large serif headlines with small all-caps Manrope labels for metadata to create an "institutional" feel.

---

## 5. Shape & Elevation

- **Corner Radius:** `0.5rem` (lg) to `0.75rem` (xl) — a balance between clinical sharp corners and overly playful roundness. Use `9999px` (full) for badges and avatars.
- **Ambient Shadows:** For floating elements, use blur values of 24px–40px at 4%–6% opacity. Shadow color must be a tinted version of `#181C22`, never pure black.
- **No drop shadows on cards** sitting on the main surface — let color shifts do the work. Only use shadows for floating objects (modals, popovers, tooltips).

---

## 6. Button Styles

Four button variants, as shown in the design reference:

| Variant   | Background             | Text Color  | Border         | Usage                    |
|-----------|------------------------|-------------|----------------|--------------------------|
| Primary   | `#1A43BF` (gradient)   | White       | None           | Main CTAs (Vote, Submit) |
| Secondary | Light surface          | `#1A43BF`   | None           | Secondary actions        |
| Inverted  | `#1A43BF` solid        | White       | None           | Dark-background contexts |
| Outlined  | Transparent            | `#1A43BF`   | 1px `#1A43BF`  | Tertiary actions         |

### Interaction States

- On selection/confirmation, buttons transition to Secondary cyan (`#00D1FF`) to provide vibrant confirmation of the user's action.

---

## 7. Components

### Poll Cards
- No borders. Background: white (`surface-container-lowest`).
- Header: Manrope `title-lg` for the question.
- Use 24px vertical whitespace between header and voting options — no dividers.

### The Ballot Box
- Clean, vertical list of options with high-contrast selection indicators.
- The physical act of voting should feel definitive.

### Results Visualizations
- Leading data bar: Secondary cyan (`#00D1FF`).
- Bar track: `surface-container-high`.
- `0.75rem` rounded corners on bars.
- If the user voted for an option, highlight that bar with a Primary glow or Tertiary accent.

### Progress Bars
- Two-tone: Primary blue for filled, Tertiary dark for secondary/comparison tracks.
- Clean and minimal, integrated into the narrative.

### Navigation Icons
- Filled icon style on Primary blue background for active state.
- Neutral outline style for inactive states.
- Consistent icon sizing within pill-shaped containers.

### Search Input
- Light surface background with subtle rounding.
- On focus: background shifts to white, 2px Ghost Border of Primary at 40% opacity.
- Search icon (magnifying glass) as leading element.

### Labels & Tags
- Tertiary-toned background (muted brown/dark orange) with white text and leading icon.
- `9999px` rounding for a friendly, approachable feel.

### Icon Actions
- Small square icon buttons with `0.5rem` rounding.
- Teal/Primary tones for standard actions, Tertiary red-brown for destructive actions (delete).

---

## 8. Tone of Voice

- **Direct & Respectful:** Avoid slang or overly technical jargon.
- **Empowering:** Emphasize the user's impact.
- **Transparent:** Clearly label "Active," "Archived," and "Closing Soon" states.

---

## 9. Do's and Don'ts

### Do
- Use Noto Serif for ballot titles to make them feel like "The Headline" of the community conversation.
- Use surface color shifts to separate "Current Polls" from "Past Results."
- Embrace whitespace. If a layout feels crowded, remove a container and increase the margin.
- Use Secondary cyan for positive feedback or success states.

### Don't
- Use 1px solid black or grey borders for sectioning. They cheapen the editorial experience.
- Use error red (`#BA1A1A`) for anything other than critical system failures. For "Closing Soon," use Tertiary (`#FF5C00`).
- Use tight corner radii. Stick to `lg` or `xl` to maintain modern softness.
- Use drop shadows on cards sitting on the main surface.
- Use pure black for shadows or text — always use tinted neutrals.
