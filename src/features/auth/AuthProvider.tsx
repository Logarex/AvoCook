import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { assertSecureNextcloudUrl, normalizeNextcloudUrl } from "../../utils/url";
import { logError, logInfo, normalizeLogError } from "../logging/appLogger";
import {
  CookbookClient,
  type NextcloudCredentials
} from "../nextcloud/cookbookClient";

const CREDENTIALS_KEY = "nextcloud.credentials";
const LOCAL_MODE_KEY = "auth.localMode";

type AuthContextValue = {
  credentials: NextcloudCredentials | null;
  isLocalMode: boolean;
  hydrated: boolean;
  login: (credentials: NextcloudCredentials) => Promise<void>;
  startLocalMode: () => Promise<void>;
  logout: () => Promise<void>;
  getClient: () => CookbookClient | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentials] = useState<NextcloudCredentials | null>(
    null
  );
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function loadAuth() {
      // Retry logic: on some Android devices, SecureStore may return null
      // before the keychain is fully ready after boot/unlock.
      const tryLoadCredentials = async (attempt: number): Promise<string | null> => {
        const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
        if (stored === null && attempt < 2) {
          // Brief delay then retry — covers race condition on Android
          await new Promise((resolve) => setTimeout(resolve, 350));
          return tryLoadCredentials(attempt + 1);
        }
        return stored;
      };

      try {
        const [stored, localMode] = await Promise.all([
          tryLoadCredentials(0),
          AsyncStorage.getItem(LOCAL_MODE_KEY)
        ]);
        if (stored) {
          setCredentials(JSON.parse(stored) as NextcloudCredentials);
        }
        setIsLocalMode(localMode === "true" && !stored);
      } catch (error) {
        logError("auth", "Failed to load auth state", error);
      } finally {
        setHydrated(true);
      }
    }
    void loadAuth();
  }, []);

  const login = useCallback(async (nextCredentials: NextcloudCredentials) => {
    const serverUrl = normalizeNextcloudUrl(nextCredentials.serverUrl);
    assertSecureNextcloudUrl(serverUrl);
    logInfo("auth", "Login started", {
      serverUrl,
      username: nextCredentials.username.trim()
    });

    const normalizedCredentials: NextcloudCredentials = {
      ...nextCredentials,
      serverUrl,
      username: nextCredentials.username.trim(),
      appPassword: nextCredentials.appPassword.replace(/\s+/g, "")
    };
    const client = new CookbookClient(normalizedCredentials);
    try {
      const user = await client.validateConnection();
      await client.getCapabilities().catch(() => undefined);
      if (user?.id?.trim()) {
        normalizedCredentials.userId = user.id.trim();
      }
      logInfo("auth", "Login connection validated", {
        serverUrl,
        username: normalizedCredentials.username,
        userId: normalizedCredentials.userId ?? null
      });
    } catch (error) {
      logError("auth", "Login failed", {
        serverUrl,
        username: normalizedCredentials.username,
        error: normalizeLogError(error)
      });
      throw error;
    }

    await SecureStore.setItemAsync(
      CREDENTIALS_KEY,
      JSON.stringify(normalizedCredentials),
      {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
      }
    );
    await AsyncStorage.setItem(LOCAL_MODE_KEY, "false");
    setIsLocalMode(false);
    setCredentials(normalizedCredentials);
    logInfo("auth", "Login credentials stored", {
      serverUrl,
      username: normalizedCredentials.username,
      userId: normalizedCredentials.userId ?? null
    });
  }, []);

  const startLocalMode = useCallback(async () => {
    logInfo("auth", "Local mode started");
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await AsyncStorage.setItem(LOCAL_MODE_KEY, "true");
    setCredentials(null);
    setIsLocalMode(true);
  }, []);

  const logout = useCallback(async () => {
    logInfo("auth", "Logout started");
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await AsyncStorage.setItem(LOCAL_MODE_KEY, "false");
    setCredentials(null);
    setIsLocalMode(false);
  }, []);

  const getClient = useCallback(() => {
    if (!credentials) {
      return null;
    }
    return new CookbookClient(credentials);
  }, [credentials]);

  const value = useMemo(
    () => ({
      credentials,
      isLocalMode,
      hydrated,
      login,
      startLocalMode,
      logout,
      getClient
    }),
    [credentials, isLocalMode, hydrated, login, startLocalMode, logout, getClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
