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
import { normalizeNextcloudUrl } from "../../utils/url";

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
      // SecureStore can return null briefly after Android boot or unlock.
      const tryLoadCredentials = async (attempt: number): Promise<string | null> => {
        const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
        if (stored === null && attempt < 2) {
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
          const parsed = JSON.parse(stored) as NextcloudCredentials | null;
          if (!parsed || typeof parsed.serverUrl !== "string" ||
              typeof parsed.username !== "string" || typeof parsed.appPassword !== "string") {
            throw new Error("Invalid stored Nextcloud credentials");
          }
          setCredentials({
            ...parsed,
            serverUrl: normalizeNextcloudUrl(parsed.serverUrl),
            userId: typeof parsed.userId === "string" ? parsed.userId : undefined
          });
        }
        setIsLocalMode(localMode === "true" && !stored);
      } catch (error) {
        console.error("auth", "Failed to load auth state", error);
      } finally {
        setHydrated(true);
      }
    }
    void loadAuth();
  }, []);

  const login = useCallback(async (nextCredentials: NextcloudCredentials) => {
    const serverUrl = normalizeNextcloudUrl(nextCredentials.serverUrl);
    console.info("auth", "Login started", {
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
      console.info("auth", "Login connection validated", {
        serverUrl,
        username: normalizedCredentials.username,
        userId: normalizedCredentials.userId ?? null
      });
    } catch (error) {
      console.error("auth", "Login failed", {
        serverUrl,
        username: normalizedCredentials.username,
        error
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
    await AsyncStorage.removeItem("recipes.firstSyncCompleted");
    setIsLocalMode(false);
    setCredentials(normalizedCredentials);
    console.info("auth", "Login credentials stored", {
      serverUrl,
      username: normalizedCredentials.username,
      userId: normalizedCredentials.userId ?? null
    });
  }, []);

  const startLocalMode = useCallback(async () => {
    console.info("auth", "Local mode started");
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await AsyncStorage.setItem(LOCAL_MODE_KEY, "true");
    CookbookClient.setCurrent(null);
    setCredentials(null);
    setIsLocalMode(true);
  }, []);

  const logout = useCallback(async () => {
    console.info("auth", "Logout started");
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await AsyncStorage.setItem(LOCAL_MODE_KEY, "false");
    await AsyncStorage.removeItem("recipes.firstSyncCompleted");
    setCredentials(null);
    CookbookClient.setCurrent(null);
    setIsLocalMode(false);
  }, []);

  const clientInstance = useMemo(() => {
    const client = credentials ? new CookbookClient(credentials) : null;
    CookbookClient.setCurrent(client);
    return client;
  }, [credentials]);

  const getClient = useCallback(() => {
    return clientInstance;
  }, [clientInstance]);

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
