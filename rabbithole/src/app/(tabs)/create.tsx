/**
 * Create screen — `/create`.
 *
 * Owns: the posting form, the values typed into it, the photos chosen for it,
 *   and what to show when one of them is wrong.
 * Does not own: saving anything. This pass assembles the row and logs it —
 *   `createListing` in `src/lib/queries/listings.ts` is where it will go, and it
 *   already takes exactly the shape built here. Nor what may be listed: the
 *   guidelines shown near the bottom are content policy, not this file's rule.
 *
 * A single scrolling form rather than a wizard. Every marketplace surveyed uses
 * one screen for a listing this short; step-by-step flows start appearing around
 * ten fields, where chunking buys something.
 *
 * It presents as an overlay — its own header, no tab header — but it is still a
 * tab route, which is deliberate. The tab bar has to stay mounted for "switch
 * tabs to leave" to work, and a real modal would cover it.
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { FieldError } from "@/components/FieldError";
import { Pill } from "@/components/Pill";
import { formatCondition, parsePriceToCents } from "@/lib/format";
import { getCategories } from "@/lib/queries/categories";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import {
  validateListing,
  type ListingDraft,
  type ListingFieldName,
  type ListingProblem,
} from "@/lib/validation";
import { useTheme } from "@/theme";
import type { Campus, Category, ListingCondition, TablesInsert } from "@/types";

/**
 * Photos per listing.
 *
 * Three is a product choice, not a schema one — `listing_images.position` has no
 * ceiling. Enough to show an item from more than one angle without turning the
 * form into an upload queue.
 */
const MAX_PHOTOS = 3;

/** The condition ladder, in the order the enum declares it. Labels come from `formatCondition`. */
const CONDITIONS: ListingCondition[] = ["new", "like_new", "good", "fair", "poor"];

/**
 * VIU's campuses, as stored values paired with their labels.
 *
 * Still hard-coded, and still for the same reason — they are a fact about the
 * university, and a `campuses` table to model four unchanging strings would be
 * schema for its own sake. What changed is where the value goes: campus is now
 * its own `NOT NULL` enum column that the Browse feed filters on, not a prefix
 * glued onto the front of `pickup_hint`.
 *
 * Typed against {@link Campus}, so adding a member to the database enum without
 * adding it here is a compile error rather than a campus nobody can pick.
 */
const CAMPUSES: { value: Campus; label: string }[] = [
  { value: "nanaimo", label: "Nanaimo" },
  { value: "cowichan", label: "Cowichan" },
  { value: "powell_river", label: "Powell River" },
  { value: "parksville_qualicum", label: "Parksville–Qualicum" },
];

