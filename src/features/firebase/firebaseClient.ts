import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore
} from "firebase/firestore";
import {
  initializeAuth,
  // @ts-expect-error - getReactNativePersistence is provided by firebase/auth under react-native resolution
  getReactNativePersistence,
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User
} from "firebase/auth";
import { reinstallStorage } from "../storage/reinstallStorage";
import { getStorage, type FirebaseStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyC4oE9zYpcXeZjEL8qtvrzAD6oEjFca6G0",
  authDomain: "avocook-5eb31.firebaseapp.com",
  projectId: "avocook-5eb31",
  storageBucket: "avocook-5eb31.firebasestorage.app",
  messagingSenderId: "204779122565",
  appId: "1:204779122565:web:b85ff2a92fd734b1eddeec",
};

let _app: FirebaseApp;
let _db: Firestore;
let _auth: Auth;
let _storage: FirebaseStorage;
let _user: User | null = null;
let _authReady = false;
let _authReadyCallbacks: ((user: User | null) => void)[] = [];

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getApp());
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getStorage(getApp());
  }
  return _storage;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const app = getApp();
    try {
      _auth = initializeAuth(app, {
        persistence: getReactNativePersistence(reinstallStorage),
      });
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "auth/already-initialized") throw error;
      _auth = getAuth(app);
    }
  }
  return _auth;
}

let _initCalled = false;
let signInPromise: Promise<void> | null = null;

function settleAuth(user: User | null) {
  _user = user;
  _authReady = true;
  const callbacks = _authReadyCallbacks;
  _authReadyCallbacks = [];
  callbacks.forEach((callback) => callback(user));
}

function ensureAnonymousSignIn(auth: Auth) {
  if (signInPromise) return;
  _authReady = false;
  signInPromise = signInAnonymously(auth)
    .then((result) => settleAuth(result.user))
    .catch((error: unknown) => {
      console.warn("firebase", "Anonymous sign-in failed", error);
      settleAuth(null);
    })
    .finally(() => { signInPromise = null; });
}

export function initFirebaseAuth(): void {
  if (_initCalled) return;
  const auth = getFirebaseAuth();
  _initCalled = true;
  onAuthStateChanged(auth, (user) => {
    if (user) settleAuth(user);
    else {
      _user = null;
      ensureAnonymousSignIn(auth);
    }
  });
}

export function getCurrentUser(): User | null {
  return _user;
}

export function waitForAuth(timeoutMs = 15000): Promise<User | null> {
  initFirebaseAuth();
  if (_authReady && _user) return Promise.resolve(_user);
  if (_authReady && !signInPromise) ensureAnonymousSignIn(getFirebaseAuth());
  return new Promise((resolve) => {
    const callback = (user: User | null) => {
      clearTimeout(timeout);
      resolve(user);
    };
    const timeout = setTimeout(() => {
      _authReadyCallbacks = _authReadyCallbacks.filter((pending) => pending !== callback);
      resolve(null);
    }, timeoutMs);
    _authReadyCallbacks.push(callback);
  });
}

export function getAnonymousUid(): string | null {
  return _user?.uid ?? null;
}
