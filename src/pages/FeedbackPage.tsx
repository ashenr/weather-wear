import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  EmptyState,
  Field,
  Heading,
  Input,
  Separator,
  Skeleton,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { ComfortRatingSelector } from '../components/feedback/ComfortRatingSelector'
import { WornItemsSelector } from '../components/feedback/WornItemsSelector'
import { submitFeedback, getFeedbackForDate } from '../lib/feedback'
import { getWardrobeItems } from '../lib/wardrobe'
import { useAuth } from '../contexts/AuthContext'
import { toaster } from '../components/ui/toaster'
import type { ComfortRating } from '../types/feedback'
import type { WardrobeItem } from '../types/wardrobe'

function getOsloDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(date)
}

function getMinDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return getOsloDate(d)
}

export function FeedbackPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const today = getOsloDate()
  const [selectedDate, setSelectedDate] = useState(today)
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([])
  const [wornItems, setWornItems] = useState<string[]>([])
  const [comfortRating, setComfortRating] = useState<ComfortRating | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingFeedback, setExistingFeedback] = useState(false)

  // Load wardrobe items once
  useEffect(() => {
    if (!user) return
    getWardrobeItems(user.uid)
      .then(setWardrobeItems)
      .catch(() => toaster.create({ type: 'error', title: 'Failed to load wardrobe items' }))
      .finally(() => setLoading(false))
  }, [user])

  // Load existing feedback when date changes
  useEffect(() => {
    if (!user) return
    getFeedbackForDate(user.uid, selectedDate)
      .then((entry) => {
        if (entry) {
          setWornItems(entry.itemsWorn)
          setComfortRating(entry.comfortRating)
          setNote(entry.note ?? '')
          setExistingFeedback(true)
        } else {
          setWornItems([])
          setComfortRating(null)
          setNote('')
          setExistingFeedback(false)
        }
      })
      .catch(() => {
        setWornItems([])
        setComfortRating(null)
        setNote('')
        setExistingFeedback(false)
      })
  }, [user, selectedDate])

  const handleSubmit = async () => {
    if (!user) return
    if (wornItems.length === 0) {
      toaster.create({ type: 'error', title: 'Select at least one item you wore' })
      return
    }
    if (!comfortRating) {
      toaster.create({ type: 'error', title: 'Select a comfort rating' })
      return
    }

    setSubmitting(true)
    try {
      await submitFeedback({
        date: selectedDate,
        itemsWorn: wornItems,
        comfortRating,
        note: note.trim() || undefined,
      })
      toaster.create({
        type: 'success',
        title: existingFeedback ? 'Feedback updated' : 'Feedback submitted',
      })
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback'
      toaster.create({ type: 'error', title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box maxW="600px" mx="auto" px={4} py={6}>
      <VStack align="stretch" gap={6}>
        <Heading size="lg">Log Outfit Feedback</Heading>

        {/* Date selector */}
        <Field.Root>
          <Field.Label>Date</Field.Label>
          <Input
            type="date"
            value={selectedDate}
            max={today}
            min={getMinDate()}
            onChange={(e) => setSelectedDate(e.target.value)}
            maxW="200px"
          />
          {selectedDate !== today && (
            <Button
              variant="ghost"
              size="xs"
              mt={1}
              onClick={() => setSelectedDate(today)}
            >
              Back to today
            </Button>
          )}
          {selectedDate !== today && (
            <Text fontSize="xs" color="fg.muted">
              Logging feedback for {selectedDate}
            </Text>
          )}
        </Field.Root>

        {existingFeedback && (
          <Text fontSize="sm" color="blue.500">
            You already submitted feedback for this date — editing will overwrite it.
          </Text>
        )}

        <Separator />

        {loading ? (
          <VStack align="stretch" gap={2}>
            <Skeleton height="60px" borderRadius="md" />
            <Skeleton height="60px" borderRadius="md" />
          </VStack>
        ) : wardrobeItems.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <VStack textAlign="center" gap={3}>
                <EmptyState.Title>No wardrobe items yet</EmptyState.Title>
                <EmptyState.Description>
                  Add clothing items to your wardrobe before logging feedback.
                </EmptyState.Description>
              </VStack>
              <Button colorPalette="blue" onClick={() => navigate('/wardrobe/add')}>
                Add Items to Wardrobe
              </Button>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <>
            {/* Worn items */}
            <Field.Root>
              <Field.Label>What did you wear?</Field.Label>
              <Field.HelperText mb={2}>Select all items you wore that day</Field.HelperText>
              <WornItemsSelector
                items={wardrobeItems}
                value={wornItems}
                onChange={setWornItems}
              />
            </Field.Root>

            <Separator />

            {/* Comfort rating */}
            <Field.Root>
              <Field.Label>How comfortable were you?</Field.Label>
              <Field.HelperText mb={2}>Rate your thermal comfort throughout the day</Field.HelperText>
              <ComfortRatingSelector value={comfortRating} onChange={setComfortRating} />
            </Field.Root>

            <Separator />

            {/* Optional note */}
            <Field.Root>
              <Field.Label>Notes (optional)</Field.Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any notes? e.g. 'was fine until the wind picked up'"
                maxLength={500}
                rows={3}
              />
              <Field.HelperText textAlign="right">{note.length}/500</Field.HelperText>
            </Field.Root>

            {/* Submit */}
            <Button
              colorPalette="blue"
              loading={submitting}
              onClick={handleSubmit}
            >
              {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
          </>
        )}
      </VStack>
    </Box>
  )
}
