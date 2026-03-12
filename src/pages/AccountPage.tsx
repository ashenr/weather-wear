import { useEffect, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Clipboard,
  CloseButton,
  Code,
  Dialog,
  Heading,
  HStack,
  Input,
  Portal,
  Separator,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { generateApiKey, getApiKeyStatus, revokeApiKey } from '../lib/apiKey'
import type { ApiKeyStatus } from '../lib/apiKey'
import { useAuth } from '../contexts/AuthContext'
import { toaster } from '../components/ui/toaster'

type ApiKeyState = ApiKeyStatus


function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    timeZone: 'Europe/Oslo',
  })
}

export function AccountPage() {
  const { user } = useAuth()
  const [keyState, setKeyState] = useState<ApiKeyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)

  // Dialog state
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false)
  const [showKeyOpen, setShowKeyOpen] = useState(false)
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false)
  const [generatedKey, setGeneratedKey] = useState('')

  useEffect(() => {
    if (!user) return
    loadKeyState()
  }, [user])

  async function loadKeyState() {
    if (!user) return
    setLoading(true)
    try {
      const status = await getApiKeyStatus()
      setKeyState(status)
    } catch {
      toaster.create({ type: 'error', title: 'Failed to load API key status' })
      setKeyState({ status: 'none' })
    } finally {
      setLoading(false)
    }
  }

  function handleGenerateClick() {
    if (keyState?.status === 'active') {
      setConfirmGenerateOpen(true)
    } else {
      doGenerate()
    }
  }

  async function doGenerate() {
    setConfirmGenerateOpen(false)
    setGenerating(true)
    try {
      const rawKey = await generateApiKey()
      setGeneratedKey(rawKey)
      await loadKeyState()
      setShowKeyOpen(true)
    } catch {
      toaster.create({ type: 'error', title: 'Failed to generate API key' })
    } finally {
      setGenerating(false)
    }
  }

  async function doRevoke() {
    setConfirmRevokeOpen(false)
    setRevoking(true)
    try {
      await revokeApiKey()
      await loadKeyState()
      toaster.create({ type: 'success', title: 'API key revoked' })
    } catch {
      toaster.create({ type: 'error', title: 'Failed to revoke API key' })
    } finally {
      setRevoking(false)
    }
  }

  const maskedKey = keyState?.keySuffix
    ? '•'.repeat(39) + keyState.keySuffix
    : ''

  return (
    <Box maxW="600px" mx="auto" px={4} py={6}>
      <VStack align="stretch" gap={6}>
        <Heading size="xl" color="brand.navy" letterSpacing="tight">
          Account
        </Heading>

        <Separator />

        <Heading size="md" color="brand.navy">API Key</Heading>
        <Text color="fg.muted" fontSize="sm">
          Use your API key to fetch today's weather and clothing suggestion from a single REST
          endpoint — no browser or OAuth required. Ideal for e-ink displays or cron scripts.
        </Text>

        {loading ? (
          <VStack align="stretch" gap={3}>
            <Skeleton height="24px" width="100px" borderRadius="md" />
            <Skeleton height="48px" borderRadius="md" />
          </VStack>
        ) : keyState?.status === 'none' ? (
          <VStack align="start" gap={4}>
            <Text color="fg.muted">You haven't generated an API key yet.</Text>
            <Button
              colorPalette="blue"
              loading={generating}
              onClick={handleGenerateClick}
            >
              Generate API key
            </Button>
          </VStack>
        ) : keyState?.status === 'active' ? (
          <VStack align="stretch" gap={4}>
            <HStack>
              <Badge colorPalette="green" size="md">Active</Badge>
            </HStack>

            <Box bg="bg.muted" px={4} py={3} borderRadius="lg" fontFamily="mono" fontSize="sm">
              <Text letterSpacing="wider">{maskedKey}</Text>
            </Box>

            <VStack align="start" gap={1}>
              {keyState.createdAt && (
                <Text fontSize="sm" color="fg.muted">
                  Generated on {formatDateTime(keyState.createdAt)}
                </Text>
              )}
              <Text fontSize="sm" color="fg.muted">
                {keyState.lastUsedAt
                  ? `Last used: ${formatDateTime(keyState.lastUsedAt)}`
                  : 'Last used: never'}
              </Text>
            </VStack>

            <HStack gap={3}>
              <Button
                variant="outline"
                colorPalette="blue"
                loading={generating}
                onClick={handleGenerateClick}
              >
                Regenerate
              </Button>
              <Button
                variant="outline"
                colorPalette="red"
                loading={revoking}
                onClick={() => setConfirmRevokeOpen(true)}
              >
                Revoke
              </Button>
            </HStack>
          </VStack>
        ) : (
          <VStack align="start" gap={4}>
            <Badge colorPalette="gray" size="md">Revoked</Badge>
            <Text color="fg.muted" fontSize="sm">
              Your API key has been revoked. Generate a new one to restore access.
            </Text>
            <Button
              colorPalette="blue"
              loading={generating}
              onClick={handleGenerateClick}
            >
              Generate new key
            </Button>
          </VStack>
        )}
      </VStack>

      {/* Confirm regenerate dialog */}
      <Dialog.Root
        role="alertdialog"
        open={confirmGenerateOpen}
        onOpenChange={(e) => setConfirmGenerateOpen(e.open)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Regenerate API key?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  This will immediately invalidate your current key. Any devices using the old key
                  will stop working. Continue?
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button colorPalette="blue" onClick={doGenerate} loading={generating}>
                  Regenerate
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Show new key dialog */}
      <Dialog.Root
        open={showKeyOpen}
        onOpenChange={(e) => {
          setShowKeyOpen(e.open)
          if (!e.open) setGeneratedKey('')
        }}
        closeOnInteractOutside={false}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Your new API key</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={4}>
                  <Box
                    bg="orange.50"
                    borderWidth="1px"
                    borderColor="orange.200"
                    borderRadius="md"
                    px={3}
                    py={2}
                  >
                    <Text fontSize="sm" color="orange.700" fontWeight="medium">
                      This key will only be shown once. Store it somewhere safe before closing this
                      dialog.
                    </Text>
                  </Box>

                  <Clipboard.Root value={generatedKey}>
                    <VStack align="stretch" gap={2}>
                      <Clipboard.Input asChild>
                        <Input
                          readOnly
                          fontFamily="mono"
                          fontSize="sm"
                          value={generatedKey}
                        />
                      </Clipboard.Input>
                      <Clipboard.Trigger asChild>
                        <Button variant="surface" size="sm" alignSelf="flex-start">
                          <Clipboard.Indicator copied="Copied!">Copy to clipboard</Clipboard.Indicator>
                        </Button>
                      </Clipboard.Trigger>
                    </VStack>
                  </Clipboard.Root>

                  <Text fontSize="sm" color="fg.muted">
                    Use this key with the{' '}
                    <Code fontSize="xs">getSnapshot</Code> endpoint:
                  </Text>
                  <Box bg="bg.muted" px={3} py={2} borderRadius="md" fontFamily="mono" fontSize="xs" overflowX="auto">
                    <Text>GET /getSnapshot?key=&lt;your-key&gt;</Text>
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setShowKeyOpen(false)}>Done</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Confirm revoke dialog */}
      <Dialog.Root
        role="alertdialog"
        open={confirmRevokeOpen}
        onOpenChange={(e) => setConfirmRevokeOpen(e.open)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Revoke API key?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  Any devices using this key will immediately lose access.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button colorPalette="red" onClick={doRevoke} loading={revoking}>
                  Revoke key
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
