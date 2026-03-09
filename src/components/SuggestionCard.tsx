import { Badge, Box, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import type { DailySuggestion, SuggestionLayer } from '../types/suggestion'

const LAYER_LABELS = {
  baseLayer: 'Base Layer',
  midLayer: 'Mid Layer',
  outerLayer: 'Outer Layer',
}

function LayerRow({
  label,
  layer,
}: {
  label: string
  layer: SuggestionLayer | null
}) {
  if (!layer) return null
  return (
    <Box borderWidth="1px" borderRadius="md" p={3}>
      <Text fontSize="xs" color="fg.muted" fontWeight="semibold" textTransform="uppercase" mb={1}>
        {label}
      </Text>
      <Text fontWeight="medium">{layer.name ?? layer.itemId}</Text>
      <Text fontSize="sm" color="fg.muted" mt={1}>
        {layer.reasoning}
      </Text>
    </Box>
  )
}

interface SuggestionCardProps {
  suggestion: DailySuggestion
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { suggestion: s, isFallback } = suggestion

  return (
    <VStack align="stretch" gap={4}>
      <HStack justify="space-between">
        <Text fontWeight="bold" fontSize="lg">
          Today's Outfit
        </Text>
        {isFallback && (
          <Badge colorPalette="orange" variant="subtle">
            General Advice
          </Badge>
        )}
      </HStack>

      <LayerRow label={LAYER_LABELS.baseLayer} layer={s.baseLayer} />
      <LayerRow label={LAYER_LABELS.midLayer} layer={s.midLayer} />
      <LayerRow label={LAYER_LABELS.outerLayer} layer={s.outerLayer} />

      {s.accessories.length > 0 && (
        <Box borderWidth="1px" borderRadius="md" p={3}>
          <Text
            fontSize="xs"
            color="fg.muted"
            fontWeight="semibold"
            textTransform="uppercase"
            mb={2}
          >
            Accessories
          </Text>
          <VStack align="stretch" gap={2}>
            {s.accessories.map((acc, i) => (
              <Box key={i}>
                <Text fontWeight="medium">{acc.name ?? acc.itemId}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {acc.reasoning}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      <Separator />

      <Box bg="bg.subtle" borderRadius="md" p={4}>
        <Text fontSize="sm" fontStyle="italic" color="fg">
          {s.overallAdvice}
        </Text>
      </Box>
    </VStack>
  )
}
