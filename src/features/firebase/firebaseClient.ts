import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User
} from "firebase/auth";

// ─── Config ───────────────────────────────────────────────────────────────────
// These are public client-side keys — security is enforced by Firestore rules.

const firebaseConfig = {
  apiKey: "AIzaSyC4oE9zYpcXeZjEL8qtvrzAD6oEjFca6G0",
  authDomain: "avocook-5eb31.firebaseapp.com",
  projectId: "avocook-5eb31",
  storageBucket: "avocook-5eb31.firebasestorage.app",
  messagingSenderId: "204779122565",
  appId: "1:204779122565:web:b85ff2a92fd734b1eddeec",
};

// ─── Singleton ────────────────────────────────────────────────────────────────

let _app: FirebaseApp;
let _db: Firestore;
let _auth: Auth;
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

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getApp());
  }
  return _auth;
}

// ─── Anonymous auth ────────────────────────────────────────────────────────────
// Each device gets a stable anonymous UID. No email/password/account required.

export function initFirebaseAuth(): void {
  const auth = getFirebaseAuth();
  onAuthStateChanged(auth, (user) => {
    void (async () => {
      if (user) {
        _user = user;
        _authReady = true;
        _authReadyCallbacks.forEach((cb) => cb(user));
        _authReadyCallbacks = [];
      } else {
        // Not signed in → sign in anonymously
        try {
          const result = await signInAnonymously(auth);
          _user = result.user;
          _authReady = true;
          _authReadyCallbacks.forEach((cb) => cb(result.user));
          _authReadyCallbacks = [];
        } catch (error) {
          console.warn("firebase", "Anonymous sign-in failed", error);
          _authReady = true;
          _authReadyCallbacks.forEach((cb) => cb(null));
          _authReadyCallbacks = [];
        }
      }
    })();
  });
}

export function getCurrentUser(): User | null {
  return _user;
}

/**
 * Returns a promise that resolves once Firebase auth is initialized.
 * Use this before any Firestore call that requires auth.
 */
export function waitForAuth(): Promise<User | null> {
  if (_authReady) return Promise.resolve(_user);
  return new Promise((resolve) => {
    _authReadyCallbacks.push(resolve);
  });
}

export function getAnonymousUid(): string | null {
  return _user?.uid ?? null;
}
