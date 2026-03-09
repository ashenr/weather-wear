import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Heading, HStack } from '@chakra-ui/react'
import { ItemForm } from '../components/wardrobe/ItemForm'
import { addWardrobeItem } from '../lib/wardrobe'
import { toaster } from '../components/ui/toaster'
import { useAuth } from '../contexts/AuthContext'
import type { ItemFormValues } from '../components/wardrobe/ItemForm'

export function AddItemPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (values: ItemFormValues) => {
    if (!user) return
    setIsLoading(true)
    try {
      await addWardrobeItem(user.uid, {
        ...values,
        photoUrl: '',
        sourceUrl: '',
        extractedByAI: false,
      })
      toaster.create({
        title: 'Item added',
        description: `${values.name} has been added to your wardrobe.`,
        type: 'success',
      })
      navigate('/wardrobe')
    } catch {
      toaster.create({
        title: 'Failed to save',
        description: 'Could not save the item. Please try again.',
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box maxW="600px" mx="auto" px={4} py={6}>
      <HStack mb={6} gap={3}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/wardrobe')}>
          ← Back
        </Button>
        <Heading size="lg">Add Wardrobe Item</Heading>
      </HStack>

      <ItemForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Add Item"
      />
    </Box>
  )
}
