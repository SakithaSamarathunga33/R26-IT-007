import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

// ponytail: only date of birth is collected at sign-up; gender/native language are not, so callers keep their defaults for those until the profile asks for them.
const FALLBACK_AGE = 6;

let cachedAge: { uid: string; age: number } | null = null;

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
