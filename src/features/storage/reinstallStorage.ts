import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

type Manifest = { generation: string; chunks: number };
const secureOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const CHUNK_LENGTH = 500;
let pending: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = pending.then(task);
  pending = result.catch(() => undefined);
  return result;
}

function storageKey(key: string) {
  return `reinstall.${Array.from(key, (character) => character.codePointAt(0)!.toString(16)).join("-")}`;
}

async function readManifest(key: string): Promise<Manifest | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" ||
      !("generation" in value) || typeof value.generation !== "string" ||
      !/^[a-zA-Z0-9-]+$/.test(value.generation) ||
      !("chunks" in value) || !Number.isInteger(value.chunks) ||
      Number(value.chunks) < 0 || Number(value.chunks) > 1000) {
    throw new Error("Invalid persistent settings record");
  }
  return value as Manifest;
}

async function writeSecure(key: string, value: string | null) {
  const previous = await readManifest(key);
  const generation = Crypto.randomUUID();
  const characters = value === null ? [] : Array.from(value);
  const chunks = value === null ? 0 : Math.max(1, Math.ceil(characters.length / CHUNK_LENGTH));
  for (let index = 0; index < chunks; index += 1) {
    await SecureStore.setItemAsync(`${key}.${generation}.${index}`,
      characters.slice(index * CHUNK_LENGTH, (index + 1) * CHUNK_LENGTH).join(""), secureOptions);
  }
  await SecureStore.setItemAsync(key, JSON.stringify({ generation, chunks }), secureOptions);
  if (previous) {
    await Promise.all(Array.from({ length: previous.chunks }, (_, index) =>
      SecureStore.deleteItemAsync(`${key}.${previous.generation}.${index}`).catch(() => undefined)
    ));
  }
}

export const reinstallStorage = {
  getItem(key: string): Promise<string | null> {
    return serialize(async () => {
      if (!await SecureStore.isAvailableAsync()) return AsyncStorage.getItem(key);
      const secureKey = storageKey(key);
      const manifest = await readManifest(secureKey);
      if (manifest) {
        if (manifest.chunks === 0) return null;
        const chunks = await Promise.all(Array.from({ length: manifest.chunks }, (_, index) =>
          SecureStore.getItemAsync(`${secureKey}.${manifest.generation}.${index}`)
        ));
        if (chunks.some((chunk) => chunk === null)) throw new Error("Incomplete persistent settings record");
        return chunks.join("");
      }
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) await writeSecure(secureKey, legacy);
      return legacy;
    });
  },
  setItem(key: string, value: string): Promise<void> {
    return serialize(async () => {
      if (!await SecureStore.isAvailableAsync()) return AsyncStorage.setItem(key, value);
      await writeSecure(storageKey(key), value);
      await AsyncStorage.setItem(key, value).catch(() => undefined);
    });
  },
  removeItem(key: string): Promise<void> {
    return serialize(async () => {
      if (!await SecureStore.isAvailableAsync()) return AsyncStorage.removeItem(key);
      await writeSecure(storageKey(key), null);
      await AsyncStorage.removeItem(key).catch(() => undefined);
    });
  }
};
