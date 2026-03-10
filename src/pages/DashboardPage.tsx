import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import {
  Box,
  Button,
  Flex,
  Heading,
  Separator,
  Skeleton,
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
      <Box maxW="600px" mx="auto" px={4} py={6}>
        <VStack align="stretch" gap={6}>
          <Skeleton height="32px" width="220px" borderRadius="md" />
          <Skeleton height="180px" borderRadius="lg" />
          <Skeleton height="32px" width="140px" borderRadius="md" />
          <Separator />
          <Skeleton height="24px" width="160px" borderRadius="md" />
          <Skeleton height="80px" borderRadius="md" />
          <Skeleton height="80px" borderRadius="md" />
        </VStack>
      </Box>
    )
  }

  return (
    <Box maxW="600px" mx="auto" px={4} py={6}>
      <VStack align="stretch" gap={6}>
        <Flex justify="space-between" align="baseline" mb={2}>
          <Heading size="xl" color="brand.navy" letterSpacing="tight">
            Overview
          </Heading>
          <Text color="fg.subtle" fontSize="sm" fontWeight="medium">{today}</Text>
        </Flex>

        {error && <Text color="red.500">{error}</Text>}

        {loadingSuggestion ? (
          <VStack align="stretch" gap={3}>
            <Skeleton height="350px" borderRadius="2xl" />
            <Skeleton height="150px" borderRadius="2xl" mt={4} />
          </VStack>
        ) : suggestionError ? (
          <VStack gap={4} p={8} align="center" bg="bg.muted" borderRadius="2xl">
            <Text color="fg.muted" textAlign="center">{suggestionError}</Text>
            {suggestionError.includes('wardrobe') ? (
              <Button size="lg" colorPalette="blue" asChild borderRadius="xl">
                <RouterLink to="/wardrobe/add">
                  Add Items to Wardrobe
                </RouterLink>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={loadSuggestion}>
                Retry Suggestion
              </Button>
            )}
          </VStack>
        ) : weather && suggestion ? (
          <>
            <SuggestionCard suggestion={suggestion} />
            <Box h={2} /> {/* Spacer */}
            <WeatherCard weather={weather} />
            <Button
              onClick={handleFetchWeather}
              loading={fetching}
              variant="surface"
              size="sm"
              alignSelf="flex-start"
              colorPalette="gray"
            >
              Refresh Forecast
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
