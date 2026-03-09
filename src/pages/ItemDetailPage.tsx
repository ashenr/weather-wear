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
import { ItemForm } from '../components/wardrobe/ItemForm'
import { getWardrobeItem, updateWardrobeItem, deleteWardrobeItem } from '../lib/wardrobe'
import { toaster } from '../components/ui/toaster'
import { useAuth } from '../contexts/AuthContext'
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

  const handleSave = async (values: ItemFormValues) => {
    if (!user || !id) return
    setIsSaving(true)
    try {
      await updateWardrobeItem(user.uid, id, values)
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
      />
    </Box>
  )
}
