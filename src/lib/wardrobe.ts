import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { WardrobeItem, WardrobeItemInput } from '../types/wardrobe'

export async function addWardrobeItem(
  userId: string,
  item: WardrobeItemInput
): Promise<string> {
  const ref = collection(db, 'users', userId, 'wardrobe')
  const docRef = await addDoc(ref, {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWardrobeItem(
  userId: string,
  itemId: string,
  updates: Partial<WardrobeItemInput>
): Promise<void> {
  const ref = doc(db, 'users', userId, 'wardrobe', itemId)
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWardrobeItem(
  userId: string,
  itemId: string
): Promise<void> {
  const ref = doc(db, 'users', userId, 'wardrobe', itemId)
  await deleteDoc(ref)
}

export async function getWardrobeItems(userId: string): Promise<WardrobeItem[]> {
  const ref = collection(db, 'users', userId, 'wardrobe')
  const snap = await getDocs(ref)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WardrobeItem))
}

export async function getWardrobeItem(
  userId: string,
  itemId: string
): Promise<WardrobeItem | null> {
  const ref = doc(db, 'users', userId, 'wardrobe', itemId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as WardrobeItem
}
