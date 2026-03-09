import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import {
  Box,
  Button,
  Center,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { db, functions } from '../lib/firebase'
import { WeatherCard } from '../components/WeatherCard'
import type { WeatherCache } from '../types/weather'

function getTodayOslo(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
  }).format(new Date())
}

export function DashboardPage() {
  const [weather, setWeather] = useState<WeatherCache | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = getTodayOslo()

  const loadWeather = async () => {
    try {
      const snap = await getDoc(doc(db, 'weatherCache', today))
      setWeather(snap.exists() ? (snap.data() as WeatherCache) : null)
    } catch {
      setError('Failed to load weather data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeather()
  }, [])

  const handleFetchWeather = async () => {
    setFetching(true)
    setError(null)
    try {
      await httpsCallable(functions, 'fetchWeather')({})
      await loadWeather()
    } catch {
      setError('Failed to fetch weather. Please try again.')
    } finally {
      setFetching(false)
    }
  }

  if (loading) {
    return (
      <Center py={12}>
        <Spinner size="xl" />
      </Center>
    )
  }

  return (
    <Box maxW="600px" mx="auto" px={4} py={6}>
      <VStack align="stretch" gap={6}>
        <Heading size="lg">Today — {today}</Heading>

        {error && <Text color="red.500">{error}</Text>}

        {weather ? (
          <>
            <WeatherCard weather={weather} />
            <Button
              onClick={handleFetchWeather}
              loading={fetching}
              variant="outline"
              size="sm"
              alignSelf="flex-start"
            >
              Refresh Weather
            </Button>
          </>
        ) : (
          <VStack gap={4} py={8} align="center">
            <Text color="fg.muted">No weather data for today yet.</Text>
            <Button
              onClick={handleFetchWeather}
              loading={fetching}
              colorPalette="blue"
            >
              Fetch Weather
            </Button>
          </VStack>
        )}
      </VStack>
    </Box>
  )
}
