# Design rules

How Rabbithole looks and behaves. Loaded into every session via `AGENTS.md`.

The app was scaled back to working authentication on 2026-10-18. What exists is
sign-in, sign-up, email verification, the welcome splash, and a signed-in screen
showing your own profile. Everything below describes that, and nothing more —
rules for screens that do not exist were removed, not deferred into prose.

## Styling

**1. A colour used once is a literal in the `StyleSheet`, with a comment naming
its role. A colour used more than once in a file gets a named constant at the
top.** There is no theme module, no provider, no `useTheme()`. Where a value
appears once, the comment carries more than a name could; where it repeats, the
name is what stops the copies drifting apart — `(tabs)/_layout.tsx` has one blue
for the plus at rest and another for every selected tab, each in two or three
places, and editing one of three literals is a bug waiting to happen.

```tsx
export function Thing() {
  return <Text style={styles.title}>Hello</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    // Primary text.
    color: "#12161D",
  },
});
```

A colour needed as a **prop** rather than a style — `Ionicons`' `color`,
`placeholderTextColor`, `ActivityIndicator`'s `color` — gets its own entry and
is read back through it, so the value still has exactly one home:

```tsx
<Ionicons name="chevron-back" size={24} color={styles.dismissIcon.color} />

// …
dismissIcon: {
  // Primary text. Not a layout style — `Ionicons` takes a `color` prop, and
  // this is where the value it reads lives.
  color: "#12161D",
},
```

Prefer pointing at an existing entry when one is genuinely the same thing —
`FieldError`'s icon reads `styles.text.color` because the glyph and the sentence
are one object, and a spinner replacing a label wears that label's colour.

Constants are **per file and never shared** — no `src/theme`, no imports between
them. `TEXT_PRIMARY` may be declared in three files at once; that duplication is
the accepted cost, and the benefit is that a file is readable on its own.

**Only `(tabs)/_layout.tsx` follows the repeat half of this rule so far.** Seven
other files still repeat a literal — `sign-in`, `sign-up` and `verify` (`#4C5566`,
plus `#0165F2` in `verify`), `(auth)/_layout` (`#FFFFFF`), `profile` (`#12161D`,
`#DC2626`), `Button` (`#0165F2`), `Field` (`#EFF1F5`). That is a **pending
decision, not drift**: do not migrate them without being asked, and do not treat
them as violations to fix in passing.

The history, so the rule is not re-litigated: a two-scheme token system was
correct for the app that was planned and overhead for the one that exists. The
per-file constants that replaced it were a token system with extra steps when
every name was used once — hence the move to literals. Naming the values that
actually repeat is the part that survived.

**2. Keep inline styles for genuinely dynamic values only** — an error border, a
pending opacity, a safe-area inset. Everything static belongs in the StyleSheet.

**3. The app is light only.** `userInterfaceStyle` is `"light"` in `app.json`,
which is also what stops the OS handing the app dark keyboards and alerts.
There is no dark palette to maintain.

### Values in use

Reach for one of these before inventing a neighbour. They are not tokens — copy
the literal into the file that needs it.

| Role | Value |
| --- | --- |
| Page background | `#F7F8FA` |
| Card / auth page | `#FFFFFF` |
| Input fill | `#EFF1F5` |
| Hairline | `#E2E6ED` |
| Primary text | `#12161D` |
| Secondary text | `#4C5566` |
| Tertiary / labels | `#6B7688` |
| Placeholder | `#9AA4B4` |
| Brand, links | `#0165F2` |
| Brand, selected | `#023b8b` |
| On brand | `#FFFFFF` |
| Error | `#DC2626` |

Spacing is a 4pt grid: 4, 8, 12, 16, 24, 32, 48. If a design needs 18, the
answer is 16 or 24. Radii: 6, 10, 14, 20, and 999 for a pill.

Type is `fontSize` / `lineHeight` / `fontWeight`: 24/30/700 screen titles,
20/26/600 section, 17/22/600 card, 16/22/400 body, 15/20/500 button,
14/19/400 metadata, 13/18/400 footnote, 12/16/600 badge.

### Three literals that must not drift

- **`#0165F2`** in `BootScreen.tsx` and `WelcomeOverlay.tsx` must equal
  `expo-splash-screen.backgroundColor` in `app.json`. The OS paints the native
  splash from that value before any JavaScript runs; a mismatch flickers at the
  handover and reads as a bug.
- **`76`** in `BootScreen.tsx` must equal `app.json` → `imageWidth`, or the mark
  visibly jumps.
- **`44`** minimum tap target. An accessibility floor, not a preference — a 20pt
  icon button pads or `hitSlop`s up to it.

## States are not optional

Anything that renders data handles four cases. Build them with the happy path,
not after a bug report.

| State | Requirement |
| --- | --- |
| **Loading** | A skeleton shaped like the real layout, on `#EFF1F5`. Never a centred spinner on a full screen. |
| **Empty** | A sentence saying what would appear here, and an action where one exists. |
| **Error** | Say what failed and offer a retry. Never a raw error string — `src/lib/queries/errors.ts` is where raw strings stop. |
| **Partial** | A null field is the common case, not the exception. |

**Nullable carries meaning.** `rating_avg: null` is "no reviews yet" and renders
"New seller", never "0.0". `profile` is null for a moment after launch and
between signup and confirmation — the email is the honest fallback.

## Accessibility

- Text contrast targets WCAG AA — 4.5:1 body, 3:1 large text. `#0165F2` with
  white reaches 5.07:1, which is why the brand blue is that value and not the
  Expo starter's lighter one.
- Every touchable has an `accessibilityLabel` and `accessibilityRole`. An
  icon-only button with no label is invisible to a screen reader.
- `accessibilityState` carries `busy` for in-flight work and `selected` for a
  choice. `disabled` alone announces "unavailable", which misreports a button
  that is working.
- A label whose visible text changes every second — a resend countdown — keeps a
  stable `accessibilityLabel`.
- Never encode meaning in colour alone.
- Respect the system font scale. Prefer `minHeight` over fixed heights around text.

## Motion

Sparing. `react-native-reanimated` is installed and used in exactly one place:
the welcome overlay's fade. The default answer is no animation. Auth screens
set `animation: "none"` on purpose — they are the same layout with different
fields, so sliding between them reads as lag rather than motion.
