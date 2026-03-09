import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import {
  Box,
  Button,
  Center,
  Heading,
  Separator,
  Skeleton,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { db, functions } from '../lib/firebase'
import { getDailySuggestion } from '../lib/suggestion'
import { WeatherCard } from '../components/WeatherCard'
import { SuggestionCard } from '../components/SuggestionCard'
import type { WeatherCache } from '../types/weather'
import type { DailySuggestion } from '../types/suggestion'

function getTodayOslo(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
  }).format(new Date())
}

export function DashboardPage() {
  const [weather, setWeather] = useState<WeatherCache | null>(null)
  const [suggestion, setSuggestion] = useState<DailySuggestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
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

  const loadSuggestion = async () => {
    setLoadingSuggestion(true)
    setSuggestionError(null)
    try {
      const result = await getDailySuggestion()
      setSuggestion(result)
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes('wardrobe is empty')
          ? 'Add wardrobe items to receive a clothing suggestion.'
          : 'Failed to generate suggestion. Please try again.'
      setSuggestionError(msg)
    } finally {
      setLoadingSuggestion(false)
    }
  }

  useEffect(() => {
    loadWeather()
  }, [])

  useEffect(() => {
    if (weather) {
      loadSuggestion()
    }
  }, [weather])

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

            <Separator />

            {loadingSuggestion ? (
              <VStack align="stretch" gap={3}>
                <Skeleton height="24px" width="160px" />
                <Skeleton height="80px" borderRadius="md" />
                <Skeleton height="80px" borderRadius="md" />
                <Skeleton height="80px" borderRadius="md" />
              </VStack>
            ) : suggestionError ? (
              <VStack gap={3} align="flex-start">
                <Text color="fg.muted">{suggestionError}</Text>
                {!suggestionError.includes('wardrobe') && (
                  <Button size="sm" variant="outline" onClick={loadSuggestion}>
                    Retry Suggestion
                  </Button>
                )}
              </VStack>
            ) : suggestion ? (
              <SuggestionCard suggestion={suggestion} />
            ) : null}
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
