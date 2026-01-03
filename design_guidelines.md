# Speed Reading Competition - Design Guidelines

## Design Approach
**Utility-First Application Design** - Inspired by productivity tools like Linear and Notion, prioritizing clarity, performance, and functional hierarchy. This is a competition platform where timing accuracy and data clarity are paramount.

## Typography System
- **Primary Font**: Inter or IBM Plex Sans (Google Fonts)
- **Hierarchy**:
  - Page titles: text-3xl to text-4xl, font-semibold
  - Section headers: text-xl to text-2xl, font-medium
  - Body text: text-base, font-normal
  - Labels/metadata: text-sm, font-medium
  - Timers/stats: text-2xl to text-4xl, font-bold, tabular-nums

## Layout System
**Spacing Primitives**: Use Tailwind units of 3, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Page margins: px-4 md:px-8, py-6 md:py-12
- Card spacing: space-y-4

## Core Components

### Landing Page (Student Entry)
- **Layout**: Centered container (max-w-6xl), single column on mobile, 3-column grid on desktop (grid-cols-1 md:grid-cols-3 gap-6)
- **Category Cards**: 
  - Each card shows category icon/illustration at top
  - Category name (text-2xl font-bold)
  - Two status badges: "Registration: Opens in X" and "Competition: Starts in X"
  - Countdown timers (text-xl font-mono)
  - "Register Now" CTA button (full width within card)
  - Card: rounded-lg border with subtle shadow, p-6
  
### Registration Form
- **Layout**: Centered narrow form (max-w-md), single column
- **Structure**: 
  - Form header with category badge
  - Input fields with floating labels or top labels (text-sm font-medium)
  - Two-column grid for related fields (name/surname, city/country)
  - Referral code input with helper text below
  - Submit button (w-full, prominent)

### Student Dashboard
- **Layout**: Two-column on desktop (grid-cols-1 lg:grid-cols-3 gap-8)
- **Left Sidebar** (lg:col-span-1):
  - Profile card: name, category badge, affiliate code with copy button
  - Referral stats card: points display (large number), list of referrals
- **Main Area** (lg:col-span-2):
  - Competition countdown card (prominent, with large timer)
  - Book section: title, "Start Reading" button (disabled until competition starts)
  - Prizes section: expandable/collapsible content
  
### Competition Reading Interface
- **Layout**: Full-width with fixed header
- **Header**: Timer bar (sticky top, shows remaining time with progress indicator)
- **Content**: PDF viewer or text content (max-w-4xl mx-auto, p-8)
- **Footer**: Fixed "Finish Reading" button (always visible)

### Questions Interface
- **Layout**: Centered (max-w-3xl)
- **Question Cards**: 
  - Question number badge
  - Question text (text-lg)
  - MCQ: Radio buttons with clear labels (p-3 border rounded)
  - Text: Textarea with character limit
  - Submit answer button per question
- **Timer**: Sticky top bar showing answering time remaining

### Admin Dashboard
- **Layout**: Sidebar navigation + main content area
- **Sidebar**: Vertical tabs (Categories, Books, Questions, Prizes, Users, Submissions)
- **Tables**: 
  - Striped rows, compact spacing
  - Action buttons aligned right
  - Filters/search at top
- **Forms**: Two-column layout for settings, inline editing for quick updates

## Component Patterns

### Buttons
- Primary: Solid background, rounded, px-4 py-2, font-medium
- Secondary: Border only, same padding
- Danger: For delete actions
- Icon buttons: Square, p-2, rounded

### Cards
- Border-based design (avoid heavy shadows)
- rounded-lg, border, p-4 to p-6
- Hover state: subtle border highlight

### Badges
- Rounded-full, px-3 py-1, text-xs font-medium
- Category badges: Kid (playful), Teen (energetic), Adult (professional)
- Status badges: Different states (open/closed/active)

### Timers/Countdowns
- Monospace font (font-mono)
- Large display (text-3xl to text-5xl)
- Include visual progress bars where appropriate
- Show both countdown and absolute time

### Data Tables
- Zebra striping for readability
- Compact row height
- Sortable headers
- Export button in top-right

## State Indicators
- Loading: Skeleton screens for content, spinner for actions
- Empty states: Icon + message + CTA
- Success/Error: Toast notifications (top-right)
- Disabled states: Reduced opacity (opacity-50), cursor-not-allowed

## Responsive Behavior
- Mobile: Stack all columns, full-width buttons, collapsible sections
- Tablet: Two-column layouts where appropriate
- Desktop: Full multi-column layouts, sidebar navigation

## Images
**Minimal Image Usage** - This is a functional application, not a marketing site.
- **Category card illustrations**: Small icon-style illustrations or badges representing each category (kid/teen/adult) - placed at top of each card
- **No hero images** - Landing page leads directly with category cards
- **Book covers**: If provided, display as thumbnail in dashboard
- **Profile avatars**: Fallback to initials in colored circles

## Animations
**Minimal and Purposeful Only**:
- Timer countdown: Smooth number transitions
- Button states: Subtle scale on click
- Toast notifications: Slide in from top-right
- Loading states: Pulse on skeleton screens
- NO scroll animations, NO parallax, NO decorative motion

## Accessibility
- All interactive elements keyboard accessible
- Form validation with clear error messages
- ARIA labels on timers and dynamic content
- Sufficient contrast ratios throughout
- Focus indicators on all interactive elements