import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyAxlouY7WzbkBC-sg45KjaxlR3pWNaHLZI",
  authDomain: "lexiscan-app.firebaseapp.com",
  projectId: "lexiscan-app",
  storageBucket: "lexiscan-app.firebasestorage.app",
  messagingSenderId: "914058360542",
  appId: "1:914058360542:web:f73ffb7c783ae2170e744f",
  measurementId: "G-3PZV0T4LD5",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: Platform.OS === "web" ? indexedDBLocalPersistence : inMemoryPersistence,
});

export const db = getFirestore(app);
export const storage = getStorage(app, "gs://lexiscan-app.firebasestorage.app");

export default app;
