// childProfile.ts - works out the child's age from the date of birth saved at sign-up (Firestore users/{uid}).
// The age is sent to the speech/behaviour/handwriting backends with each prediction.
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

// ponytail: only date of birth is collected at sign-up; gender/native language are not, so callers keep their defaults for those until the profile asks for them.
const FALLBACK_AGE = 6;

// Remembers the age for the logged-in user so Firestore is only read once.
let cachedAge: { uid: string; age: number } | null = null;

/** Call after the date of birth changes so the next assessment uses the new age. */
export function clearChildAgeCache() {
  cachedAge = null;
}

// Converts a date-of-birth string to age in years (1 decimal), clamped to 3-10; null if invalid.
export function ageFromDob(dob: string, now: Date = new Date()): number | null {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const years = (now.getTime() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (!(years > 0)) return null;
  // The prediction APIs validate age within 3-10; clamp so a mistyped DOB doesn't reject a whole assessment.
  return Math.min(10, Math.max(3, Math.round(years * 10) / 10));
}

/** Child's age in years from users/{uid}.dateOfBirth; falls back to 6 when unknown. */
export async function getChildAge(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) return FALLBACK_AGE;
  if (cachedAge?.uid === uid) return cachedAge.age;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const age = snap.exists() ? ageFromDob(snap.data().dateOfBirth ?? "") : null;
    cachedAge = { uid, age: age ?? FALLBACK_AGE };
  } catch {
    return FALLBACK_AGE;
  }
  return cachedAge.age;
}
