import React from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle
} from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type TextFieldProps = TextInputProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  containerStyle,
  multiline,
  style,
  ...props
}: TextFieldProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            backgroundColor: colors.input,
            borderColor: colors.border,
            color: colors.text
          },
          style
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top"
  }
});
