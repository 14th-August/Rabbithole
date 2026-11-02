/*
 * Date: 2026-10-30
 * Uploads the fixture photos that seed.sql inserts listing_images rows for.
 * Run after every reset: npx supabase db reset && node supabase/seed-storage.mjs
*/

// seed.sql can write rows but not Storage objects, so on its own it claims
// photos that were never uploaded. Idempotent -- upsert is on.
// Each row gets the fixture with its exact declared dimensions: width/height is
// what a card uses to reserve its box, so a mismatch reads as a layout bug.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

const FIXTURES = join(import.meta.dirname, "fixtures");
const BUCKET = "listing-images";

/*
* Def: credentials
* Desc: Local API URL and service-role key, from the CLI rather than a committed
* file. The service role is needed on purpose: the storage policy matches the
* first path segment against auth.uid(), and seeding writes into every user's
* folder. Env vars win, so this works where the CLI is not on PATH.
* Return: { url, key }.
*/
function credentials() {
  const fromEnv = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (fromEnv.url && fromEnv.key) return fromEnv;

  // `-o env` is the machine-readable form; the human one reflows and is not
  // safe to parse. A single command string rather than execFileSync with args:
  // on Windows `npx` is a .cmd, which node 24 refuses to spawn without a shell,
  // and passing an args array through a shell is deprecated. Nothing here is
  // interpolated, so there is no injection surface.
  const out = execSync("npx supabase status -o env", { encoding: "utf8" });

  const read = (name) => out.match(new RegExp(`^${name}="(.*)"$`, "m"))?.[1];
  const url = fromEnv.url ?? read("API_URL");
  const key = fromEnv.key ?? read("SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Could not read API_URL / SERVICE_ROLE_KEY. Is the stack running?");
  }
  return { url, key };
}

const { url, key } = credentials();
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await db
  .from("listing_images")
  .select("storage_path, width, height")
  .order("storage_path");

if (error) throw new Error(`Could not read listing_images: ${error.message}`);
if (rows.length === 0) {
  console.log("No listing_images rows. Run `npx supabase db reset` first.");
  process.exit(0);
}

// Read each fixture once rather than per row; there are only three.
const cache = new Map();
function fixture(width, height) {
  const name = `${width}x${height}.jpg`;
  if (!cache.has(name)) cache.set(name, readFileSync(join(FIXTURES, name)));
  return cache.get(name);
}

let uploaded = 0;
const skipped = [];

for (const row of rows) {
  // A row with no dimensions has nothing to match on. The app always writes
  // them, so this only catches a hand-edited row.
  if (!row.width || !row.height) {
    skipped.push(`${row.storage_path} (no dimensions)`);
    continue;
  }

  let body;
  try {
    body = fixture(row.width, row.height);
  } catch {
    skipped.push(`${row.storage_path} (no ${row.width}x${row.height}.jpg fixture)`);
    continue;
  }

  const { error: uploadError } = await db.storage.from(BUCKET).upload(row.storage_path, body, {
    // The bucket allows image/jpeg only, so this doubles as a check that the
    // guardrail in 20261030120000_listing_image_format.sql is working.
    contentType: "image/jpeg",
    upsert: true,
  });

  if (uploadError) {
    skipped.push(`${row.storage_path} (${uploadError.message})`);
    continue;
  }
  uploaded += 1;
}

console.log(`Uploaded ${uploaded} of ${rows.length} fixture photos to ${BUCKET}.`);

if (skipped.length > 0) {
  console.warn(`\nSkipped ${skipped.length}:`);
  for (const line of skipped) console.warn(`  ${line}`);
  process.exitCode = 1;
}
