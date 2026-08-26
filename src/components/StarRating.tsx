import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";
import { AppText } from "./AppText";
import { spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";

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
  count
}: StarRatingProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = rating >= starValue;
          const isHalf = !isFilled && rating >= starValue - 0.5;

          const StarIcon = (
            <Star
              key={index}
              size={size}
              color={isFilled || isHalf ? "#FFB800" : colors.textMuted}
              fill={isFilled ? "#FFB800" : isHalf ? "#FFB800" : "transparent"}
              strokeWidth={1.8}
            />
          );

          if (interactive && onRatingChange) {
            return (
              <Pressable
                key={index}
                onPress={() => onRatingChange(starValue)}
                hitSlop={4}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
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
    gap: spacing.xs
  },
  starsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3
  }
});
