/**
 * Create — `/create`.
 *
 * Posting a listing. Holds the draft, loads the category list, and hands the
 * result to `createListing`, which owns the four-statement publish. The title
 * is pinned rather than scrolled, so it sits on the same line as the profile
 * control the tab layout floats over every screen.
 *
 * Returns: the new-listing form.
 */

import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { ChipPicker, ChipToggles, type ChipOption } from "@/components/Chips";
import { Field } from "@/components/Field";
import { FieldError } from "@/components/FieldError";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Select, type SelectOption } from "@/components/Select";
import { TagInput } from "@/components/TagInput";
import { useAsync, type AsyncResult } from "@/lib/hooks";
import { getCategories } from "@/lib/queries/categories";
import { createListing, MAX_LISTING_PHOTOS } from "@/lib/queries/listings";
import type { ImageAsset } from "@/lib/queries/storage";
import { supabase } from "@/lib/supabase";
import {
  clampPriceInput,
  parsePriceToCents,
  validateListing,
  type ListingProblem,
} from "@/lib/utils";
import { useSession } from "@/lib/verification";
import type { Campus, Category, ListingCondition, PaymentMethod } from "@/types";

/** Page background. Also the pinned header, so content does not show through it. */
const SURFACE_PAGE = "#F7F8FA";

/** Primary text. The screen title. */
const TEXT_PRIMARY = "#12161D";

/** Tertiary text. The label above each control, and the currency symbol. */
const TEXT_TERTIARY = "#6B7688";

/**
 * The four campuses, in the order the enum declares them.
 *
 * Hardcoded rather than fetched: `campus` is a Postgres enum, not a table, so
 * there is nothing to read. Adding a member is a migration and a change here.
 */
const CAMPUS_OPTIONS: readonly SelectOption<Campus>[] = [
  { value: "nanaimo", label: "Nanaimo" },
  { value: "cowichan", label: "Cowichan" },
  { value: "powell_river", label: "Powell River" },
  // The enum member is still `parksville_qualicum`; only the label is
  // narrowed. Splitting it for real is `alter type public.campus add value
  // 'qualicum'`, which is cheap and additive — but it is a migration, and
  // every row already stored under the combined value would need deciding.
  { value: "parksville_qualicum", label: "Parksville" },
];

