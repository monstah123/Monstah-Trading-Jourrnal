import { Trade, JournalEntry, Playbook } from "@/types/trade";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Trades
export async function getTrades(userId: string): Promise<Trade[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, "trades"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Trade);
  } catch (error) {
    console.error("Error fetching trades:", error);
    return [];
  }
}

export async function saveTrade(userId: string, trade: Trade): Promise<void> {
  if (!userId) return;
  try {
    const docRef = doc(db, "trades", trade.id);
    const savePromise = setDoc(docRef, {
      ...trade,
      userId,
      updatedAt: new Date().toISOString(),
    });

    // Add a 30 second timeout for Firestore saves
    await Promise.race([
      savePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Save timed out")), 30000))
    ]);
  } catch (error) {
    console.error("Error saving trade:", error);
    throw error; // Throw so we can catch it in the UI
  }
}

export async function deleteTrade(userId: string, id: string): Promise<void> {
  if (!userId) return;
  try {
    await deleteDoc(doc(db, "trades", id));
  } catch (error) {
    console.error("Error deleting trade:", error);
  }
}

export async function getTradeById(
  userId: string,
  id: string,
): Promise<Trade | undefined> {
  if (!userId) return undefined;
  const trades = await getTrades(userId);
  return trades.find((t) => t.id === id);
}

// Journal
export async function getJournalEntries(
  userId: string,
): Promise<JournalEntry[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, "journals"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as JournalEntry);
  } catch (error) {
    console.error("Error fetching journals:", error);
    return [];
  }
}

export async function saveJournalEntry(
  userId: string,
  entry: JournalEntry,
): Promise<void> {
  if (!userId) return;
  try {
    const docRef = doc(db, "journals", entry.id);
    await setDoc(docRef, {
      ...entry,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving journal entry:", error);
  }
}

export async function deleteJournalEntry(
  userId: string,
  id: string,
): Promise<void> {
  if (!userId) return;
  try {
    await deleteDoc(doc(db, "journals", id));
  } catch (error) {
    console.error("Error deleting journal entry:", error);
  }
}

// Playbooks
export async function getPlaybooks(userId: string): Promise<Playbook[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, "playbooks"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Playbook);
  } catch (error) {
    console.error("Error fetching playbooks:", error);
    return [];
  }
}

export async function savePlaybook(
  userId: string,
  playbook: Playbook,
): Promise<void> {
  if (!userId) return;
  try {
    const docRef = doc(db, "playbooks", playbook.id);
    await setDoc(docRef, {
      ...playbook,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving playbook:", error);
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Upload Image with timeout and size check
export async function uploadImage(
  userId: string,
  file: File,
): Promise<string | null> {
  if (!userId || !file) return null;

  // Limit file size to 10MB to prevent extreme wait times
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    console.error("File is too large (max 10MB)");
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      const filename = `${generateId()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storageRef = ref(storage, `users/${userId}/screenshots/${filename}`);

      // Set a 120 second timeout for the upload (2 minutes)
      const timeoutId = setTimeout(() => {
        console.error("Upload timed out after 120 seconds");
        resolve(null);
      }, 120000);

      console.log(`Starting upload: ${filename} (${(file.size / 1024).toFixed(1)} KB)`);

      uploadBytes(storageRef, file)
        .then(async (snapshot) => {
          clearTimeout(timeoutId);
          console.log("Upload successful, fetching URL...");
          const url = await getDownloadURL(snapshot.ref);
          resolve(url);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error("Error during uploadBytes:", error);
          resolve(null);
        });
    } catch (error) {
      console.error("Error in uploadImage:", error);
      resolve(null);
    }
  });
}
