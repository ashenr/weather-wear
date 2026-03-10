import { Badge, Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import type { DailySuggestion, SuggestionLayer } from '../types/suggestion'

const LAYER_LABELS = {
  baseLayer: 'Base Layer',
  midLayer: 'Mid Layer',
  outerLayer: 'Outer Layer',
}

function LayerRow({
  label,
  layer,
  isHero = false
}: {
  label: string
  layer: SuggestionLayer | null
  isHero?: boolean
}) {
  if (!layer) return null
  return (
    <Box 
      bg={isHero ? 'whiteAlpha.200' : 'transparent'}
      borderWidth={isHero ? '0px' : '1px'} 
      borderColor="whiteAlpha.300"
      borderRadius="xl" 
      p={4}
      color="white"
      backdropFilter={isHero ? 'blur(10px)' : 'none'}
    >
      <Text fontSize="xs" color={isHero ? 'whiteAlpha.700' : 'whiteAlpha.600'} fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={1}>
        {label}
      </Text>
      <Text fontWeight="semibold" fontSize={isHero ? 'xl' : 'md'}>{layer.name ?? layer.itemId}</Text>
      <Text fontSize="sm" color={isHero ? 'whiteAlpha.800' : 'whiteAlpha.600'} mt={1} maxW="90%">
        {layer.reasoning}
      </Text>
    </Box>
  )
}

interface SuggestionCardProps {
  suggestion: DailySuggestion
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { suggestion: s, isFallback, conditionType } = suggestion

  return (
    <Box 
      borderRadius="2xl" 
      overflow="hidden" 
      boxShadow="xl"
      bgGradient="to-br"
      gradientFrom="brand.navy"
      gradientTo="brand.slate"
      position="relative"
    >
      <VStack align="stretch" gap={0}>
        
        {/* Header Area */}
        <Box p={6} pb={2}>
          <HStack justify="space-between" align="flex-start">
            <VStack align="start" gap={0}>
              <Text color="whiteAlpha.700" fontSize="sm" textTransform="uppercase" letterSpacing="widest" fontWeight="bold">Outfit</Text>
              <Text color="white" fontWeight="bold" fontSize="3xl" lineHeight="1.1">
                Outfit of the Day
              </Text>
              <Text color="whiteAlpha.800" fontSize="sm" mt={1}>
                Optimized for {conditionType.replace('-', ' ')}
              </Text>
            </VStack>
            {isFallback && (
              <Badge colorPalette="amber" variant="solid" borderRadius="full" px={3}>
                General Advice
              </Badge>
            )}
          </HStack>
        </Box>

        {/* Hero Item (Outer Layer) */}
        <Box p={6} pt={4}>
          <LayerRow label={LAYER_LABELS.outerLayer} layer={s.outerLayer} isHero />
        </Box>

        {/* Supporting Layers */}
        <Box px={6} pb={6}>
          <Flex direction="column" gap={3}>
            <LayerRow label={LAYER_LABELS.midLayer} layer={s.midLayer} />
            <LayerRow label={LAYER_LABELS.baseLayer} layer={s.baseLayer} />
            
            {s.accessories.length > 0 && (
              <Box borderWidth="1px" borderColor="whiteAlpha.300" borderRadius="xl" p={4} color="white">
                <Text fontSize="xs" color="whiteAlpha.600" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" mb={3}>
                  Accessories
                </Text>
                <Flex gap={2} wrap="wrap">
                  {s.accessories.map((acc, i) => (
                    <Badge colorPalette="gray" variant="surface" border="none" bg="whiteAlpha.200" color="white" key={i} px={3} py={1} borderRadius="full">
                      {acc.name ?? acc.itemId}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            )}
          </Flex>
        </Box>

        {/* Advice Footer */}
        <Box bg="blackAlpha.300" p={5}>
          <Text fontSize="sm" fontStyle="italic" color="whiteAlpha.900">
            "{s.overallAdvice}"
          </Text>
        </Box>

      </VStack>
    </Box>
  )
}
