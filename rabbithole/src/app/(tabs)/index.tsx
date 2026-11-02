/*
 * Date: 2026-11-02
 * Discover -- the browse feed at "/", and the tab the app opens on.
 * Reads getListingFeed and renders it as a two-column grid of listing cards.
*/

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { FieldError } from "@/components/FieldError";
import { Select, type SelectOption } from "@/components/Select";
import { usePaged } from "@/lib/hooks";
import { getListingFeed } from "@/lib/queries/listings";
import { BUCKETS, publicUrl } from "@/lib/queries/storage";
import { supabase } from "@/lib/supabase";
import { formatCampus, formatCondition, formatPrice } from "@/lib/utils";
import { useSession } from "@/lib/verification";
import type { Campus, ListingSummary } from "@/types";

/** Page background. Also the pinned header, so cards do not show through it. */
const SURFACE_PAGE = "#F7F8FA";

/** Card and chip fill, against the grey page. */
const SURFACE_CARD = "#FFFFFF";

/** Sunken fill. The media box, and the skeleton's bars. */
const SURFACE_SUNKEN = "#EFF1F5";

/** Hairline. Just enough to separate a card from the page behind it. */
const HAIRLINE = "#E2E6ED";

/** Primary text. The screen title, card titles and prices. */
const TEXT_PRIMARY = "#12161D";

/** Secondary text. The empty state's sentence. */
const TEXT_SECONDARY = "#4C5566";

/** Tertiary text. The campus line, and an unsaved heart. */
const TEXT_TERTIARY = "#6B7688";

/** Placeholder grey. The inert search glyph, and the no-photo glyph. */
const PLACEHOLDER = "#9AA4B4";

/** The darkened brand blue a selected tab wears. A saved heart matches it. */
const BRAND_SELECTED = "#023b8b";

/** Page gutter, doubled, plus the 16pt column gap between two cards. */
const GRID_INSET = 64;

/** The campus filter's value. "all" is the default and means no narrowing. */
type CampusFilter = Campus | "all";

/** Campus order, as the Postgres enum declares it. */
const CAMPUSES: readonly Campus[] = [
  "nanaimo",
  "cowichan",
  "powell_river",
  "parksville_qualicum",
];

/*
* The campus filter's options: an "All campuses" entry, then one per campus.
* Labels come from formatCampus so this sheet and the card's campus line cannot
* disagree. create.tsx keeps its own list, because that one must NOT carry the
* "all" entry -- a listing is posted to exactly one campus.
*/
const CAMPUS_FILTER_OPTIONS: readonly SelectOption<CampusFilter>[] = [
  { value: "all", label: "All campuses" },
  ...CAMPUSES.map((campus) => ({ value: campus, label: formatCampus(campus) })),
];

/*
* Def: Discover
* Desc: The browse feed. Holds the campus filter, asks usePaged for a page of
* listings, and hands the result to FeedBody. Reads the session for one value,
* the viewer id the feed hides its own listings by.
* Return: the Discover screen.
*/
export default function Discover() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [campus, setCampus] = useState<CampusFilter>("all");

  /* `(tabs)` renders only inside <Stack.Protected guard={isSignedIn}> in
     src/app/_layout.tsx, behind BootScreen while the stored token is read, so
     `session` is already non-null by the time this mounts. viewerId therefore
     never changes mid-session, which is what makes it safe in the deps below. */
  const { session } = useSession();
  const viewerId = session?.user.id ?? null;

  /* usePaged returns { items, isLoading, isRefreshing, isLoadingMore, error,
     hasMore, loadMore, refresh }. Listing the filters as its deps is the whole
     refetch mechanism: changing one clears items, resets hasMore and sets page
     back to 0, and that page change is what re-runs the fetch.
     One object with explicit undefineds rather than a branch per filter, which
     was readable at one optional filter and is four cases at two. */
  const feed = usePaged(
    (page) =>
      getListingFeed(supabase, {
        page,
        campus: campus === "all" ? undefined : campus,
        excludeSellerId: viewerId ?? undefined,
      }),
    [campus, viewerId],
  );

  // Never flex: 1 on a card. With numColumns={2} an odd item count leaves one
  // card alone on the last row, and flex stretches it to the full width.
  const cardWidth = (width - GRID_INSET) / 2;

  return (
    <View style={styles.screen}>
      {/* Pinned, not scrolled. Sits on the line the tab layout floats the bell
          and the profile control on, so the three read as one header row. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Discover</Text>
        </View>

        {/* Pinned with the title: a filter you must scroll up to reach, on the
            screen whose job is filtering, is the wrong way round. */}
        <View style={styles.controls}>
          <Select
            // Outline to filled is how the tab bar signals selection, and it is
            // what keeps "a filter is on" from being colour alone.
            icon={campus === "all" ? "funnel-outline" : "funnel"}
            options={CAMPUS_FILTER_OPTIONS}
            value={campus}
            onChange={setCampus}
            label="Campus"
            placeholder="All campuses"
          />

          {/* Field's style prop lands on its inner pill, not its 100%-wide
              wrapper, so flexing it has to happen out here. */}
          <View style={styles.searchSlot}>
            <Field
              placeholder="Search listings"
              leading={
                <Ionicons name="search" size={18} color={styles.searchGlyph.color} />
              }
              // Inert until search is built. `editable` blocks the keyboard;
              // `accessible` stops a reader offering a field nobody can fill.
              editable={false}
              accessible={false}
            />
          </View>
        </View>
      </View>

      <FeedBody
        feed={feed}
        campus={campus}
        cardWidth={cardWidth}
        bottomInset={insets.bottom + 20}
        onShowAll={() => setCampus("all")}
        onPost={() => router.push("/create")}
      />
    </View>
  );
}

