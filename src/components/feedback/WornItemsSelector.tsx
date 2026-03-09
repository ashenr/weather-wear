import { CheckboxCard, CheckboxGroup, SimpleGrid, Text, VStack, Box } from '@chakra-ui/react'
import type { WardrobeItem, WardrobeCategory } from '../../types/wardrobe'

const CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  jacket: 'Jackets',
  sweater: 'Sweaters',
  fleece: 'Fleece',
  'base-layer': 'Base Layers',
  trousers: 'Trousers',
  hat: 'Hats',
  gloves: 'Gloves',
  scarf: 'Scarves',
  other: 'Other',
}

const CATEGORY_ORDER: WardrobeCategory[] = [
  'jacket',
  'sweater',
  'fleece',
  'base-layer',
  'trousers',
  'hat',
  'gloves',
  'scarf',
  'other',
]

interface Props {
  items: WardrobeItem[]
  value: string[]
  onChange: (ids: string[]) => void
}

export function WornItemsSelector({ items, value, onChange }: Props) {
  if (items.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        No wardrobe items found. Add some items to your wardrobe first.
      </Text>
    )
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, WardrobeItem[]>>((acc, cat) => {
    const matching = items.filter((item) => item.category === cat)
    if (matching.length > 0) acc[cat] = matching
    return acc
  }, {})

  return (
    <CheckboxGroup value={value} onValueChange={onChange}>
      <VStack align="stretch" gap={4}>
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <Box key={category}>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={2} textTransform="uppercase" letterSpacing="wide">
              {CATEGORY_LABELS[category as WardrobeCategory]}
            </Text>
            <SimpleGrid columns={{ base: 2, md: 3 }} gap={2}>
              {categoryItems.map((item) => (
                <CheckboxCard.Root key={item.id} value={item.id} size="sm">
                  <CheckboxCard.HiddenInput />
                  <CheckboxCard.Control>
                    <CheckboxCard.Content>
                      <CheckboxCard.Label fontSize="sm">{item.name}</CheckboxCard.Label>
                      {item.brand && (
                        <CheckboxCard.Description fontSize="xs">
                          {item.brand}
                        </CheckboxCard.Description>
                      )}
                    </CheckboxCard.Content>
                    <CheckboxCard.Indicator />
                  </CheckboxCard.Control>
                </CheckboxCard.Root>
              ))}
            </SimpleGrid>
          </Box>
        ))}
      </VStack>
    </CheckboxGroup>
  )
}
