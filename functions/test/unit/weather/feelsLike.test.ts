import {describe, it, expect} from 'vitest'
import {aggregateForDate} from '../../../src/weather/aggregate.js'
import {makeTimeseries} from '../../helpers/factories.js'

// The calculateFeelsLike function is not exported directly,
// so we test it through aggregateForDate by providing timeseries data
// and checking the feelsLike values in the output periods.

// Helper: create a single-hour morning entry and aggregate, return feelsLike
function getFeelsLike(tempC: number, windMs: number): number {
  // Use a winter UTC time that maps to 07:00 Oslo (CET = UTC+1)
  const entry = makeTimeseries('2026-01-15T06:00:00Z', {temp: tempC, wind: windMs})
  const {periods} = aggregateForDate([entry], '2026-01-15')
  const morning = periods.find((p) => p.name === 'morning')!
  return morning.feelsLike
}

// Environment Canada wind chill reference:
// feelsLike = 13.12 + 0.6215*T - 11.37*V^0.16 + 0.3965*T*V^0.16
// where V is in km/h
function expectedWindChill(tempC: number, windMs: number): number {
  const vKmh = windMs * 3.6
  const v016 = Math.pow(vKmh, 0.16)
  return Math.round((13.12 + 0.6215 * tempC - 11.37 * v016 + 0.3965 * tempC * v016) * 10) / 10
}

describe('feelsLike (wind chill) calculation', () => {
  describe('formula applied when temp < 10 and wind > 1.3 m/s', () => {
    it('applies wind chill at -10°C and 5 m/s', () => {
      const result = getFeelsLike(-10, 5)
      expect(result).toBeCloseTo(expectedWindChill(-10, 5), 1)
    })

    it('applies wind chill at 0°C and 3 m/s', () => {
      const result = getFeelsLike(0, 3)
      expect(result).toBeCloseTo(expectedWindChill(0, 3), 1)
    })

    it('applies wind chill at 5°C and 10 m/s', () => {
      const result = getFeelsLike(5, 10)
      expect(result).toBeCloseTo(expectedWindChill(5, 10), 1)
    })

    it('applies wind chill at 9.9°C and 2 m/s', () => {
      const result = getFeelsLike(9.9, 2)
      expect(result).toBeCloseTo(expectedWindChill(9.9, 2), 1)
    })
  })

  describe('returns raw temperature when thresholds not met', () => {
    it('returns raw temp when temp >= 10', () => {
      expect(getFeelsLike(10, 5)).toBe(10)
    })

    it('returns raw temp when temp = 15 and wind = 10', () => {
      expect(getFeelsLike(15, 10)).toBe(15)
    })

    it('returns raw temp when wind <= 1.3 m/s', () => {
      expect(getFeelsLike(5, 1.3)).toBe(5)
    })

    it('returns raw temp when wind = 0', () => {
      expect(getFeelsLike(-5, 0)).toBe(-5)
    })

    it('returns raw temp when wind = 1 m/s (below threshold)', () => {
      expect(getFeelsLike(3, 1)).toBe(3)
    })
  })

  describe('boundary conditions', () => {
    it('temp exactly 10°C returns raw temp', () => {
      expect(getFeelsLike(10, 5)).toBe(10)
    })

    it('wind exactly 1.3 m/s returns raw temp', () => {
      expect(getFeelsLike(5, 1.3)).toBe(5)
    })

    it('wind just above 1.3 m/s (1.4) applies formula', () => {
      const result = getFeelsLike(5, 1.4)
      expect(result).not.toBe(5)
      expect(result).toBeCloseTo(expectedWindChill(5, 1.4), 1)
    })
  })

  describe('known reference values', () => {
    it('-10°C at 20 km/h (~5.56 m/s) ≈ -17.9°C', () => {
      // 20 km/h = 5.556 m/s
      const result = getFeelsLike(-10, 5.556)
      expect(result).toBeCloseTo(-17.9, 0)
    })

    it('feelsLike is always lower than actual temp when formula applies', () => {
      const temp = 5
      const wind = 5
      const result = getFeelsLike(temp, wind)
      expect(result).toBeLessThan(temp)
    })
  })
})
