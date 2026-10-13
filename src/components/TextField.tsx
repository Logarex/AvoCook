import React from "react";
import {
  StyleProp,
  StyleSheet,
  Pressable,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle
} from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";
import { MarkdownText } from "./MarkdownText";
import { hasBlockMarkdown, markdownToPlainText } from "../features/markdown/markdown";
import { useTranslation } from "react-i18next";

type TextFieldProps = TextInputProps & {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
  markdown?: boolean;
};

export function TextField({
  label,
  labelStyle,
  containerStyle,
  multiline,
  rightElement,
  style,
  markdown = false,
  ...props
}: TextFieldProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [preview, setPreview] = React.useState(false);
  
  const [internalValue, setInternalValue] = React.useState(props.value);
  const hasMarkdown = React.useMemo(() => markdown && !!internalValue &&
    (hasBlockMarkdown(internalValue) || markdownToPlainText(internalValue) !== internalValue), [markdown, internalValue]);
  
  React.useEffect(() => {
    setInternalValue(props.value);
  }, [props.value]);

  const handleChangeText = (text: string) => {
    setInternalValue(text);
    props.onChangeText?.(text);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="label" style={labelStyle}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.inputWrap}>
        <TextInput
          {...props}
          value={props.value !== undefined ? internalValue : undefined}
          onChangeText={handleChangeText}
          accessibilityLabel={props.accessibilityLabel ?? label}
          multiline={multiline}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          style={[
            styles.input,
            multiline ? styles.multiline : null,
            rightElement ? styles.inputWithRightElement : null,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.text
            },
            style
          ]}
        />
        {rightElement ? (
          <View style={styles.rightElement}>{rightElement}</View>
        ) : null}
      </View>
      {hasMarkdown ? (
        <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: preview }}
            accessibilityLabel={`${t(preview ? "editor.markdownHidePreview" : "editor.markdownPreview")}: ${label}`}
            onPress={() => setPreview((current) => !current)} style={styles.previewButton}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              {t(preview ? "editor.markdownHidePreview" : "editor.markdownPreview")}
            </AppText>
          </Pressable>
          {preview ? <MarkdownText>{internalValue || ""}</MarkdownText> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  previewButton: { minHeight: 32, justifyContent: "center", alignSelf: "flex-start" },
  inputWrap: {
    justifyContent: "center"
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputWithRightElement: {
    paddingRight: 54
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  rightElement: {
    position: "absolute",
    right: spacing.xs
  }
});
