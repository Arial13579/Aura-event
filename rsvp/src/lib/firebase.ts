'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp | undefined;

// Local development against the Firebase emulators (npm run emulators)
const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === '1';

function getApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    if (useEmulator) {
      connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 8080);
      // Test helper: sign in as any Google account without the OAuth popup
      const a = app;
      (window as unknown as Record<string, unknown>).__emuSignIn = (email: string, name = email) =>
        signInWithCredential(getAuth(a), GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name })));
    }
  }
  return app;
}

export function auth(): Auth {
  return getAuth(getApp());
}

export function db(): Firestore {
  return getFirestore(getApp());
}
