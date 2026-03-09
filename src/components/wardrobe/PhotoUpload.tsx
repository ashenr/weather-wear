import { useRef, useState } from 'react'
import { Box, Button, HStack, Image, Progress, Text, VStack } from '@chakra-ui/react'

interface Props {
  existingPhotoUrl?: string
  onFileChange: (file: File | null) => void
  uploadProgress?: number
  disabled?: boolean
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX_WIDTH = 1200
      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

export function PhotoUpload({ existingPhotoUrl, onFileChange, uploadProgress, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const compressed = await compressImage(file)
    const url = URL.createObjectURL(compressed)
    setPreview(url)
    setCleared(false)
    onFileChange(compressed)
  }

  const handleClear = () => {
    setPreview(null)
    setCleared(true)
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayUrl = cleared ? null : (preview ?? existingPhotoUrl ?? null)
  const isUploading = uploadProgress !== undefined && uploadProgress > 0 && uploadProgress < 100

  return (
    <VStack align="stretch" gap={2}>
      {displayUrl ? (
        <Box>
          <Box borderRadius="md" overflow="hidden" bg="bg.subtle">
            <Image
              src={displayUrl}
              alt="Item photo"
              maxH="200px"
              w="full"
              objectFit="contain"
              display="block"
            />
          </Box>
          {!disabled && !isUploading && (
            <HStack mt={2} gap={2}>
              <Button size="xs" variant="outline" onClick={() => inputRef.current?.click()}>
                Change photo
              </Button>
              <Button size="xs" variant="ghost" colorPalette="red" onClick={handleClear}>
                Remove
              </Button>
            </HStack>
          )}
        </Box>
      ) : (
        <Box
          border="2px dashed"
          borderColor={dragging ? 'blue.400' : 'border'}
          borderRadius="md"
          p={6}
          textAlign="center"
          cursor={disabled ? 'not-allowed' : 'pointer'}
          bg={dragging ? 'blue.subtle' : 'bg.subtle'}
          transition="all 0.15s"
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (disabled) return
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
        >
          <Text fontSize="sm" color="fg.muted">
            {dragging ? 'Drop to upload' : 'Click or drag a photo here'}
          </Text>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            JPEG, PNG or WebP · max 5 MB
          </Text>
        </Box>
      )}

      {isUploading && (
        <Progress.Root value={uploadProgress} size="xs" colorPalette="blue">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </VStack>
  )
}
