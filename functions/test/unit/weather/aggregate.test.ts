import {describe, it, expect} from 'vitest'
import {aggregateForDate} from '../../../src/weather/aggregate.js'
import {makeTimeseries} from '../../helpers/factories.js'

// Winter: Oslo is CET (UTC+1). 06:00 Oslo = 05:00 UTC
// Summer: Oslo is CEST (UTC+2). 06:00 Oslo = 04:00 UTC

describe('aggregateForDate', () => {
  // ── Period grouping ───────────────────────────────────────────────
  describe('period grouping', () => {
    it('groups hours into correct periods (winter CET)', () => {
      // CET: UTC+1. Morning 06-09 Oslo = 05-08 UTC
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {temp: -2}), // 06:00 Oslo → morning
        makeTimeseries('2026-01-15T06:00:00Z', {temp: -1}), // 07:00 Oslo → morning
        makeTimeseries('2026-01-15T07:00:00Z', {temp: 0}),  // 08:00 Oslo → morning
        makeTimeseries('2026-01-15T08:00:00Z', {temp: 1}),  // 09:00 Oslo → daytime
        makeTimeseries('2026-01-15T14:00:00Z', {temp: 5}),  // 15:00 Oslo → afternoon
        makeTimeseries('2026-01-15T17:00:00Z', {temp: 3}),  // 18:00 Oslo → evening
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.temp).toBeCloseTo((-2 + -1 + 0) / 3, 1)

      const daytime = periods.find((p) => p.name === 'daytime')!
      expect(daytime.temp).toBe(1)
    })

    it('groups hours into correct periods (summer CEST)', () => {
      // CEST: UTC+2. Morning 06-09 Oslo = 04-07 UTC
      const entries = [
        makeTimeseries('2026-07-15T04:00:00Z', {temp: 15}), // 06:00 Oslo → morning
        makeTimeseries('2026-07-15T05:00:00Z', {temp: 16}), // 07:00 Oslo → morning
        makeTimeseries('2026-07-15T06:00:00Z', {temp: 17}), // 08:00 Oslo → morning
        makeTimeseries('2026-07-15T07:00:00Z', {temp: 18}), // 09:00 Oslo → daytime
      ]

      const {periods} = aggregateForDate(entries, '2026-07-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.temp).toBeCloseTo((15 + 16 + 17) / 3, 1)
    })

    it('assigns four periods: morning, daytime, afternoon, evening', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {temp: 0}),
      ]
      const {periods} = aggregateForDate(entries, '2026-01-15')
      const names = periods.map((p) => p.name)
      expect(names).toEqual(['morning', 'daytime', 'afternoon', 'evening'])
    })
  })

  // ── Excluding out-of-range hours ──────────────────────────────────
  describe('excluding hours outside 06:00–21:00', () => {
    it('ignores entries before 06:00 Oslo time', () => {
      const entries = [
        makeTimeseries('2026-01-15T03:00:00Z', {temp: -10}), // 04:00 Oslo — excluded
        makeTimeseries('2026-01-15T04:00:00Z', {temp: -8}),  // 05:00 Oslo — excluded
        makeTimeseries('2026-01-15T05:00:00Z', {temp: -2}),  // 06:00 Oslo — morning
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.temp).toBe(-2) // Only the 06:00 entry
    })

    it('ignores entries at or after 21:00 Oslo time', () => {
      const entries = [
        makeTimeseries('2026-01-15T19:00:00Z', {temp: 1}), // 20:00 Oslo → evening
        makeTimeseries('2026-01-15T20:00:00Z', {temp: 0}), // 21:00 Oslo — excluded
        makeTimeseries('2026-01-15T21:00:00Z', {temp: -1}), // 22:00 Oslo — excluded
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const evening = periods.find((p) => p.name === 'evening')!
      expect(evening.temp).toBe(1) // Only the 20:00 entry
    })
  })

  // ── Empty period handling ─────────────────────────────────────────
  describe('empty periods', () => {
    // TODO: Replace this with the intended summary behavior once empty periods stop using synthetic zeroes.
    it('returns zero values for periods with no entries', () => {
      // Only provide morning data — daytime, afternoon, evening should be empty
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {temp: 2}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const daytime = periods.find((p) => p.name === 'daytime')!
      expect(daytime.temp).toBe(0)
      expect(daytime.wind).toBe(0)
      expect(daytime.humidity).toBe(0)
      expect(daytime.symbol).toBe('cloudy')
    })

    it('returns all zero periods when no entries match the date', () => {
      const entries = [
        makeTimeseries('2026-01-16T05:00:00Z', {temp: 5}), // Wrong date
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      for (const period of periods) {
        expect(period.temp).toBe(0)
      }
    })
  })

  // ── Aggregation math ──────────────────────────────────────────────
  describe('aggregation math', () => {
    it('averages temperatures across period hours', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {temp: -4}),
        makeTimeseries('2026-01-15T06:00:00Z', {temp: -2}),
        makeTimeseries('2026-01-15T07:00:00Z', {temp: 0}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.temp).toBeCloseTo((-4 + -2 + 0) / 3, 1)
    })

    it('sums precipitation for the period', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {precipitation: 0.5}),
        makeTimeseries('2026-01-15T06:00:00Z', {precipitation: 1.2}),
        makeTimeseries('2026-01-15T07:00:00Z', {precipitation: 0.3}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.precipitation).toBeCloseTo(2.0, 1)
    })

    it('takes max precipProbability for the period', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {precipProb: 20}),
        makeTimeseries('2026-01-15T06:00:00Z', {precipProb: 60}),
        makeTimeseries('2026-01-15T07:00:00Z', {precipProb: 30}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.precipProbability).toBe(60)
    })

    it('averages wind speed', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {wind: 3}),
        makeTimeseries('2026-01-15T06:00:00Z', {wind: 6}),
        makeTimeseries('2026-01-15T07:00:00Z', {wind: 9}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.wind).toBe(6)
    })

    it('takes max wind gust', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {gust: 8}),
        makeTimeseries('2026-01-15T06:00:00Z', {gust: 15}),
        makeTimeseries('2026-01-15T07:00:00Z', {gust: 10}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.windGust).toBe(15)
    })

    it('averages humidity', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {humidity: 80}),
        makeTimeseries('2026-01-15T06:00:00Z', {humidity: 90}),
        makeTimeseries('2026-01-15T07:00:00Z', {humidity: 70}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.humidity).toBe(80)
    })

    it('picks most frequent symbol', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {symbol: 'rain'}),
        makeTimeseries('2026-01-15T06:00:00Z', {symbol: 'cloudy'}),
        makeTimeseries('2026-01-15T07:00:00Z', {symbol: 'rain'}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.symbol).toBe('rain')
    })
  })

  // ── next_1_hours vs next_6_hours fallback ─────────────────────────
  describe('next_1_hours fallback to next_6_hours', () => {
    // TODO: Add a multi-entry fallback case to guard against double-counting 6-hour precipitation buckets.
    it('uses next_6_hours when next_1_hours is unavailable', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {
          precipitation: 3.0,
          symbol: 'heavyrain',
          useNext6Hours: true,
        }),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.precipitation).toBe(3.0)
      expect(morning.symbol).toBe('heavyrain')
    })
  })

  // ── Daily summary ─────────────────────────────────────────────────
  describe('daily summary', () => {
    it('calculates minTemp as minimum across periods', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {temp: -3}),  // morning
        makeTimeseries('2026-01-15T08:00:00Z', {temp: 2}),   // daytime
        makeTimeseries('2026-01-15T14:00:00Z', {temp: 1}),   // afternoon
        makeTimeseries('2026-01-15T17:00:00Z', {temp: -1}),  // evening
      ]

      const {summary} = aggregateForDate(entries, '2026-01-15')
      expect(summary.minTemp).toBe(-3)
    })

    it('calculates maxTemp as maximum across periods', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {temp: -3}),
        makeTimeseries('2026-01-15T08:00:00Z', {temp: 5}),
        makeTimeseries('2026-01-15T14:00:00Z', {temp: 3}),
        makeTimeseries('2026-01-15T17:00:00Z', {temp: 0}),
      ]

      const {summary} = aggregateForDate(entries, '2026-01-15')
      expect(summary.maxTemp).toBe(5)
    })

    it('sums totalPrecipitation across all periods', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {precipitation: 1.0}),
        makeTimeseries('2026-01-15T08:00:00Z', {precipitation: 0.5}),
        makeTimeseries('2026-01-15T14:00:00Z', {precipitation: 2.0}),
        makeTimeseries('2026-01-15T17:00:00Z', {precipitation: 0.3}),
      ]

      const {summary} = aggregateForDate(entries, '2026-01-15')
      expect(summary.totalPrecipitation).toBeCloseTo(3.8, 1)
    })

    it('calculates maxWind as max average wind across periods', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {wind: 3}),
        makeTimeseries('2026-01-15T08:00:00Z', {wind: 8}),
        makeTimeseries('2026-01-15T14:00:00Z', {wind: 5}),
        makeTimeseries('2026-01-15T17:00:00Z', {wind: 6}),
      ]

      const {summary} = aggregateForDate(entries, '2026-01-15')
      expect(summary.maxWind).toBe(8)
    })

    it('averages cloud cover across periods', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {cloudCover: 80}),
        makeTimeseries('2026-01-15T08:00:00Z', {cloudCover: 40}),
        makeTimeseries('2026-01-15T14:00:00Z', {cloudCover: 60}),
        makeTimeseries('2026-01-15T17:00:00Z', {cloudCover: 20}),
      ]

      const {summary} = aggregateForDate(entries, '2026-01-15')
      expect(summary.avgCloudCover).toBe(50)
    })

    it('returns zero summary when no entries match', () => {
      const {summary} = aggregateForDate([], '2026-01-15')
      expect(summary.minTemp).toBe(0)
      expect(summary.maxTemp).toBe(0)
      expect(summary.totalPrecipitation).toBe(0)
      expect(summary.maxWind).toBe(0)
      expect(summary.avgCloudCover).toBe(0)
    })
  })

  // ── Rounding ──────────────────────────────────────────────────────
  describe('rounding', () => {
    it('rounds values to 1 decimal place', () => {
      const entries = [
        makeTimeseries('2026-01-15T05:00:00Z', {temp: 1.15}),
        makeTimeseries('2026-01-15T06:00:00Z', {temp: 2.25}),
        makeTimeseries('2026-01-15T07:00:00Z', {temp: 3.35}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      // (1.15 + 2.25 + 3.35) / 3 = 2.25
      const tempStr = morning.temp.toString()
      const decimals = tempStr.includes('.') ? tempStr.split('.')[1].length : 0
      expect(decimals).toBeLessThanOrEqual(1)
    })
  })

  // ── DST transitions ───────────────────────────────────────────────
  describe('DST transitions', () => {
    it('handles spring DST transition (CET→CEST, last Sunday of March)', () => {
      // 2026-03-29: clocks spring forward 02:00 → 03:00
      // Before DST: UTC+1. After DST: UTC+2.
      // 06:00 Oslo before DST = 05:00 UTC
      // 06:00 Oslo after DST = 04:00 UTC
      // On DST day, 05:00 UTC = 06:00 CET (before change) or 07:00 CEST (after change)
      // The transition happens at 02:00 local, so morning hours (06-09) are all CEST
      // 06:00 CEST = 04:00 UTC, 07:00 CEST = 05:00 UTC, 08:00 CEST = 06:00 UTC
      const entries = [
        makeTimeseries('2026-03-29T04:00:00Z', {temp: 3}), // 06:00 CEST → morning
        makeTimeseries('2026-03-29T05:00:00Z', {temp: 4}), // 07:00 CEST → morning
        makeTimeseries('2026-03-29T06:00:00Z', {temp: 5}), // 08:00 CEST → morning
      ]

      const {periods} = aggregateForDate(entries, '2026-03-29')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.temp).toBe(4) // average of 3,4,5
    })

    it('handles autumn DST transition (CEST→CET, last Sunday of October)', () => {
      // 2026-10-25: clocks fall back at 03:00 CEST → 02:00 CET (01:00 UTC)
      // After transition: CET (UTC+1)
      // 05:00 UTC = 06:00 CET → morning
      // 06:00 UTC = 07:00 CET → morning
      // 07:00 UTC = 08:00 CET → morning
      const entries = [
        makeTimeseries('2026-10-25T05:00:00Z', {temp: 8}), // 06:00 CET → morning
        makeTimeseries('2026-10-25T06:00:00Z', {temp: 9}), // 07:00 CET → morning
        makeTimeseries('2026-10-25T07:00:00Z', {temp: 10}), // 08:00 CET → morning
      ]

      const {periods} = aggregateForDate(entries, '2026-10-25')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.temp).toBe(9) // average of 8, 9, 10
    })
  })

  // ── Date filtering ────────────────────────────────────────────────
  describe('date filtering', () => {
    it('only includes entries matching the target date in Oslo timezone', () => {
      const entries = [
        makeTimeseries('2026-01-14T23:00:00Z', {temp: -5}), // 00:00 Jan 15 Oslo — excluded (before 06:00)
        makeTimeseries('2026-01-15T05:00:00Z', {temp: 0}),  // 06:00 Jan 15 Oslo — morning
        makeTimeseries('2026-01-15T23:00:00Z', {temp: -2}), // 00:00 Jan 16 Oslo — wrong date
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      const morning = periods.find((p) => p.name === 'morning')!
      expect(morning.temp).toBe(0) // Only the 06:00 entry
    })

    it('handles UTC midnight crossing correctly', () => {
      // 2026-01-14T23:00:00Z = 2026-01-15T00:00:00 Oslo (CET)
      // This is on Jan 15 Oslo but before 06:00, so it should be excluded from periods
      // but it IS on the target date
      const entries = [
        makeTimeseries('2026-01-14T23:00:00Z', {temp: -5}),
      ]

      const {periods} = aggregateForDate(entries, '2026-01-15')
      // This hour (00:00 Oslo) is outside the 06-21 range, so all periods should be empty
      for (const period of periods) {
        expect(period.temp).toBe(0)
      }
    })
  })
})
