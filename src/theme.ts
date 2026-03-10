import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          navy: { value: '#1A365D' },
          slate: { value: '#4A5568' },
          arctic: { value: '#EBF8FF' },
          amber: { value: '#ED8936' },
        },
      },
      fonts: {
        heading: { value: 'Outfit, sans-serif' },
        body: { value: 'Outfit, sans-serif' },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          default: { value: '{colors.brand.arctic}' },
          muted: { value: '{colors.gray.100}' },
        },
        text: {
          default: { value: '{colors.brand.navy}' },
          muted: { value: '{colors.brand.slate}' },
        },
        primary: { value: '{colors.brand.navy}' },
        accent: { value: '{colors.brand.amber}' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
