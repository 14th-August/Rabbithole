/**
 * Module declarations for bundled asset imports.
 *
 * Makes `import logo from "@/assets/images/icon.png"` typecheck. Metro already
 * resolved the file correctly before this existed — the failure was only ever at
 * the type layer, because `expo/types` declares `*.css` and friends but no image
 * formats, and `expo-env.d.ts` is generated with a "should not be edited" notice.
 *
 * Returns: `number` for every image import, because Metro rewrites it to an
 * opaque asset registry id — React Native's own `ImageRequireSource`, which both
 * `<Image source>` and `expo-image` accept.
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
