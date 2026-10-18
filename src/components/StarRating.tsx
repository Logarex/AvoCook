import { Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { selectionFeedback } from "../features/accessibility/haptics";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type StarRatingProps = {
  rating: number; // 0 to 5
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (newRating: number) => void;
  showCount?: boolean;
  count?: number;
};

export function StarRating({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  showCount = false,
  count,
}: StarRatingProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  if (!interactive && showCount && count === 0)
    return (
      <AppText muted variant="caption">
        {t("ui.unrated")}
      </AppText>
    );

  return (
    <View
      accessible={!interactive}
      accessibilityLabel={
        !interactive
          ? `${rating.toFixed(1)} / 5 · ${t("community.voteCount", { count: count ?? 0 })}`
          : undefined
      }
      style={styles.container}
    >
      <View style={styles.starsRow}>
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = rating >= starValue;
          const isHalf = !isFilled && rating >= starValue - 0.5;

          const StarIcon = (
            <Star
              key={index}
              accessible={false}
              size={size}
              color={isFilled || isHalf ? colors.rating : colors.textMuted}
              fill={isFilled || isHalf ? colors.rating : "transparent"}
              strokeWidth={1.8}
            />
          );

          if (interactive && onRatingChange) {
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={t("ui.ratingLabel", { count: starValue })}
                accessibilityState={{ selected: rating === starValue }}
                onPress={() => {
                  selectionFeedback();
                  onRatingChange(starValue);
                }}
                style={({ pressed }) => [
                  styles.target,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                {StarIcon}
              </Pressable>
            );
          }

          return StarIcon;
        })}
      </View>
      {showCount && typeof count === "number" ? (
        <AppText muted variant="caption">
          ({count})
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  starsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  target: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
