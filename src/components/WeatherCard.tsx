import { Badge, Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { LuSun, LuMoon, LuCloud, LuCloudRain, LuCloudSnow, LuCloudFog, LuCloudLightning } from 'react-icons/lu'
import type { PeriodData, WeatherCache } from '../types/weather'

const PERIOD_LABELS: Record<string, string> = {
  morning: 'Morning',
  daytime: 'Daytime',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

function getWeatherIcon(symbol: string) {
  const props = { size: 24, strokeWidth: 2, color: 'currentColor' }
  if (!symbol) return <LuCloud {...props} />
  const s = symbol.toLowerCase()
  
  if (s.includes('thunder') || s.includes('lightning')) return <LuCloudLightning {...props} />
  if (s.includes('rain') || s.includes('drizzle') || s.includes('shower')) return <LuCloudRain {...props} />
  if (s.includes('snow') || s.includes('sleet') || s.includes('ice')) return <LuCloudSnow {...props} />
  if (s.includes('fog')) return <LuCloudFog {...props} />
  if (s.includes('cloud')) return <LuCloud {...props} />
  if (s.includes('clear') || s.includes('sun') || s.includes('fair')) {
    return s.includes('night') ? <LuMoon {...props} /> : <LuSun {...props} />
  }
  return <LuCloud {...props} />
}

const CONDITION_LABELS: Record<string, string> = {
  warm: 'Warm',
  'dry-mild': 'Dry & Mild',
  'dry-cool': 'Dry & Cool',
  'windy-cold': 'Windy & Cold',
  'wet-slush': 'Wet Slush',
  'wet-cold': 'Wet & Cold',
  'mild-damp': 'Mild & Damp',
  'dry-cold': 'Dry & Cold',
}

function PeriodMiniCard({ period }: { period: PeriodData }) {
  if (period.temp == null) return null // Skip empty periods if any (allow 0°C)
  
  return (
    <VStack 
      gap={1} 
      p={3} 
      bg="bg.muted" 
      borderRadius="xl" 
      align="center"
      flex="1"
    >
      <Text fontSize="2xs" color="fg.muted" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
        {PERIOD_LABELS[period.name]}
      </Text>
      
      <Box color="brand.navy" my={1}>
        {getWeatherIcon(period.symbol)}
      </Box>

      <Text fontWeight="bold" fontSize="lg" lineHeight="1">
        {period.temp}°
      </Text>

      <Text fontSize="2xs" color="fg.muted" mt={-1}>
        Feels {period.feelsLike}°
      </Text>
      
      <Flex gap={2} mt={1}>
        <Text fontSize="2xs" color="fg.subtle" fontWeight="medium">
          {period.precipitation > 0 ? `${period.precipitation}mm` : '0mm'}
        </Text>
        <Text fontSize="2xs" color="fg.subtle" fontWeight="medium">
          {period.wind}m/s
        </Text>
      </Flex>
    </VStack>
  )
}

export function WeatherCard({ weather }: { weather: WeatherCache }) {
  const { summary, periods, conditionType, windWarning } = weather

  const hasPeriods = periods.length > 0
  const minFeelsLike = hasPeriods ? Math.min(...periods.map(p => p.feelsLike)) : summary.minTemp
  const maxFeelsLike = hasPeriods ? Math.max(...periods.map(p => p.feelsLike)) : summary.maxTemp

  return (
    <VStack align="stretch" gap={4}>
      
      {/* Sleek Horizontal Main Weather Widget */}
      <Box 
        borderWidth="1px" 
        borderColor="gray.200" 
        borderRadius="2xl" 
        p={5}
        bg="white"
        boxShadow="sm"
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <VStack align="start" gap={0}>
            <Text fontSize="5xl" fontWeight="bold" lineHeight="1" letterSpacing="tighter" color="brand.navy">
              {summary.minTemp}°
              <Text as="span" fontSize="2xl" color="brand.slate" ml={1}>/ {summary.maxTemp}°C</Text>
            </Text>
            <Text fontSize="xs" color="fg.muted" fontWeight="medium" mt={1}>
              Feels like {minFeelsLike}° to {maxFeelsLike}°
            </Text>
            <HStack mt={2}>
              <Text fontWeight="bold" color="brand.slate" textTransform="uppercase" letterSpacing="wider" fontSize="sm">
                {CONDITION_LABELS[conditionType] || conditionType}
              </Text>
              {windWarning && (
                <Badge colorPalette="orange" size="sm" variant="subtle" borderRadius="full">
                  Wind Warning
                </Badge>
              )}
            </HStack>
          </VStack>

          <VStack align="end" gap={0}>
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                PRECIP {summary.totalPrecipitation}mm
            </Text>
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                WIND {summary.maxWind}m/s
            </Text>
          </VStack>
        </Flex>
      </Box>

      {/* Forecast Periods */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" color="fg.muted" textTransform="uppercase" letterSpacing="widest" mb={3}>
          Forecast
        </Text>
        <HStack gap={3} align="stretch" overflowX="auto" pb={2}>
          {periods.map((period) => (
            <PeriodMiniCard key={period.name} period={period} />
          ))}
        </HStack>
      </Box>

    </VStack>
  )
}
