import { useEffect, useMemo, useState } from 'react'
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
import { FilterBar, type SortOption } from '../components/wardrobe/FilterBar'
import { getWardrobeItems } from '../lib/wardrobe'
import { useAuth } from '../contexts/AuthContext'
import type { WardrobeItem } from '../types/wardrobe'

export function WardrobePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<SortOption>('recent')

  useEffect(() => {
    if (!user) return
    getWardrobeItems(user.uid)
      .then(setItems)
      .catch(() => setError('Failed to load wardrobe items.'))
      .finally(() => setLoading(false))
  }, [user])

  const filteredItems = useMemo(() => {
    let result = [...items]

    if (category !== 'all') {
      result = result.filter((item) => item.category === category)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.material.toLowerCase().includes(q) ||
          item.notes.toLowerCase().includes(q),
      )
    }

    switch (sort) {
      case 'recent':
        result.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'warmth':
        result.sort((a, b) => b.warmthLevel - a.warmthLevel)
        break
      case 'category':
        result.sort((a, b) => a.category.localeCompare(b.category))
        break
    }

    return result
  }, [items, search, category, sort])

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
        <>
          <FilterBar
            category={category}
            onCategoryChange={setCategory}
            sort={sort}
            onSortChange={setSort}
            onSearchChange={setSearch}
          />
          {filteredItems.length === 0 ? (
            <Center py={12}>
              <Text color="fg.muted">No items match your search.</Text>
            </Center>
          ) : (
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={() => navigate(`/wardrobe/${item.id}`)}
                />
              ))}
            </SimpleGrid>
          )}
        </>
      )}
    </Box>
  )
}
