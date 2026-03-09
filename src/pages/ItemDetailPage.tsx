import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Heading,
  HStack,
  Portal,
  Spinner,
  Center,
  Text,
} from '@chakra-ui/react'
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { ItemForm } from '../components/wardrobe/ItemForm'
import { getWardrobeItem, updateWardrobeItem, deleteWardrobeItem } from '../lib/wardrobe'
import { toaster } from '../components/ui/toaster'
import { useAuth } from '../contexts/AuthContext'
import { storage } from '../lib/firebase'
import type { WardrobeItem } from '../types/wardrobe'
import type { ItemFormValues } from '../components/wardrobe/ItemForm'

export function ItemDetailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [item, setItem] = useState<WardrobeItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (!user || !id) return
    getWardrobeItem(user.uid, id)
      .then((result) => {
        setItem(result)
        setLoading(false)
      })
      .catch(() => {
        toaster.create({ title: 'Item not found', type: 'error' })
        navigate('/wardrobe')
      })
  }, [user, id, navigate])

  const uploadPhoto = (file: File, userId: string): Promise<{ photoUrl: string; photoPath: string }> => {
    return new Promise((resolve, reject) => {
      const path = `users/${userId}/wardrobe/${crypto.randomUUID()}/photo.jpg`
      const fileRef = storageRef(storage, path)
      const task = uploadBytesResumable(fileRef, file)
      task.on(
        'state_changed',
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => {
          const photoUrl = await getDownloadURL(task.snapshot.ref)
          resolve({ photoUrl, photoPath: path })
        },
      )
    })
  }

  const handleSave = async (values: ItemFormValues) => {
    if (!user || !id || !item) return
    setIsSaving(true)
    setUploadProgress(0)
    try {
      let photoUrl = item.photoUrl
      let photoPath = item.photoPath

      if (selectedPhotoFile) {
        // Upload new photo; old one will be cleaned up via photoPath in wardrobe lib on delete
        const result = await uploadPhoto(selectedPhotoFile, user.uid)
        photoUrl = result.photoUrl
        photoPath = result.photoPath
      } else if (photoRemoved) {
        // Delete old photo from storage if it exists
        if (item.photoPath) {
          try { await deleteObject(storageRef(storage, item.photoPath)) } catch { /* already gone */ }
        }
        photoUrl = ''
        photoPath = undefined
      }

      await updateWardrobeItem(user.uid, id, { ...values, photoUrl, photoPath })
      toaster.create({
        title: 'Item updated',
        description: `${values.name} has been saved.`,
        type: 'success',
      })
      navigate('/wardrobe')
    } catch {
      toaster.create({
        title: 'Failed to save',
        description: 'Could not update the item. Please try again.',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async () => {
    if (!user || !id || !item) return
    setIsDeleting(true)
    try {
      await deleteWardrobeItem(user.uid, id)
      toaster.create({
        title: 'Item deleted',
        description: `${item.name} has been removed from your wardrobe.`,
        type: 'info',
      })
      navigate('/wardrobe')
    } catch {
      toaster.create({
        title: 'Failed to delete',
        description: 'Could not delete the item. Please try again.',
        type: 'error',
      })
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <Center py={12}>
        <Spinner size="xl" />
      </Center>
    )
  }

  if (!item) {
    return (
      <Center py={12}>
        <Text color="fg.muted">Item not found.</Text>
      </Center>
    )
  }

  const defaultValues: ItemFormValues = {
    name: item.name,
    category: item.category,
    color: item.color,
    material: item.material,
    brand: item.brand,
    warmthLevel: item.warmthLevel,
    waterproof: item.waterproof,
    windproof: item.windproof,
    temperatureRange: item.temperatureRange,
    notes: item.notes,
  }

  return (
    <Box maxW="600px" mx="auto" px={4} py={6}>
      <HStack justify="space-between" mb={6}>
        <HStack gap={3}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/wardrobe')}>
            ← Back
          </Button>
          <Heading size="lg">Edit Item</Heading>
        </HStack>

        <Dialog.Root
          role="alertdialog"
          open={deleteOpen}
          onOpenChange={(e) => setDeleteOpen(e.open)}
        >
          <Dialog.Trigger asChild>
            <Button variant="outline" colorPalette="red" size="sm">
              Delete
            </Button>
          </Dialog.Trigger>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Delete Item</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  Are you sure you want to delete{' '}
                  <strong>{item.name}</strong>? This cannot be undone.
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </Dialog.ActionTrigger>
                  <Button
                    colorPalette="red"
                    loading={isDeleting}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </HStack>

      <ItemForm
        defaultValues={defaultValues}
        onSubmit={handleSave}
        isLoading={isSaving}
        submitLabel="Save Changes"
        existingPhotoUrl={item.photoUrl || undefined}
        onPhotoFileChange={(file) => {
          setSelectedPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
        uploadProgress={uploadProgress}
      />
    </Box>
  )
}
