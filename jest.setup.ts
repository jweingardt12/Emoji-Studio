import '@testing-library/jest-dom'

// canvas-confetti needs a real 2D canvas context, which jsdom doesn't provide.
jest.mock('canvas-confetti', () => {
  const confetti = Object.assign(jest.fn(), { create: jest.fn(() => jest.fn()) })
  return { __esModule: true, default: confetti }
})

// jsdom doesn't implement matchMedia; components use it for reduced-motion
// and responsive checks.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
