# `src/theme`

Design tokens. Every colour, distance, and font size in the app comes from here.

## Usage

```tsx
import { useTheme } from "@/theme";

export default function Example() {
  const { colors, spacing, typography, radius } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
      <Text style={[typography.title3, { color: colors.text.primary }]}>Campbell Biology</Text>
      <Text style={[typography.price, { color: colors.brand.default }]}>$65</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 4 },
});
```

**Theme-dependent values go inline; static layout stays in `StyleSheet.create`.**
Splitting this way keeps the static half cached by `StyleSheet` while the themed
half stays reactive.

## Files

| File | Holds |
| --- | --- |
| `palette.ts` | Raw hex ramps. **Private to this folder.** |
| `colors.ts` | Semantic tokens, defined twice — light and dark |
| `spacing.ts` | 4pt spacing scale, radii, layout constants |
| `typography.ts` | Type scale as complete `TextStyle` objects |
| `useTheme.ts` | The hook every component calls |
| `index.ts` | Barrel |

## Rules

1. **Never hardcode a colour, size, or radius in a component.** Not even once,
   not even for a border. `app.json` still carries `#208AEF` and `#E6F4FE` because
   Expo config cannot import TypeScript — that is the only permitted duplication,
   and it is mirrored in `palette.ts` as `blue[500]` and `blue[50]`.
2. **Never import `palette.ts` outside this folder.** Ramps are appearances;
   components consume meanings. `neutral[200]` is a light-mode border and a
   dark-mode invisibility.
3. **Add tokens in pairs.** `Colors` is a shared contract, so a new token will
   not compile until both `light` and `dark` define it. Do not defeat this.
4. **Check both schemes before calling a screen done.** The simulator toggles
   with `Cmd+Shift+A` (iOS) or via system settings (Android).

## Adding a manual theme override later

There is no context provider today — `useTheme()` reads `useColorScheme()`
directly. If a light/dark/system setting is ever added to Profile, wrap the app in
a provider and change `useTheme()` to read it. Because every component already
funnels through this one hook, nothing else in the codebase changes.
