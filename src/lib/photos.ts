import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

export function uploadPhoto(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void,
): Promise<{ photoUrl: string; photoPath: string }> {
  return new Promise((resolve, reject) => {
    const path = `users/${userId}/wardrobe/${crypto.randomUUID()}/photo.jpg`
    const fileRef = storageRef(storage, path)
    const task = uploadBytesResumable(fileRef, file)
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const photoUrl = await getDownloadURL(task.snapshot.ref)
        resolve({ photoUrl, photoPath: path })
      },
    )
  })
}
