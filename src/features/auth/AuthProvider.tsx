import * as SecureStore from "expo-secure-store";
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

type AuthContextValue = {
  credentials: NextcloudCredentials | null;
  hydrated: boolean;
  login: (credentials: NextcloudCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getClient: () => CookbookClient | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentials] = useState<NextcloudCredentials | null>(
    null
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(CREDENTIALS_KEY)
      .then((stored) => {
        if (stored) {
          setCredentials(JSON.parse(stored) as NextcloudCredentials);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const login = useCallback(async (nextCredentials: NextcloudCredentials) => {
    const serverUrl = normalizeNextcloudUrl(nextCredentials.serverUrl);
    assertSecureNextcloudUrl(serverUrl);

    const normalizedCredentials = {
      ...nextCredentials,
      serverUrl,
      username: nextCredentials.username.trim()
    };
    const client = new CookbookClient(normalizedCredentials);
    await client.getCapabilities();

    await SecureStore.setItemAsync(
      CREDENTIALS_KEY,
      JSON.stringify(normalizedCredentials),
      {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
      }
    );
    setCredentials(normalizedCredentials);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    setCredentials(null);
  }, []);

  const getClient = useCallback(() => {
    if (!credentials) {
      return null;
    }
    return new CookbookClient(credentials);
  }, [credentials]);

  const value = useMemo(
    () => ({ credentials, hydrated, login, logout, getClient }),
    [credentials, hydrated, login, logout, getClient]
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
