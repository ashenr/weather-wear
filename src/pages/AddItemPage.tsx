import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Field,
  Heading,
  HStack,
  Image,
  Input,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { ItemForm } from '../components/wardrobe/ItemForm'
import { addWardrobeItem } from '../lib/wardrobe'
import { crawlProductUrl } from '../lib/onboarding'
import { toaster } from '../components/ui/toaster'
import { useAuth } from '../contexts/AuthContext'
import type { ItemFormValues } from '../components/wardrobe/ItemForm'
import type { WardrobeCategory, WarmthLevel, WaterproofLevel } from '../types/wardrobe'
import type { ExtractedItem } from '../lib/onboarding'

export function AddItemPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('url')
  const [urlInput, setUrlInput] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedItem | null>(null)
  const [formKey, setFormKey] = useState(0)

  const handleExtract = async () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return

    // Client-side URL validation before hitting the function
    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setExtractError('Please enter a valid HTTP or HTTPS URL.')
        return
      }
    } catch {
      setExtractError('Please enter a valid URL.')
      return
    }

    setIsExtracting(true)
    setExtractError(null)
    setExtracted(null)

    try {
      const result = await crawlProductUrl(trimmed)
      setExtracted(result)
      setFormKey((k) => k + 1)
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to extract product details. Please try again.'
      setExtractError(errMsg)
    } finally {
      setIsExtracting(false)
    }
  }

  const hasPartialExtraction = extracted !== null && (!extracted.name || !extracted.category)

  const getFormDefaults = (): Partial<ItemFormValues> | undefined => {
    if (!extracted) return undefined
    return {
      name: extracted.name ?? '',
      category: (extracted.category as WardrobeCategory) ?? 'jacket',
      color: extracted.color ?? '',
      material: extracted.material ?? '',
      brand: extracted.brand ?? '',
      warmthLevel: ((extracted.warmthLevel ?? 3) as WarmthLevel),
      waterproof: ((extracted.waterproof ?? 'no') as WaterproofLevel),
      windproof: extracted.windproof ?? false,
      temperatureRange: extracted.temperatureRange ?? { min: -10, max: 10 },
    }
  }

  const handleSubmit = async (values: ItemFormValues) => {
    if (!user) return
    setIsSaving(true)
    try {
      await addWardrobeItem(user.uid, {
        ...values,
        photoUrl: extracted?.photoUrl ?? '',
        sourceUrl: extracted?.sourceUrl ?? '',
        extractedByAI: extracted !== null,
      })
      toaster.create({
        title: 'Item added',
        description: `${values.name} has been added to your wardrobe.`,
        type: 'success',
      })
      navigate('/wardrobe')
    } catch {
      toaster.create({
        title: 'Failed to save',
        description: 'Could not save the item. Please try again.',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box maxW="600px" mx="auto" px={4} py={6}>
      <HStack mb={6} gap={3}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/wardrobe')}>
          ← Back
        </Button>
        <Heading size="lg">Add Wardrobe Item</Heading>
      </HStack>

      <Tabs.Root
        value={activeTab}
        onValueChange={(e) => {
          setActiveTab(e.value)
          if (e.value === 'manual') {
            setExtracted(null)
            setExtractError(null)
            setFormKey((k) => k + 1)
          }
        }}
      >
        <Tabs.List mb={6}>
          <Tabs.Trigger value="url">From URL</Tabs.Trigger>
          <Tabs.Trigger value="manual">Manual Entry</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="url">
          <Stack gap={4}>
            <Field.Root>
              <Field.Label>Product URL</Field.Label>
              <HStack gap={2}>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExtract()
                  }}
                  placeholder="Paste a product URL from Zalando, Norrøna, Uniqlo, etc."
                  disabled={isExtracting}
                  flex={1}
                />
                <Button
                  onClick={handleExtract}
                  loading={isExtracting}
                  colorPalette="blue"
                  disabled={!urlInput.trim() || isExtracting}
                  flexShrink={0}
                >
                  Extract
                </Button>
              </HStack>
              {isExtracting && (
                <Text fontSize="sm" color="fg.muted">
                  Extracting product details…
                </Text>
              )}
            </Field.Root>

            {extractError && (
              <Box
                bg="red.subtle"
                borderRadius="md"
                p={3}
                border="1px solid"
                borderColor="red.emphasized"
              >
                <Text fontSize="sm" color="red.fg" mb={2}>
                  {extractError}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => {
                    setActiveTab('manual')
                    setExtractError(null)
                  }}
                >
                  Enter manually instead →
                </Button>
              </Box>
            )}

            {extracted?.photoUrl && (
              <Box borderRadius="md" overflow="hidden" bg="bg.subtle" p={2} textAlign="center">
                <Image
                  src={extracted.photoUrl}
                  alt="Product image"
                  maxH="180px"
                  objectFit="contain"
                  display="inline-block"
                />
              </Box>
            )}

            {hasPartialExtraction && (
              <Box
                bg="yellow.subtle"
                borderRadius="md"
                p={3}
                border="1px solid"
                borderColor="yellow.emphasized"
              >
                <Text fontSize="sm">
                  Some details couldn't be extracted. Please fill in the missing fields.
                </Text>
              </Box>
            )}

            {extracted && (
              <ItemForm
                key={formKey}
                defaultValues={getFormDefaults()}
                onSubmit={handleSubmit}
                isLoading={isSaving}
                submitLabel="Add Item"
              />
            )}

            {!extracted && !extractError && !isExtracting && (
              <Text fontSize="sm" color="fg.muted" textAlign="center" py={8}>
                Paste a product URL above to automatically fill in the details.
              </Text>
            )}
          </Stack>
        </Tabs.Content>

        <Tabs.Content value="manual">
          <ItemForm
            key={`manual-${formKey}`}
            onSubmit={handleSubmit}
            isLoading={isSaving}
            submitLabel="Add Item"
          />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