/** What {@link FeedBody} needs to pick a state and render it. */
interface FeedBodyProps {
  feed: ReturnType<typeof usePaged<ListingSummary>>;
  campus: CampusFilter;
  cardWidth: number;
  bottomInset: number;
  onShowAll: () => void;
  onPost: () => void;
}

/*
* Def: FeedBody
* Desc: Picks one of the states every data screen owes: loading, error, empty,
* or the grid. Branching here rather than through ListEmptyComponent lets the
* non-grid states share one centred layout. A refresh is the exception and
* stays inside the list, because unmounting the list takes the RefreshControl
* with it mid-gesture.
* Return: whichever state applies.
*/
function FeedBody({
  feed,
  campus,
  cardWidth,
  bottomInset,
  onShowAll,
  onPost,
}: FeedBodyProps) {
  if (feed.isLoading) return <FeedSkeleton cardWidth={cardWidth} />;

  // A refresh that started from an empty feed -- the error retry -- has no list
  // worth keeping mounted, so it gets the plain skeleton as well.
  if (feed.isRefreshing && feed.items.length === 0) {
    return <FeedSkeleton cardWidth={cardWidth} />;
  }

  // Only when nothing is on screen. A failure on page three keeps the pages
  // that worked and reports itself in the footer instead.
  if (feed.error !== null && feed.items.length === 0) {
    return (
      <View style={styles.state}>
        <FieldError message={feed.error} />
        <Button label="Try again" onPress={feed.refresh} style={styles.stateAction} />
      </View>
    );
  }

  if (feed.items.length === 0) {
    const isFiltered = campus !== "all";

    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>Nothing here yet</Text>
        <Text style={styles.stateBody}>
          {isFiltered
            ? "Nothing is listed on " + formatCampus(campus) + " right now."
            : "When students post textbooks and second-hand items, they will show up here."}
        </Text>
        <Button
          label={isFiltered ? "Show all campuses" : "Post a listing"}
          onPress={isFiltered ? onShowAll : onPost}
          style={styles.stateAction}
        />
      </View>
    );
  }

  return (
    <FlatList
      // Emptied for the length of a refresh so the skeleton stands in for the
      // rows. The list stays mounted either way, which is what keeps the
      // RefreshControl alive for the whole gesture.
      data={feed.isRefreshing ? [] : feed.items}
      keyExtractor={(listing) => listing.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.grid, { paddingBottom: bottomInset }]}
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefreshing}
          onRefresh={feed.refresh}
          tintColor={styles.refreshSpinner.color}
          colors={[styles.refreshSpinner.color]}
        />
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          // Resolved here, not in the card: publicUrl needs the client, and a
          // component reaching into queries/ is a screen wearing the wrong hat.
          imageUrl={publicUrl(
            supabase,
            BUCKETS.listingImages,
            item.primary_image?.storage_path ?? null,
          )}
          cardWidth={cardWidth}
          // Redundant once the feed is narrowed -- the filter glyph already
          // says which campus you are looking at.
          showCampus={campus === "all"}
        />
      )}
      ListEmptyComponent={
        feed.isRefreshing ? <FeedSkeleton cardWidth={cardWidth} /> : undefined
      }
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        feed.error !== null ? (
          <View style={styles.footer}>
            <FieldError message={feed.error} />
            <Button label="Try again" onPress={feed.refresh} style={styles.stateAction} />
          </View>
        ) : undefined
      }
    />
  );
}

/** What one feed card renders. */
interface ListingCardProps {
  listing: ListingSummary;
  /** Already resolved from `storage_path`, or `null` for a listing with no photo. */
  imageUrl: string | null;
  cardWidth: number;
  showCampus: boolean;
}

