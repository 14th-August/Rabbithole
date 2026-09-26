I don't have tools in this response, so here's the full replacement content for `.claude/rules/design-rules.md` — drop it in as-is.

The substantive shift: when everything is textbooks, items are identified by **title text** and prices cluster in one order of magnitude. Once cars, furniture, and clothing are in scope, items are identified by **photo**, prices span $0 to four figures, and category becomes primary navigation rather than a filter. That changes several concrete rules, not just the copy.

````markdown
# Design rules

How Rabbithole looks and behaves. Loaded into every session via `AGENTS.md`.

Rabbithole is a general marketplace for one campus. Students sell whatever they
legitimately own — textbooks, furniture, bikes, clothing, electronics, event
tickets, cars — subject to university guidelines. The design target is **fast,
plain, and trustworthy**, not expressive.

Two consequences follow from the breadth, and most of the rules below come from them:

1. **Items are identified by photo, not by title.** A textbook can be recognised
   from its title alone; a couch, a jacket, or a bike cannot. The image is the
   primary content of a card, and a listing without one is badly degraded.
2. **Price spans four orders of magnitude.** $0 to $5,000 in the same feed. Every
   layout that touches price must survive both ends.

A buyer deciding whether to message a stranger needs **photo, price, condition,
seller reputation, and pickup feasibility** legible in about two seconds. Anything
competing with those five is decoration.

## Non-negotiables

**1. Never hardcode a colour, spacing value, radius, or font size.** Everything
comes from `useTheme()`. Not once, not for a border, not "temporarily".

```tsx
const { colors, spacing, typography, radius } = useTheme();

<View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
  <Text style={[typography.title3, { color: colors.text.primary }]}>{listing.title}</Text>
</View>
```

The single permitted exception is `app.json`, which carries `#0165F2` because Expo
config cannot import TypeScript. It is mirrored in `palette.ts` as `blue[500]`.

**2. The app is pinned to light, for now.** `userInterfaceStyle` is `light` in
`app.json`, and the root layout wraps everything in `<ThemeProvider scheme="light">`.
Every screen is a white page whatever the device's appearance is set to.

This is a pause, not a deletion. Both halves of every token pair still exist, and
every component still resolves through `useTheme()` — so dark mode comes back by
deleting one prop in `src/app/_layout.tsx`. That only stays true while rule 1
holds: the moment a screen hardcodes `#FFF` or `#000` because "it's light
anyway", the one-line change stops working and the audit is manual again.

**3. Never import `src/theme/palette.ts` outside `src/theme`.** Ramps are
appearances; components consume meanings. `neutral[200]` is a light-mode border and
a dark-mode invisibility.

**4. Add colour tokens in pairs.** `Colors` is a shared contract — a new token will
not compile until both schemes define it. Do not work around this.

## Token vocabulary

| Need | Token |
| --- | --- |
| Page background | `colors.background` |
| Card, sheet, tab bar | `colors.surface` |
| Input, image placeholder, skeleton | `colors.surfaceSunken` |
| Hairline, divider | `colors.border` |
| Focused input, selected chip | `colors.borderStrong` |
| Titles and body copy | `colors.text.primary` |
| Timestamps, metadata | `colors.text.secondary` |
| Input placeholder | `colors.text.placeholder` |
| Primary action, active tab, link | `colors.brand.default` |
| Text **on** a brand-filled surface | `colors.brand.onBrand` — never `"#fff"` |
| Listing status badge | `colors.listingStatus[status]` |

`brand.onBrand` exists because dark mode lifts the brand blue to `blue[300]`, and
white text on that fails contrast. Hardcoding white on a primary button ships that
bug in one scheme only, which is the hardest kind to notice.

## Imagery

User photos are now the primary content, and they are wildly inconsistent — phone
snapshots of a dark dorm room next to a white-background product shot.

- **Every image sits on a `colors.surfaceSunken` container with a
  `colors.border` hairline.** Without it, a white-background photo bleeds into a
  white card in light mode and the card loses its edge. This is the single most
  visible consequence of broadening scope.
- **`layout.listingAspectRatio` (4:3) is the container, not the image.** Crop to
  fill for feed cards so the grid stays even. On the detail screen, contain rather
  than crop — cropping a bike or a jacket hides the thing being sold.
- **Never hide a card because it has no photo.** Render the `surfaceSunken`
  placeholder with a category-appropriate icon. Photoless listings are legitimate
  and common for cheap items.
- **The Create flow should encourage photos without blocking on them.** A prompt,
  not a validation error.

## Spacing and layout

4pt grid. If a design needs 18, the answer is 16 or 24 — the constraint is the
feature. Arbitrary values are what make a layout feel subtly wrong.

- `layout.screenPaddingX` on every screen's horizontal gutter. Consistency here is
  most of what makes an app feel built rather than assembled.
- `layout.listGap` between feed cards.
- `layout.tapTargetMin` is **44** and is an accessibility floor, not a preference.
  A 20pt icon button must pad or `hitSlop` up to it.

## Typography

Use the named variant, never a raw `fontSize`.

- `title1` screen titles · `title2` section headings · `title3` card titles
- `body` descriptions and messages · `subhead` metadata · `footnote` timestamps
- `caption` badges and chips
- **`price` / `priceCompact`** — prices have their own variant on purpose. Price is
  the most-scanned element on a card; tying it to a general heading style means a
  later typographic tweak silently changes scanning behaviour across the feed.

**Price layout must survive "$0" and "$4,750" in the same column.** Never truncate,
never abbreviate to "4.7k", never let a long price push the title out of alignment.
Use thousands separators. Test the widest case before the common one.

Compose with colour rather than baking it in:
`style={[typography.body, { color: colors.text.secondary }]}`.

