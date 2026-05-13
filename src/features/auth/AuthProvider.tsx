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
    void Promise.all([
      SecureStore.getItemAsync(CREDENTIALS_KEY),
      AsyncStorage.getItem(LOCAL_MODE_KEY)
    ])
      .then(([stored, localMode]) => {
        if (stored) {
          setCredentials(JSON.parse(stored) as NextcloudCredentials);
        }
        setIsLocalMode(localMode === "true" && !stored);
      })
      .finally(() => setHydrated(true));
  }, []);

  const login = useCallback(async (nextCredentials: NextcloudCredentials) => {
    const serverUrl = normalizeNextcloudUrl(nextCredentials.serverUrl);
    assertSecureNextcloudUrl(serverUrl);

    const normalizedCredentials = {
      ...nextCredentials,
      serverUrl,
      username: nextCredentials.username.trim(),
      appPassword: nextCredentials.appPassword.replace(/\s+/g, "")
    };
    const client = new CookbookClient(normalizedCredentials);
    await client.validateConnection();
    await client.getCapabilities().catch(() => undefined);

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
  }, []);

  const startLocalMode = useCallback(async () => {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await AsyncStorage.setItem(LOCAL_MODE_KEY, "true");
    setCredentials(null);
    setIsLocalMode(true);
  }, []);

  const logout = useCallback(async () => {
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