/** Best to worst, which is the order the enum declares and the sort it implies. */
const CONDITION_OPTIONS: readonly ChipOption<ListingCondition>[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

/** Off-platform both. v1 records what the two people agreed to use. */
const PAYMENT_OPTIONS: readonly ChipOption<PaymentMethod>[] = [
  { value: "cash", label: "Cash" },
  { value: "etransfer", label: "e-Transfer" },
];

/**
 * The six top-level categories, as picker options.
 *
 * Children are filtered out on purpose: the textbook subjects exist in the
 * table and are still valid `category_id` values, but a six-item list is one
 * decision and an eleven-item tree is two. Drilling into Biology belongs to
 * Discover, where someone is browsing rather than posting.
 */
function toCategoryOptions(rows: readonly Category[]): SelectOption<string>[] {
  return rows
    .filter((row) => row.parent_category_id === null)
    .map((row) => ({ value: row.id, label: row.name }));
}

/** The new-listing form. */
export default function Create() {
  const { session, profile } = useSession();
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<ImageAsset[]>([]);
  const [title, setTitle] = useState("");
  const [condition, setCondition] = useState<ListingCondition | null>(null);
  const [price, setPrice] = useState("");
  const [payments, setPayments] = useState<PaymentMethod[]>(["cash"]);
  const [description, setDescription] = useState("");
  const [campus, setCampus] = useState<Campus | null>(profile?.campus ?? null);
  const [pickupHint, setPickupHint] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [problem, setProblem] = useState<ListingProblem | null>(null);

  // `null` is "still loading" and a settled `AsyncResult` carries both outcomes,
  // so one state holds all three cases without a second boolean to keep in step.
  const [categories, setCategories] = useState<AsyncResult<Category[]> | null>(null);

  const submit = useAsync(createListing);

  useEffect(() => {
    let active = true;

    getCategories(supabase).then((result) => {
      if (active) setCategories(result);
    });

    return () => {
      active = false;
    };
  }, []);

  // `undefined` leaves the field unbounded. It only becomes a number once the
  // price already has two decimals, and goes back to `undefined` the moment one
  // is deleted — so the cap never blocks correcting a price, only extending it.
  const priceMaxLength = /\.\d{2}$/.test(price) ? price.length : undefined;

  const isLoadingCategories = categories === null;
  const categoryOptions = toCategoryOptions(categories?.data ?? []);

  function reset() {
    setPhotos([]);
    setTitle("");
    setCondition(null);
    setPrice("");
    setPayments(["cash"]);
    setDescription("");
    setPickupHint("");
    setCategoryId(null);
    setTags([]);
    setProblem(null);
  }

  async function handleSubmit() {
    const found = validateListing({
      photoCount: photos.length,
      title,
      condition,
      price,
      acceptsCash: payments.includes("cash"),
      acceptsEtransfer: payments.includes("etransfer"),
      description,
      campus,
      pickupHint,
      categoryId,
    });

    setProblem(found);
    if (found !== null) return;

    const priceCents = parsePriceToCents(price);
    const sellerId = session?.user.id ?? null;

    // Narrowing, not a second check: `validateListing` has already refused each
    // of these, but TypeScript cannot see that through a `ListingProblem`.
    if (
      sellerId === null ||
      condition === null ||
      campus === null ||
      categoryId === null ||
      priceCents === null
    ) {
      return;
    }

    const trimmedHint = pickupHint.trim();

    const listing = await submit.run(
      supabase,
      {
        seller_id: sellerId,
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        price_cents: priceCents,
        condition,
        campus,
        // `null`, not `""`. The column is nullable and "no hint given" is not
        // the same fact as "an empty hint", which is what an empty string
        // would store.
        pickup_hint: trimmedHint === "" ? null : trimmedHint,
        accepts_cash: payments.includes("cash"),
        accepts_etransfer: payments.includes("etransfer"),
      },
      photos,
      tags,
    );

    if (listing === null) return;

    reset();
    Alert.alert("Posted", "Your listing is live.");
  }

  return (
    <View style={styles.screen}>
      {/* Pinned, not scrolled. Sits on the line the tab layout floats the
          profile control on, so the two read as one header row. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* A 44pt row, the same box the profile control occupies, so the title
            and the glyph share a centre line instead of being nudged into it. */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Upload Listing</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          // The tab bar is a floating pill, not a bar the screen sits above, so
          // nothing else keeps the submit button out from under it.
          // The tab pill is 64 tall and sits `insets.bottom + 8` off the
          // screen floor, so its top edge is at `insets.bottom + 72`. Anything
          // less than that hides the button behind it; this is that floor plus
          // 8 to breathe, and there is no room to take out below it.
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        // The floor. Without these the page rubber-bands on iOS and glows past
        // the end on Android, which reads as more whitespace under the button
        // than the layout actually has.
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.photos}>
          <PhotoPicker
            photos={photos}
            onChange={setPhotos}
            max={MAX_LISTING_PHOTOS}
            disabled={submit.isPending}
          />
          {problem?.field === "photos" ? <FieldError message={problem.message} /> : null}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Title</Text>
          <Field
            placeholder="What are you selling?"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            error={problem?.field === "title" ? problem.message : null}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Condition</Text>
          <ChipPicker
            options={CONDITION_OPTIONS}
            value={condition}
            onChange={setCondition}
            accessibilityLabel="Condition"
            scrollable
            disabled={submit.isPending}
          />
          {problem?.field === "condition" ? <FieldError message={problem.message} /> : null}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Price</Text>
          <Field
            placeholder="0.00"
            value={price}
            // Still clamped, because a PASTE can carry anything. Typing is
            // handled by `maxLength` below instead.
            onChangeText={(next) => setPrice(clampPriceInput(next))}
            keyboardType="decimal-pad"
            // The cap that stops the flicker. Once two decimals are present
            // this freezes at the current length, so the OS refuses the next
            // keystroke outright and no character is ever rendered then taken
            // back. Clamping in `onChangeText` alone cannot do that: the native
            // buffer has already accepted the character by the time JS sees it.
            maxLength={priceMaxLength}
            // Inside the pill, because "$" and "12.50" are one number. A label
            // above would make a screen reader cross a container to read it.
            leading={<Text style={styles.currency}>$</Text>}
            error={problem?.field === "price" ? problem.message : null}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Payment type</Text>
          <ChipToggles
            options={PAYMENT_OPTIONS}
            values={payments}
            onChange={setPayments}
            accessibilityLabel="Payment type"
            disabled={submit.isPending}
          />
          {problem?.field === "payment" ? <FieldError message={problem.message} /> : null}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Description</Text>
          <Field
            placeholder="Condition details, what's included, why you're selling it"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={4000}
            style={styles.description}
            error={problem?.field === "description" ? problem.message : null}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Campus</Text>
          <Select
            options={CAMPUS_OPTIONS}
            value={campus}
            onChange={setCampus}
            placeholder="Where will you hand it over?"
            label="Campus"
            disabled={submit.isPending}
          />
          {problem?.field === "campus" ? <FieldError message={problem.message} /> : null}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Meetup details (optional)</Text>
          <Field
            placeholder="Example: By the bus stop"
            value={pickupHint}
            onChangeText={setPickupHint}
            multiline
            maxLength={200}
            style={styles.meetup}
            error={problem?.field === "pickupHint" ? problem.message : null}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Category</Text>
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="What kind of thing is it?"
            label="Category"
            isLoading={isLoadingCategories}
            emptyMessage={categories?.error ?? "No categories available"}
            disabled={submit.isPending}
          />
          {problem?.field === "category" ? <FieldError message={problem.message} /> : null}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Tags (optional)</Text>
          <TagInput tags={tags} onChange={setTags} disabled={submit.isPending} />
        </View>

        <Button
          label="Upload Listing"
          onPress={() => void handleSubmit()}
          isPending={submit.isPending}
          style={styles.submit}
        />

        {/* Form-level, not field-level: a publish that failed partway is about
            the whole attempt, and it says whether the draft survived. */}
        {submit.error !== null ? <FieldError message={submit.error} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE_PAGE,
  },
  header: {
    paddingHorizontal: 24,
    // Separates the header row from the form rather than letting the first
    // control crowd the title and the account glyph beside it. With the photo
    // block's own 16 below this, the title clears the form by 40.
    paddingBottom: 16,
    // Opaque: the form scrolls underneath this.
    backgroundColor: SURFACE_PAGE,
  },
  titleRow: {
    // Exactly the profile control's height in (tabs)/_layout.tsx. If that 44
    // changes, this one has to change with it.
    height: 44,
    justifyContent: "center",
    // Clears the glyph, which floats at `right: 16` over every screen.
    paddingRight: 44,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: TEXT_PRIMARY,
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 24,
    // Was 16. Eight stacked controls at 16 read as one dense block; 24 is the
    // next step on the 4pt grid and lets each label own what is under it.
    gap: 24,
  },
  group: {
    width: "100%",
    gap: 8,
  },
  groupLabel: {
    // Every control is named above it now, including the two text fields —
    // a placeholder disappears the moment someone types into it.
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: TEXT_TERTIARY,
  },
  currency: {
    // Same size and weight as the input beside it, and deliberately NO
    // `lineHeight` — `Field` drops it for single-line inputs now, so setting
    // one here would reintroduce the mismatch from the other side.
    fontSize: 16,
    fontWeight: "400",
    // Android reserves space above and below a glyph by default; the input has
    // this switched off too, so both measure the same way.
    includeFontPadding: false,
    color: TEXT_TERTIARY,
  },
  meetup: {
    // Two lines rather than the description's four. Same squared-off box, so
    // the two read as the same kind of field at different weights — a meetup
    // note is a sentence, a description is a paragraph.
    minHeight: 64,
    borderRadius: 14,
  },
  description: {
    // Four lines of a 22pt line height, so the box looks like somewhere to
    // write rather than a title field that happens to wrap.
    minHeight: 112,
    // Squared off against the pills around it. A 999 radius on a box this tall
    // bows its sides inward and wastes the first and last line of width.
    borderRadius: 14,
  },
  photos: {
    // The first thing under a pinned header needs room the header cannot give
    // it. The gap below is the uniform 24, so it cannot balloon with the rest.
    marginTop: 16,
  },
  submit: {
    marginTop: 8,
  },
});
