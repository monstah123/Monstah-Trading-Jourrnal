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
    await setDoc(docRef, {
      ...trade,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving trade:", error);
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

// Upload Image
export async function uploadImage(
  userId: string,
  file: File,
): Promise<string | null> {
  if (!userId || !file) return null;
  try {
    const filename = `${generateId()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storageRef = ref(storage, `users/${userId}/screenshots/${filename}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}
