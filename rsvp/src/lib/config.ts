export const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL || 'arielkahalani1@gmail.com').trim().toLowerCase();

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
