import { RadioCard, HStack, Text } from '@chakra-ui/react'
import type { ComfortRating } from '../../types/feedback'
import { COMFORT_RATINGS } from '../../types/feedback'

const RATING_COLORS: Record<ComfortRating, string> = {
  'too-cold': 'blue',
  'slightly-cold': 'cyan',
  'just-right': 'green',
  'slightly-warm': 'orange',
  'too-warm': 'red',
}

interface Props {
  value: ComfortRating | null
  onChange: (rating: ComfortRating) => void
}

export function ComfortRatingSelector({ value, onChange }: Props) {
  return (
    <RadioCard.Root
      value={value ?? ''}
      onValueChange={(e) => onChange(e.value as ComfortRating)}
      colorPalette={value ? RATING_COLORS[value] : 'gray'}
    >
      <HStack align="stretch" flexWrap="wrap" gap={2}>
        {COMFORT_RATINGS.map(({ value: ratingValue, label }) => (
          <RadioCard.Item
            key={ratingValue}
            value={ratingValue}
            flex="1"
            minW="120px"
          >
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <Text fontSize="lg" mb={1}>
                  {ratingValue === 'too-cold' && '🥶'}
                  {ratingValue === 'slightly-cold' && '🌡️'}
                  {ratingValue === 'just-right' && '✅'}
                  {ratingValue === 'slightly-warm' && '☀️'}
                  {ratingValue === 'too-warm' && '🔥'}
                </Text>
                <RadioCard.ItemText fontSize="xs" textAlign="center">
                  {label}
                </RadioCard.ItemText>
              </RadioCard.ItemContent>
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </HStack>
    </RadioCard.Root>
  )
}
