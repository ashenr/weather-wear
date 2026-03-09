import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'
import type { WardrobeItem } from '../../types/wardrobe'

const CATEGORY_LABELS: Record<string, string> = {
  jacket: 'Jacket',
  sweater: 'Sweater',
  fleece: 'Fleece',
  'base-layer': 'Base Layer',
  trousers: 'Trousers',
  hat: 'Hat',
  gloves: 'Gloves',
  scarf: 'Scarf',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  jacket: 'blue',
  sweater: 'purple',
  fleece: 'teal',
  'base-layer': 'gray',
  trousers: 'orange',
  hat: 'yellow',
  gloves: 'red',
  scarf: 'pink',
  other: 'gray',
}

function WarmthDots({ level }: { level: number }) {
  return (
    <HStack gap={1}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box
          key={i}
          w={2}
          h={2}
          borderRadius="full"
          bg={i <= level ? 'orange.400' : 'gray.200'}
        />
      ))}
    </HStack>
  )
}

interface ItemCardProps {
  item: WardrobeItem
  onClick: () => void
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      cursor="pointer"
      _hover={{ borderColor: 'blue.400', shadow: 'sm' }}
      onClick={onClick}
      transition="all 0.15s"
    >
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between" align="flex-start">
          <Text fontWeight="semibold" lineClamp={2}>
            {item.name}
          </Text>
          <Badge
            colorPalette={CATEGORY_COLORS[item.category] ?? 'gray'}
            flexShrink={0}
          >
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Badge>
        </HStack>

        {item.brand && (
          <Text fontSize="sm" color="fg.muted">
            {item.brand}
          </Text>
        )}

        <HStack gap={3} flexWrap="wrap">
          <WarmthDots level={item.warmthLevel} />
          {item.waterproof !== 'no' && (
            <Badge variant="outline" colorPalette="cyan" size="sm">
              {item.waterproof === 'yes' ? 'Waterproof' : 'Water-resistant'}
            </Badge>
          )}
          {item.windproof && (
            <Badge variant="outline" colorPalette="gray" size="sm">
              Windproof
            </Badge>
          )}
        </HStack>

        {item.temperatureRange && (
          <Text fontSize="xs" color="fg.muted">
            {item.temperatureRange.min}°C to {item.temperatureRange.max}°C
          </Text>
        )}
      </VStack>
    </Box>
  )
}