/*
* Def: ListingCard
* Desc: One listing in the grid: its photo, a condition chip, a saved heart,
* and the title and price along the bottom. Purely presentational -- it takes a
* resolved URL rather than reaching for the client. Local to this file until a
* second screen needs it, which is the Saved tab.
* Return: the card.
*/
function ListingCard({ listing, imageUrl, cardWidth, showCampus }: ListingCardProps) {
  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.media}>
        {imageUrl === null ? (
          <View
            style={styles.noPhoto}
            accessibilityRole="image"
            accessibilityLabel="No photo"
          >
            <Ionicons name="image-outline" size={28} color={styles.noPhotoGlyph.color} />
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.photo}
            contentFit="cover"
            // Without this a recycled cell shows the previous listing's photo
            // for a frame, which looks exactly like a bad query.
            recyclingKey={listing.id}
            // The title beneath names the item; the photo has no alt text a
            // seller could have written.
            accessible={false}
          />
        )}

        {/* White, not brand blue: blue on a card reads as "selected". White
            stays legible over a dark photo and a bright one alike. */}
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>{formatCondition(listing.condition)}</Text>
        </View>

        {/* Not a button -- it has no handler yet, and twenty announced buttons
            that do nothing is noise. Labelled only when it says something. */}
        <View
          style={styles.heart}
          accessible={listing.is_saved}
          accessibilityLabel={listing.is_saved ? "Saved" : undefined}
        >
          <Ionicons
            name={listing.is_saved ? "heart" : "heart-outline"}
            size={16}
            color={listing.is_saved ? styles.heartSaved.color : styles.heartGlyph.color}
          />
        </View>
      </View>

      <View style={styles.body}>
        {/* minHeight is two lines of 17/22, so a one-line and a two-line title
            keep the rows beneath them aligned across the pair. */}
        <View style={styles.titleLine}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {listing.title}
          </Text>
          {/* No flex: the title yields the space and ellipsizes instead. */}
          <Text numberOfLines={1} style={styles.price}>
            {formatPrice(listing.price_cents)}
          </Text>
        </View>

        {showCampus ? (
          <Text numberOfLines={1} style={styles.campus}>
            {formatCampus(listing.campus)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/*
* Def: FeedSkeleton
* Desc: The loading state, shaped like the grid rather than a centred spinner.
* Four cards in two rows, which is what fits above the fold -- a third row
* would render off-screen and cost code for nothing. Static: the house default
* is no animation. One label for the whole block, so a screen reader hears a
* sentence instead of four empty cards.
* Return: the placeholder grid.
*/
function FeedSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View
      style={styles.grid}
      accessible
      accessibilityLabel="Loading listings"
      accessibilityState={{ busy: true }}
    >
      {[0, 1].map((rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {[0, 1].map((columnIndex) => (
            <View
              key={columnIndex}
              style={[styles.card, { width: cardWidth }]}
              accessible={false}
            >
              <View style={styles.media} />
              <View style={styles.body}>
                <View style={styles.bar} />
                <View style={[styles.bar, styles.barShort]} />
              </View>
            </View>
          ))}
        </View>
      ))}
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
    paddingBottom: 16,
    // Opaque: the grid scrolls underneath this.
    backgroundColor: SURFACE_PAGE,
  },
  titleRow: {
    // The floating controls' height in (tabs)/_layout.tsx, so the title and the
    // glyphs share a centre line.
    height: 44,
    justifyContent: "center",
    // Clears the bell and the profile glyph: 44 per flush control. The
    // derivation is in create.tsx, which carries the same value.
    paddingRight: 88,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: TEXT_PRIMARY,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  searchSlot: {
    flex: 1,
  },
  refreshSpinner: {
    // Read by RefreshControl's `tintColor` and `colors` props. Tertiary, so the
    // spinner sits as far back as the skeleton it hands over to.
    color: TEXT_TERTIARY,
  },
  searchGlyph: {
    // Read by the `Ionicons` `color` prop. Placeholder grey: the glyph and the
    // invitation beside it are one thing.
    color: PLACEHOLDER,
  },
  grid: {
    paddingTop: 8,
    paddingHorizontal: 24,
    // Applies between the row wrappers, so this is the row gap.
    gap: 16,
  },
  row: {
    gap: 16,
  },
  card: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: HAIRLINE,
    // Clips the photo to the radius.
    overflow: "hidden",
  },
  media: {
    width: "100%",
    // Square rather than the stored ratio: numColumns aligns a row to its
    // tallest card, so varying ratios give ragged rows, not masonry.
    aspectRatio: 1,
    backgroundColor: SURFACE_SUNKEN,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  noPhoto: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  noPhotoGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: PLACEHOLDER,
  },
  chip: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: SURFACE_CARD,
  },
  chipLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    alignItems: "center",
    justifyContent: "center",
    // Under the 44pt floor, which is legal only while this has no handler. It
    // grows, or takes a hitSlop, the day saving works.
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: SURFACE_CARD,
  },
  heartGlyph: {
    // Read by the `Ionicons` `color` prop, not applied as a style.
    color: TEXT_TERTIARY,
  },
  heartSaved: {
    // Read by the `Ionicons` `color` prop. The tab bar's selected blue, so a
    // saved card and the Saved tab agree. Not the error red.
    color: BRAND_SELECTED,
  },
  body: {
    padding: 12,
    gap: 4,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    minHeight: 44,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  price: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  campus: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: TEXT_TERTIARY,
  },
  bar: {
    height: 14,
    borderRadius: 6,
    backgroundColor: SURFACE_SUNKEN,
  },
  barShort: {
    width: "60%",
  },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: TEXT_PRIMARY,
  },
  stateBody: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: TEXT_SECONDARY,
    marginTop: 8,
  },
  stateAction: {
    marginTop: 24,
  },
  footer: {
    alignItems: "center",
    paddingTop: 16,
  },
});
