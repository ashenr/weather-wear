import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ItemCard } from '../components/wardrobe/ItemCard'
import { getWardrobeItems } from '../lib/wardrobe'
import { useAuth } from '../contexts/AuthContext'
import type { WardrobeItem } from '../types/wardrobe'

export function WardrobePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getWardrobeItems(user.uid)
      .then(setItems)
      .catch(() => setError('Failed to load wardrobe items.'))
      .finally(() => setLoading(false))
  }, [user])

  return (
    <Box maxW="900px" mx="auto" px={4} py={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">My Wardrobe</Heading>
        <Button colorPalette="blue" onClick={() => navigate('/wardrobe/add')}>
          + Add Item
        </Button>
      </HStack>

      {error && <Text color="red.500">{error}</Text>}

      {loading ? (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height="140px" borderRadius="lg" />
          ))}
        </SimpleGrid>
      ) : items.length === 0 ? (
        <Center py={16}>
          <VStack gap={4}>
            <Text fontSize="lg" color="fg.muted">
              Your wardrobe is empty.
            </Text>
            <Text color="fg.muted" textAlign="center" maxW="sm">
              Add your jackets, sweaters, and accessories so Smart Display can
              make personalised clothing suggestions.
            </Text>
            <Button colorPalette="blue" onClick={() => navigate('/wardrobe/add')}>
              Add Your First Item
            </Button>
          </VStack>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => navigate(`/wardrobe/${item.id}`)}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  )
}