/** The Create tab. */
export default function Create() {
  const { colors, spacing, radius, layout, typography } = useTheme();
  const router = useRouter();
  const { session } = useSession();

  const [form, setForm] = useState<ListingDraft>({
    title: "",
    price: "",
    categoryId: null,
    condition: null,
    campus: null,
    pickupHint: "",
    description: "",
  });

  // The chosen top-level category is tracked separately from the value that will
  // be stored. Only Textbooks has children, so for four of the five the two are
  // the same — but the parent is what decides whether a second row appears, and
  // deriving it back out of a possibly-child id every render is worse than
  // keeping it.
  const [parentId, setParentId] = useState<string | null>(null);

  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [problem, setProblem] = useState<ListingProblem | null>(null);

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] =
    ImagePicker.useMediaLibraryPermissions();

  // Scrolling to the field that is wrong needs to know where it is. Each section
  // reports its offset as it lays out; a ref rather than state because nothing
  // renders differently when one changes.
  const scrollRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Partial<Record<ListingFieldName, number>>>({});

  useEffect(() => {
    let active = true;

    getCategories(supabase).then(({ data, error }) => {
      // The screen can be left before the request lands, and setting state on a
      // gone component is a warning at best and a leak at worst.
      if (!active) return;
      if (error !== null) setCategoriesError(error);
      else setCategories(data);
    });

    return () => {
      active = false;
    };
  }, []);

  // Nothing is sent yet. `useAsync` wraps it anyway so the button's pending and
  // error handling is already correct when `createListing` replaces the body,
  // rather than being retrofitted around a working screen.
  const submit = useAsync(async (row: TablesInsert<"listings">) => {
    console.log("[create] listing ready to insert:", row);
    return { data: row, error: null };
  });

  const topLevel = categories?.filter((category) => category.parent_category_id === null) ?? [];
  const children =
    parentId === null
      ? []
      : (categories?.filter((category) => category.parent_category_id === parentId) ?? []);

  const hasContent =
    form.title !== "" ||
    form.price !== "" ||
    form.description !== "" ||
    form.pickupHint !== "" ||
    form.categoryId !== null ||
    form.condition !== null ||
    form.campus !== null ||
    photos.length > 0 ||
    video !== null;

  /** Update one field, and clear the current problem so a retry starts clean. */
  function updateField(patch: Partial<ListingDraft>) {
    setForm({ ...form, ...patch });
    setProblem(null);
    submit.clearError();
  }

  /**
   * Remember where a section sits, so a failed submit can scroll to it.
   *
   * Takes the value rather than returning a handler. A factory would have to be
   * *called* during render to produce each `onLayout`, which hands the ref to a
   * function at render time — the React Compiler rejects that, and rightly: a
   * ref read during render is a value the render cannot depend on.
   */
  function setOffset(field: ListingFieldName, y: number) {
    fieldOffsets.current[field] = y;
  }

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.navigate("/");
  }

  function handleClose() {
    if (!hasContent) {
      dismiss();
      return;
    }

    // Silently discarding typed content is the one thing every app in this
    // category agrees not to do. There is no draft to fall back on — the
    // `draft` listing status exists, but nothing writes it yet.
    Alert.alert("Discard this listing?", "What you've entered won't be saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: dismiss },
    ]);
  }

  async function addFromLibrary(kind: "images" | "videos") {
    if (libraryPermission?.granted !== true) {
      const granted = await requestLibraryPermission();
      if (!granted.granted) {
        Alert.alert(
          "Photo access is off",
          "Rabbithole needs access to your photos to add them to a listing. You can turn it on in Settings.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [kind],
      // Mutually exclusive with `allowsEditing` in SDK 57 — asking for both
      // silently drops one.
      allowsMultipleSelection: kind === "images",
      selectionLimit: kind === "images" ? MAX_PHOTOS - photos.length : 1,
    });
    if (result.canceled) return;

    if (kind === "videos") setVideo(result.assets[0] ?? null);
    else setPhotos([...photos, ...result.assets].slice(0, MAX_PHOTOS));
  }

  async function addFromCamera() {
    if (cameraPermission?.granted !== true) {
      const granted = await requestCameraPermission();
      if (!granted.granted) {
        Alert.alert(
          "Camera access is off",
          "Rabbithole needs your camera to take a photo for a listing. You can turn it on in Settings.",
        );
        return;
      }
    }

    // The OS camera rather than a `CameraView` of our own. A custom camera
    // screen buys a bespoke shutter and nothing else here.
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"] });
    if (result.canceled) return;

    setPhotos([...photos, ...result.assets].slice(0, MAX_PHOTOS));
  }

  function handleAddPhoto() {
    Alert.alert("Add a photo", undefined, [
      { text: "Take photo", onPress: addFromCamera },
      { text: "Choose from library", onPress: () => addFromLibrary("images") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handlePublish() {
    // Always tappable, then validated — a permanently disabled button on a form
    // this tall tells the user nothing about which field is still missing, and
    // the missing one is usually scrolled off screen.
    const found = validateListing(form);
    if (found !== null) {
      setProblem(found);
      scrollRef.current?.scrollTo({
        y: Math.max(0, (fieldOffsets.current[found.field] ?? 0) - spacing.xl),
        animated: true,
      });
      return;
    }

    if (!session) return;

    // Non-null: `validateListing` already rejected an unparseable or absent
    // price, and a null category or condition, so these three are settled.
    const priceCents = parsePriceToCents(form.price) as number;

    // No longer prefixed with the campus. That was a workaround for campus
    // having nowhere to live; it now has its own column, and duplicating it
    // into the free-text line would put the same fact in two places that can
    // disagree after an edit.
    const pickupHint = form.pickupHint.trim();

    await submit.run({
      seller_id: session.user.id,
      category_id: form.categoryId as string,
      title: form.title.trim(),
      description: form.description.trim(),
      price_cents: priceCents,
      condition: form.condition as ListingCondition,
      campus: form.campus as Campus,
      pickup_hint: pickupHint === "" ? null : pickupHint,
    });

    dismiss();
  }

  // 4:3, the same ratio a feed card uses, derived from the token rather than
  // written as a pair of literals so the two cannot drift.
  const tileHeight = spacing.xxxl * 2;
  const tileWidth = tileHeight * layout.listingAspectRatio;

  const tileStyle = {
    width: tileWidth,
    height: tileHeight,
    borderRadius: radius.md,
    borderWidth: layout.borderWidth,
    // Required, not decorative: a photo shot against a white wall bleeds
    // straight into a white surface and the tile loses its edge.
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  };

  return (
    <KeyboardAvoidingView
      // Android resizes the window itself; adding padding on top of that pushes
      // the form up twice.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: layout.screenPaddingX,
            paddingVertical: spacing.sm,
            borderBottomWidth: layout.borderWidth,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={layout.hitSlop}
          style={{ width: layout.tapTargetMin, height: layout.tapTargetMin, justifyContent: "center" }}
        >
          <Ionicons name="close" size={26} color={colors.text.primary} />
        </Pressable>

        <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>New listing</Text>

        <Button
          variant="ghost"
          label="Publish"
          onPress={handlePublish}
          isPending={submit.isPending}
          style={{ width: layout.tapTargetMin + spacing.lg, alignItems: "flex-end" }}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingX,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photos first: the highest-friction step, and the thing a buyer
            actually identifies the item by. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {photos.map((photo, index) => (
            <View key={photo.assetId ?? photo.uri} style={tileStyle}>
              <Image
                source={{ uri: photo.uri }}
                style={[styles.fill, { borderRadius: radius.md }]}
                contentFit="cover"
                accessibilityLabel={
                  index === 0 ? "Cover photo for this listing" : `Listing photo ${index + 1}`
                }
              />

              {index === 0 ? (
                <View
                  style={[
                    styles.coverBadge,
                    {
                      margin: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.sm,
                      backgroundColor: colors.overlay,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.text.inverse }]}>Cover</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => setPhotos(photos.filter((_, at) => at !== index))}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                hitSlop={layout.hitSlop}
                style={[
                  styles.removeButton,
                  {
                    width: spacing.xl,
                    height: spacing.xl,
                    margin: spacing.xs,
                    borderRadius: radius.pill,
                    backgroundColor: colors.overlay,
                  },
                ]}
              >
                <Ionicons name="close" size={16} color={colors.text.inverse} />
              </Pressable>
            </View>
          ))}

          {photos.length < MAX_PHOTOS ? (
            <Pressable
              onPress={handleAddPhoto}
              accessibilityRole="button"
              accessibilityLabel="Add a photo"
              style={[tileStyle, styles.centered]}
            >
              <Ionicons name="camera-outline" size={24} color={colors.text.secondary} />
              <Text
                style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.xs }]}
              >
                Add photo
              </Text>
            </Pressable>
          ) : null}

          {video === null ? (
            <Pressable
              onPress={() => addFromLibrary("videos")}
              accessibilityRole="button"
              accessibilityLabel="Add a video, optional"
              style={[tileStyle, styles.centered]}
            >
              <Ionicons name="videocam-outline" size={24} color={colors.text.secondary} />
              <Text
                style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.xs }]}
              >
                Video
              </Text>
            </Pressable>
          ) : (
            <View style={[tileStyle, styles.centered]}>
              <Ionicons name="videocam" size={24} color={colors.text.primary} />
              <Pressable
                onPress={() => setVideo(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove video"
                hitSlop={layout.hitSlop}
                style={[
                  styles.removeButton,
                  {
                    width: spacing.xl,
                    height: spacing.xl,
                    margin: spacing.xs,
                    borderRadius: radius.pill,
                    backgroundColor: colors.overlay,
                  },
                ]}
              >
                <Ionicons name="close" size={16} color={colors.text.inverse} />
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Count, not a rule. Photos are encouraged and never required — plenty
            of cheap listings legitimately have none. */}
        <Text
          style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.sm }]}
        >
          {photos.length}/{MAX_PHOTOS} photos{video !== null ? " · 1 video" : ""}
        </Text>

        <SectionLabel onLayout={(event) => setOffset("title", event.nativeEvent.layout.y)}>Title</SectionLabel>
        <Field
          value={form.title}
          onChangeText={(title) => updateField({ title })}
          placeholder="What are you selling?"
          accessibilityLabel="Listing title"
          error={problem?.field === "title" ? problem.message : null}
        />

        <SectionLabel onLayout={(event) => setOffset("price", event.nativeEvent.layout.y)}>Price</SectionLabel>
        <Field
          value={form.price}
          onChangeText={(price) => updateField({ price })}
          placeholder="0"
          keyboardType="decimal-pad"
          accessibilityLabel="Price in dollars"
          error={problem?.field === "price" ? problem.message : null}
          trailing={
            <Text style={[typography.subhead, { color: colors.text.secondary }]}>CAD</Text>
          }
          inputStyle={{ paddingLeft: spacing.md }}
        />
        <Text
          style={[typography.footnote, { color: colors.text.secondary, marginTop: spacing.xs }]}
        >
          Enter 0 if you&rsquo;re giving it away — it will show as &ldquo;Free&rdquo;.
        </Text>

        <SectionLabel onLayout={(event) => setOffset("category", event.nativeEvent.layout.y)}>Category</SectionLabel>
        {categoriesError !== null ? (
          <FieldError message={categoriesError} />
        ) : categories === null ? (
          <Text style={[typography.footnote, { color: colors.text.secondary }]}>
            Loading categories&hellip;
          </Text>
        ) : (
          <>
            <View style={[styles.pillRow, { gap: spacing.sm }]}>
              {topLevel.map((category) => (
                <Pill
                  key={category.id}
                  label={category.name}
                  isSelected={parentId === category.id}
                  onPress={() => {
                    setParentId(category.id);
                    // Storing the parent immediately means a category with no
                    // children is complete in one tap, and a subject chosen
                    // afterwards simply narrows it.
                    updateField({ categoryId: category.id });
                  }}
                />
              ))}
            </View>

            {children.length > 0 ? (
              <View style={[styles.pillRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
                {children.map((category) => (
                  <Pill
                    key={category.id}
                    label={category.name}
                    isSelected={form.categoryId === category.id}
                    onPress={() => updateField({ categoryId: category.id })}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
        {problem?.field === "category" ? <FieldError message={problem.message} /> : null}

        <SectionLabel onLayout={(event) => setOffset("condition", event.nativeEvent.layout.y)}>Condition</SectionLabel>
        <View style={[styles.pillRow, { gap: spacing.sm }]}>
          {CONDITIONS.map((condition) => (
            <Pill
              key={condition}
              label={formatCondition(condition)}
              isSelected={form.condition === condition}
              onPress={() => updateField({ condition })}
            />
          ))}
        </View>
        {problem?.field === "condition" ? <FieldError message={problem.message} /> : null}

        <SectionLabel onLayout={(event) => setOffset("campus", event.nativeEvent.layout.y)}>Pickup</SectionLabel>
        <View style={[styles.pillRow, { gap: spacing.sm }]}>
          {CAMPUSES.map(({ value, label }) => (
            <Pill
              key={value}
              label={label}
              isSelected={form.campus === value}
              // No longer clears on a second tap. Campus used to be optional
              // decoration on the pickup note; it is now required, so a way
              // back to "none" is a way back to a state that cannot be posted.
              onPress={() => updateField({ campus: value })}
            />
          ))}
        </View>
        {problem?.field === "campus" ? <FieldError message={problem.message} /> : null}
        <Field
          value={form.pickupHint}
          onChangeText={(pickupHint) => updateField({ pickupHint })}
          onLayout={(event) => setOffset("pickupHint", event.nativeEvent.layout.y)}
          placeholder="Where on campus? e.g. Bldg 356 main entrance"
          accessibilityLabel="Pickup details"
          error={problem?.field === "pickupHint" ? problem.message : null}
          style={{ marginTop: spacing.sm }}
        />

        <SectionLabel onLayout={(event) => setOffset("description", event.nativeEvent.layout.y)}>Description</SectionLabel>
        <Field
          value={form.description}
          onChangeText={(description) => updateField({ description })}
          placeholder="Condition details, what's included, why you're selling."
          accessibilityLabel="Description"
          multiline
          error={problem?.field === "description" ? problem.message : null}
          style={{ minHeight: spacing.xxxl * 2, borderRadius: radius.lg }}
          inputStyle={styles.multiline}
        />

        {/*
          Stated, not linked. `design-rules.md` requires the Create flow to show
          what may not be listed before submission rather than burying it in a
          terms page nobody opens.
        */}
        <View
          style={{
            marginTop: spacing.xl,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceSunken,
          }}
        >
          <Text style={[typography.caption, { color: colors.text.primary }]}>
            What you can&rsquo;t list
          </Text>
          <Text
            style={[typography.footnote, { color: colors.text.secondary, marginTop: spacing.xs }]}
          >
            Alcohol, cannabis and vapes, weapons, prescription medication, live animals, recalled
            goods, and anything supporting academic dishonesty — including completed assignments,
            essay writing, and exam material.
          </Text>
        </View>

        {submit.error !== null ? <FieldError message={submit.error} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * The label above a field or pill row.
 *
 * Local to this screen on purpose — it is one styled `Text`, and the components
 * README is explicit that something used once stays where it is used.
 */
function SectionLabel({
  children,
  onLayout,
}: {
  children: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Text
      onLayout={onLayout}
      style={[
        typography.caption,
        { color: colors.text.secondary, marginTop: spacing.xl, marginBottom: spacing.sm },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fill: {
    width: "100%",
    height: "100%",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  coverBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  removeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  multiline: {
    // A multiline input aligns its text to the vertical centre by default on
    // Android, which looks wrong in a box that grows downward.
    textAlignVertical: "top",
  },
});
