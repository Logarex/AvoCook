import React from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle
} from "react-native";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type TextFieldProps = TextInputProps & {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
};

export function TextField({
  label,
  labelStyle,
  containerStyle,
  multiline,
  rightElement,
  style,
  ...props
}: TextFieldProps) {
  const { colors } = useAppTheme();
  
  const [internalValue, setInternalValue] = React.useState(props.value);
  
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
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
