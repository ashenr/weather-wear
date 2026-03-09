import { Badge, Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import type { PeriodData, WeatherCache } from '../types/weather'

const PERIOD_LABELS: Record<string, string> = {
  morning: 'Morning (6–9)',
  daytime: 'Daytime (9–15)',
  afternoon: 'Afternoon (15–18)',
  evening: 'Evening (18–21)',
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

const CONDITION_COLORS: Record<string, string> = {
  warm: 'orange',
  'dry-mild': 'green',
  'dry-cool': 'teal',
  'windy-cold': 'gray',
  'wet-slush': 'blue',
  'wet-cold': 'cyan',
  'mild-damp': 'purple',
  'dry-cold': 'blue',
}

function PeriodCard({ period }: { period: PeriodData }) {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <Text fontWeight="bold" mb={2}>
        {PERIOD_LABELS[period.name]}
      </Text>
      <Grid templateColumns="1fr 1fr" gap={2} fontSize="sm">
        <Text color="fg.muted">Temp</Text>
        <Text>
          {period.temp}°C (feels {period.feelsLike}°C)
        </Text>
        <Text color="fg.muted">Rain</Text>
        <Text>
          {period.precipitation}mm ({period.precipProbability}%)
        </Text>
        <Text color="fg.muted">Wind</Text>
        <Text>
          {period.wind} m/s (gust {period.windGust} m/s)
        </Text>
        <Text color="fg.muted">Symbol</Text>
        <Text>{period.symbol}</Text>
      </Grid>
    </Box>
  )
}

export function WeatherCard({ weather }: { weather: WeatherCache }) {
  const { summary, periods, conditionType, windWarning } = weather

  return (
    <VStack align="stretch" gap={4}>
      <HStack>
        <Badge colorPalette={CONDITION_COLORS[conditionType]} size="lg">
          {CONDITION_LABELS[conditionType]}
        </Badge>
        {windWarning && (
          <Badge colorPalette="red" size="lg">
            Wind Warning
          </Badge>
        )}
      </HStack>

      <Box borderWidth="1px" borderRadius="lg" p={4}>
        <Text fontWeight="bold" mb={2}>
          Daily Summary
        </Text>
        <Grid templateColumns="1fr 1fr" gap={2} fontSize="sm">
          <Text color="fg.muted">Temperature</Text>
          <Text>
            {summary.minTemp}°C – {summary.maxTemp}°C
          </Text>
          <Text color="fg.muted">Total Rain</Text>
          <Text>{summary.totalPrecipitation}mm</Text>
          <Text color="fg.muted">Max Wind</Text>
          <Text>{summary.maxWind} m/s</Text>
          <Text color="fg.muted">Cloud Cover</Text>
          <Text>{summary.avgCloudCover}%</Text>
        </Grid>
      </Box>

      {periods.map((period) => (
        <PeriodCard key={period.name} period={period} />
      ))}
    </VStack>
  )
}