## States are not optional

Every component that renders data handles four cases. Build them at the same time
as the happy path, not after a bug report.

| State | Requirement |
| --- | --- |
| **Loading** | Skeleton on `colors.surfaceSunken`, matching the real layout's shape. Never a centred spinner on a full screen. |
| **Empty** | A sentence explaining what would appear here, and where possible an action. |
| **Error** | Say what failed and offer a retry. Never a raw error string. |
| **Partial** | Missing photo, missing avatar, `null` rating, no pickup hint. These are the common case, not the exception. |

**Empty categories are now the normal case, not an edge case.** A campus marketplace
will have twelve listings under Textbooks and zero under Cars. A browsed category
with nothing in it must not read as an error or a broken screen — it should say the
category is quiet and offer to post the first listing or browse everything.

## Marketplace rules

- **`price_cents: 0` renders "Free"**, never "$0.00".
- **`rating_avg: null` renders "New seller"**, never "0.0 ★". Zero stars is an
  accusation; no reviews is a fact.
- **Always show `rating_count` beside `rating_avg`.** "5.0 ★" from one review is
  technically true and materially misleading.
- **Trust display scales with price.** A $10 t-shirt and a $3,000 car do not
  warrant the same reputation prominence. Above a threshold, surface seller rating,
  review count, and account age on the card itself rather than only on detail.
- **Condition is category-relative.** The union (`new` / `like_new` / `good` /
  `fair` / `poor`) is shared, but "like new" means something different for a jacket
  than for a car. Show the label plainly; do not add category-specific promises the
  data cannot support.
- **Long titles wrap to a maximum of two lines on cards**, with `numberOfLines`.
- **`reserved` and `sold` listings show a status badge** and suppress the primary
  action.
- **Pickup feasibility is a first-class signal.** A textbook changes hands in a
  library lobby; a couch or a car does not. Surface `pickup_hint` on the card when
  present, and treat large-item logistics as information the buyer needs *before*
  messaging, not after.

## Category and discovery

With a single category, a flat reverse-chronological feed is sufficient. With many,
it is not — users arrive knowing roughly what they want.

- **Category selection is primary navigation on Discover**, visible without
  scrolling, not hidden behind a filter sheet.
- **Search is a first-class affordance**, not a secondary one.
- **The category tree is two levels** (`parent_id` self-reference), so pickers are
  a drill-down, not a flat list.
- **Resist per-category custom fields in v1.** A car wants mileage and year;
  clothing wants size. Adding category-specific columns fragments one clean schema
  into many and is very hard to reverse. Structured attributes are a considered
  future change — for now that detail lives in the description, and the Create flow
  can prompt for it per category without storing it separately.

## University guidelines

Breadth of scope makes content policy a design surface, not a footnote.

- **The Create flow states what may not be listed**, visibly, before submission —
  not buried in a terms link. Alcohol, cannabis and vapes, weapons, prescription
  medication, live animals, recalled goods, and anything supporting academic
  dishonesty (completed assignments, essay-writing services, exam material).
- **Reporting is one tap from any listing and any profile**, and never hidden behind
  an overflow menu three levels deep.
- **A reported listing's state is visible to its owner.** Silent removal reads as a
  bug and generates support load.
- **Do not build a moderation queue without someone to read it.** A report button
  that leads nowhere is worse than none — see `ARCHITECTURE.md` → Open questions.

## Accessibility

- Text contrast targets WCAG AA — 4.5:1 for body, 3:1 for large text. The token
  pairs are built to satisfy this; hardcoded colours are how it gets broken.
- Every touchable has an `accessibilityLabel` and `accessibilityRole`. An icon-only
  button with no label is invisible to a screen reader.
- **Listing images need meaningful alt text.** Now that the photo carries
  identification, `accessibilityLabel` on an image must convey the item, not say
  "listing image".
- Never encode meaning in colour alone. A status badge carries text as well as a
  tint — `reserved` is amber **and** says "Reserved".
- Respect the system font scale. Fixed-height containers around text break at large
  accessibility sizes; prefer `minHeight` and let content grow.

## Motion

Sparing. `react-native-reanimated` is available, but the default answer is no
animation. Permitted: state transitions that would otherwise be jarring (sheet
presentation, image gallery paging), and feedback on press. Not permitted:
animating a feed on scroll, or anything that delays showing a price.

## Deferred

`@expo/ui`, `expo-glass-effect`, and `expo-symbols` are installed but unused.
Reach for platform-native surfaces and SF Symbols only once the core flows are
built — they are polish, and polish on placeholder screens is wasted work.
Custom icons in `assets/images/tabIcons/` are likewise unused; the tab bar runs on
Ionicons until someone decides otherwise.
````

## Two follow-ups this creates

**The seed is now unrepresentative.** Nine of the twelve fixtures are textbooks or study materials. The set no longer exercises the cases this document cares about — there's no four-figure price, no clothing item where the photo *is* the identification, no large item whose pickup is genuinely hard, and no category with zero listings. Worth broadening `supabase/seed.sql` before building `ListingCard` against it, since the whole point of that set is to break naive layouts.

**Two fixture rationales in `listings.ts` reference reasoning that's now changed** — the nursing bundle's comment frames itself around textbook titles, and `listingAspectRatio`'s "books and furniture read badly in a square" note in `spacing.ts` should be re-justified around photo diversity rather than book covers.

**One thing I'd flag as unresolved:** cars are a meaningfully different transaction — title transfer, test drives, insurance, and a price point where an in-person cash handoff between strangers gets genuinely risky. That's worth an explicit decision rather than letting it arrive by default through "anything within university guidelines." It may belong on the prohibited list for v1 purely on safety grounds, independent of what the university permits.