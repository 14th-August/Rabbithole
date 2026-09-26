/**
 * Module declarations for bundled asset imports.
 *
 * Owns: making `import logo from "@/assets/images/icon.png"` typecheck.
 * Does not own: resolving or serving the file. Metro does that, and did so
 *   correctly before this file existed — the failure was only ever at the type
 *   layer.
 *
 * Why this is needed: `expo/types` declares `*.css`, `*.sass`, and `*.scss` but
 * no image formats, and `expo-env.d.ts` is generated with a "should not be
 * edited" notice. Without a declaration, every asset import is a TS2307 error
 * even though the bundler resolves it fine — which is why the example in
 * `.claude/rules/technical-defaults.md` could not have compiled as written.
 *
 * The type is `number` because Metro rewrites the import to an opaque asset
 * registry id. That is exactly React Native's own `ImageRequireSource`, and it
 * is what both `<Image source>` and `expo-image` accept.
 */

declare module "*.png" {
  const asset: number;
  export default asset;
}

declare module "*.jpg" {
  const asset: number;
  export default asset;
}

declare module "*.jpeg" {
  const asset: number;
  export default asset;
}

declare module "*.gif" {
  const asset: number;
  export default asset;
}

declare module "*.webp" {
  const asset: number;
  export default asset;
}
