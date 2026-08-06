import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";
import { useReducedMotion } from "../features/accessibility/useReducedMotion";
import { radius, spacing } from "../theme/colors";
import { useAppTheme } from "../theme/ThemeProvider";
import { AppText } from "./AppText";

type LongActionToast = {
  id: number;
  actionKey: string;
};

type LongActionToastContextValue = {
  watchLongAction: (actionKey: string) => () => void;
};

const LongActionToastContext =
  createContext<LongActionToastContextValue | null>(null);

const LONG_ACTION_DELAY_MS = 600;

export function LongActionToastProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<LongActionToast | null>(null);
  const nextToastIdRef = useRef(0);
  const delayTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const watchLongAction = useCallback((actionKey: string) => {
    const id = nextToastIdRef.current + 1;
    nextToastIdRef.current = id;

    const delayTimer = setTimeout(() => {
      delayTimersRef.current.delete(id);
      setToast({ id, actionKey });
    }, LONG_ACTION_DELAY_MS);
    delayTimersRef.current.set(id, delayTimer);

    return () => {
      const pendingDelayTimer = delayTimersRef.current.get(id);
      if (pendingDelayTimer) {
        clearTimeout(pendingDelayTimer);
        delayTimersRef.current.delete(id);
      }
      setToast((currentToast) =>
        currentToast?.id === id ? null : currentToast
      );
    };
  }, []);

  useEffect(
    () => () => {
      delayTimersRef.current.forEach(clearTimeout);
      delayTimersRef.current.clear();
    },
    []
  );

  const value = useMemo(() => ({ watchLongAction }), [watchLongAction]);

  return (
    <LongActionToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <LongActionToastOverlay toast={toast} />
      </View>
    </LongActionToastContext.Provider>
  );
}

export function useLongActionToast() {
  const value = useContext(LongActionToastContext);
  if (!value) {
    throw new Error(
      "useLongActionToast must be used inside LongActionToastProvider"
    );
  }
  return value;
}

function LongActionToastOverlay({
  toast
}: {
  toast: LongActionToast | null;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) {
      return;
    }

    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }

    opacity.setValue(0);
    Animated.timing(opacity, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [opacity, reducedMotion, toast]);

  if (!toast) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        StyleSheet.absoluteFill,
        styles.overlayWrap,
        {
          opacity,
          backgroundColor: "rgba(0, 0, 0, 0.4)"
        }
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.backgroundElevated,
            borderColor: colors.primary,
            shadowColor: colors.shadow
          }
        ]}
      >
        <ActivityIndicator color={colors.primary} size="small" />
        <AppText variant="body" style={styles.toastText}>
          {t("common.longActionNotice", { action: t(toast.actionKey) })}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  overlayWrap: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 24,
    paddingHorizontal: spacing.xl
  },
  toast: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    maxWidth: 400,
    width: "100%"
  },
  toastText: {
    flex: 1
  }
});
