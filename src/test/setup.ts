import '@testing-library/jest-dom/vitest'

// Chakra UI's Slider (via @zag-js) uses ResizeObserver which is not in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
