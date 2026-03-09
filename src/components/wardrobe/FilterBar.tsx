import { useEffect, useRef, useState } from 'react'
import { Box, HStack, Input, NativeSelect, Tabs } from '@chakra-ui/react'
import type { WardrobeCategory } from '../../types/wardrobe'

export type SortOption = 'recent' | 'name' | 'warmth' | 'category'
export type CategoryFilter = WardrobeCategory | 'all'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'jacket', label: 'Jackets' },
  { value: 'sweater', label: 'Sweaters' },
  { value: 'fleece', label: 'Fleece' },
  { value: 'base-layer', label: 'Base Layers' },
  { value: 'trousers', label: 'Trousers' },
  { value: 'hat', label: 'Hats' },
  { value: 'gloves', label: 'Gloves' },
  { value: 'scarf', label: 'Scarves' },
  { value: 'other', label: 'Other' },
]

interface FilterBarProps {
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
  sort: SortOption
  onSortChange: (value: SortOption) => void
  onSearchChange: (value: string) => void
}

export function FilterBar({
  category,
  onCategoryChange,
  sort,
  onSortChange,
  onSearchChange,
}: FilterBarProps) {
  const [inputValue, setInputValue] = useState('')
  const onSearchChangeRef = useRef(onSearchChange)

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange
  })

  useEffect(() => {
    const timer = setTimeout(() => onSearchChangeRef.current(inputValue), 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  return (
    <Box mb={4}>
      <HStack mb={3} gap={3}>
        <Input
          placeholder="Search by name, brand, material…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          flex={1}
        />
        <NativeSelect.Root size="md" w="160px" flexShrink={0}>
          <NativeSelect.Field
            value={sort}
            onChange={(e) => onSortChange(e.currentTarget.value as SortOption)}
          >
            <option value="recent">Recently added</option>
            <option value="name">Name (A–Z)</option>
            <option value="warmth">Warmth level</option>
            <option value="category">Category</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      <Tabs.Root
        value={category}
        onValueChange={(e) => onCategoryChange(e.value as CategoryFilter)}
        variant="line"
        size="sm"
      >
        <Tabs.List
          overflowX="auto"
          css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {CATEGORIES.map((cat) => (
            <Tabs.Trigger key={cat.value} value={cat.value} flexShrink={0}>
              {cat.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </Box>
  )
}
