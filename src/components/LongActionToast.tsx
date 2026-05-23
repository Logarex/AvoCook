import { Clock3 } from "lucide-react-native";
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
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const LONG_ACTION_DELAY_MS = 1800;
const LONG_ACTION_VISIBLE_MS = 5600;

export function LongActionToastProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<LongActionToast | null>(null);
  const nextToastIdRef = useRef(0);
  const delayTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const hideTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const watchLongAction = useCallback((actionKey: string) => {
    const id = nextToastIdRef.current + 1;
    nextToastIdRef.current = id;

    const delayTimer = setTimeout(() => {
      delayTimersRef.current.delete(id);
      setToast({ id, actionKey });

      const hideTimer = setTimeout(() => {
        hideTimersRef.current.delete(id);
        setToast((currentToast) =>
          currentToast?.id === id ? null : currentToast
        );
      }, LONG_ACTION_VISIBLE_MS);
      hideTimersRef.current.set(id, hideTimer);
    }, LONG_ACTION_DELAY_MS);
    delayTimersRef.current.set(id, delayTimer);

    return () => {
      const pendingDelayTimer = delayTimersRef.current.get(id);
      if (pendingDelayTimer) {
        clearTimeout(pendingDelayTimer);
        delayTimersRef.current.delete(id);
      }
    };
  }, []);

  useEffect(
    () => () => {
      delayTimersRef.current.forEach(clearTimeout);
      hideTimersRef.current.forEach(clearTimeout);
      delayTimersRef.current.clear();
      hideTimersRef.current.clear();
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
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!toast) {
      return;
    }

    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, reducedMotion, toast, translateY]);

  if (!toast) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.toastWrap,
        {
          opacity,
          bottom: Math.max(insets.bottom, spacing.sm) + 76,
          transform: [{ translateY }]
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
        <Clock3 color={colors.primaryStrong} size={18} strokeWidth={2.7} />
        <AppText variant="caption" style={styles.toastText}>
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
  toastWrap: {
    alignItems: "center",
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    zIndex: 50,
    elevation: 12
  },
  toast: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 520,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    width: "100%"
  },
  toastText: {
    flex: 1
  }
});
