import {describe, it, expect} from 'vitest'
import {classifyCondition} from '../../../src/weather/osloLogic.js'
import {makeSummary, makePeriod} from '../../helpers/factories.js'

function classify(summaryOverrides = {}, humidities?: number[]) {
  const summary = makeSummary(summaryOverrides)
  const periods = humidities
    ? humidities.map((h) => makePeriod({humidity: h}))
    : [makePeriod({humidity: 70})]
  return classifyCondition(summary, periods)
}

describe('classifyCondition', () => {
  // ── Warm ──────────────────────────────────────────────────────────
  describe('warm', () => {
    it('classifies as warm when maxTemp > 20', () => {
      expect(classify({maxTemp: 25, minTemp: 15}).conditionType).toBe('warm')
    })

    it('does NOT classify as warm when maxTemp is exactly 20', () => {
      expect(classify({maxTemp: 20, minTemp: 15}).conditionType).not.toBe('warm')
    })

    it('warm takes precedence over other conditions', () => {
      // Even with high precipitation and wind, warm wins if maxTemp > 20
      expect(
        classify({maxTemp: 22, minTemp: 2, totalPrecipitation: 5, maxWind: 12}).conditionType
      ).toBe('warm')
    })
  })

  // ── Dry Mild ──────────────────────────────────────────────────────
  describe('dry-mild', () => {
    it('classifies as dry-mild when minTemp >= 10 and precipitation < 1', () => {
      expect(
        classify({minTemp: 12, maxTemp: 18, totalPrecipitation: 0}).conditionType
      ).toBe('dry-mild')
    })

    it('boundary: minTemp exactly 10 qualifies', () => {
      expect(
        classify({minTemp: 10, maxTemp: 18, totalPrecipitation: 0.5}).conditionType
      ).toBe('dry-mild')
    })

    it('boundary: precipitation exactly 1 does NOT qualify', () => {
      expect(
        classify({minTemp: 12, maxTemp: 18, totalPrecipitation: 1}).conditionType
      ).not.toBe('dry-mild')
    })

    it('does not classify when minTemp < 10', () => {
      expect(
        classify({minTemp: 9, maxTemp: 18, totalPrecipitation: 0}).conditionType
      ).not.toBe('dry-mild')
    })
  })

  // ── Dry Cool ──────────────────────────────────────────────────────
  describe('dry-cool', () => {
    it('classifies as dry-cool when minTemp 5–10 and precipitation < 1', () => {
      expect(
        classify({minTemp: 7, maxTemp: 15, totalPrecipitation: 0}).conditionType
      ).toBe('dry-cool')
    })

    it('boundary: minTemp exactly 5 qualifies', () => {
      expect(
        classify({minTemp: 5, maxTemp: 15, totalPrecipitation: 0}).conditionType
      ).toBe('dry-cool')
    })

    it('boundary: minTemp exactly 10 does NOT qualify (goes to dry-mild)', () => {
      expect(
        classify({minTemp: 10, maxTemp: 15, totalPrecipitation: 0}).conditionType
      ).toBe('dry-mild')
    })

    it('boundary: precipitation exactly 1 does NOT qualify', () => {
      expect(
        classify({minTemp: 7, maxTemp: 15, totalPrecipitation: 1}).conditionType
      ).not.toBe('dry-cool')
    })
  })

  // ── Windy Cold ────────────────────────────────────────────────────
  describe('windy-cold', () => {
    it('classifies as windy-cold when minTemp < 5 and maxWind > 8', () => {
      expect(
        classify({minTemp: 2, maxTemp: 8, maxWind: 12}).conditionType
      ).toBe('windy-cold')
    })

    it('boundary: minTemp exactly 5 does NOT qualify', () => {
      expect(
        classify({minTemp: 5, maxTemp: 8, maxWind: 12, totalPrecipitation: 0}).conditionType
      ).not.toBe('windy-cold')
    })

    it('boundary: maxWind exactly 8 does NOT qualify', () => {
      expect(
        classify({minTemp: 2, maxTemp: 8, maxWind: 8, totalPrecipitation: 0}).conditionType
      ).not.toBe('windy-cold')
    })

    it('windy-cold takes precedence over wet-slush', () => {
      // minTemp 2 (< 5), maxWind 10 (> 8), precip 3 (>= 2) — matches both, windy-cold wins
      expect(
        classify({minTemp: 2, maxTemp: 8, maxWind: 10, totalPrecipitation: 3}).conditionType
      ).toBe('windy-cold')
    })
  })

  // ── Wet Slush ─────────────────────────────────────────────────────
  describe('wet-slush', () => {
    it('classifies as wet-slush when minTemp 0–5 and precipitation >= 2', () => {
      expect(
        classify({minTemp: 2, maxTemp: 6, totalPrecipitation: 3, maxWind: 5}).conditionType
      ).toBe('wet-slush')
    })

    it('boundary: minTemp exactly 0 qualifies', () => {
      expect(
        classify({minTemp: 0, maxTemp: 6, totalPrecipitation: 2, maxWind: 5}).conditionType
      ).toBe('wet-slush')
    })

    it('boundary: minTemp exactly 5 does NOT qualify', () => {
      expect(
        classify({minTemp: 5, maxTemp: 10, totalPrecipitation: 3, maxWind: 5}).conditionType
      ).not.toBe('wet-slush')
    })

    it('boundary: precipitation exactly 2 qualifies', () => {
      expect(
        classify({minTemp: 1, maxTemp: 6, totalPrecipitation: 2, maxWind: 5}).conditionType
      ).toBe('wet-slush')
    })

    it('precipitation < 2 does NOT qualify', () => {
      expect(
        classify({minTemp: 2, maxTemp: 6, totalPrecipitation: 1.5, maxWind: 5}).conditionType
      ).not.toBe('wet-slush')
    })
  })

  // ── Wet Cold ──────────────────────────────────────────────────────
  describe('wet-cold', () => {
    it('classifies as wet-cold when minTemp -5–0, precip >= 1, humidity > 80', () => {
      expect(
        classify(
          {minTemp: -3, maxTemp: 2, totalPrecipitation: 2, maxWind: 5},
          [85, 90, 82, 88]
        ).conditionType
      ).toBe('wet-cold')
    })

    it('boundary: minTemp exactly 0 does NOT qualify (exclusive upper bound)', () => {
      expect(
        classify(
          {minTemp: 0, maxTemp: 5, totalPrecipitation: 2, maxWind: 5},
          [85, 90, 82, 88]
        ).conditionType
      ).not.toBe('wet-cold')
    })

    it('boundary: minTemp exactly -5 qualifies', () => {
      expect(
        classify(
          {minTemp: -5, maxTemp: 0, totalPrecipitation: 1, maxWind: 5},
          [85, 90, 82, 88]
        ).conditionType
      ).toBe('wet-cold')
    })

    it('boundary: precipitation exactly 1 qualifies', () => {
      expect(
        classify(
          {minTemp: -2, maxTemp: 2, totalPrecipitation: 1, maxWind: 5},
          [85, 90, 82, 88]
        ).conditionType
      ).toBe('wet-cold')
    })

    it('boundary: avgHumidity exactly 80 does NOT qualify', () => {
      expect(
        classify(
          {minTemp: -2, maxTemp: 2, totalPrecipitation: 2, maxWind: 5},
          [80, 80, 80, 80]
        ).conditionType
      ).not.toBe('wet-cold')
    })

    it('does not classify when humidity <= 80', () => {
      expect(
        classify(
          {minTemp: -2, maxTemp: 2, totalPrecipitation: 2, maxWind: 5},
          [70, 75, 72, 68]
        ).conditionType
      ).not.toBe('wet-cold')
    })
  })

  // ── Mild Damp ─────────────────────────────────────────────────────
  describe('mild-damp', () => {
    it('classifies as mild-damp when minTemp 5–15 and precipitation > 0', () => {
      expect(
        classify({minTemp: 8, maxTemp: 14, totalPrecipitation: 2, maxWind: 5}).conditionType
      ).toBe('mild-damp')
    })

    it('boundary: minTemp exactly 5 qualifies', () => {
      expect(
        classify({minTemp: 5, maxTemp: 12, totalPrecipitation: 1, maxWind: 5}).conditionType
      ).toBe('mild-damp')
    })

    it('boundary: minTemp exactly 15 hits fallback (mild-damp via fallback, not the rule)', () => {
      // minTemp=15 fails the mild-damp rule (< 15), but no other rule matches either,
      // so it falls through to the fallback which is also mild-damp
      const result = classify({minTemp: 15, maxTemp: 18, totalPrecipitation: 2, maxWind: 5})
      expect(result.conditionType).toBe('mild-damp')
    })

    it('boundary: precipitation exactly 0 does NOT qualify', () => {
      expect(
        classify({minTemp: 8, maxTemp: 14, totalPrecipitation: 0, maxWind: 5}).conditionType
      ).not.toBe('mild-damp')
    })
  })

  // ── Dry Cold ──────────────────────────────────────────────────────
  describe('dry-cold', () => {
    it('classifies as dry-cold when minTemp < 0 and precipitation < 1', () => {
      expect(
        classify({minTemp: -5, maxTemp: -1, totalPrecipitation: 0, maxWind: 5}).conditionType
      ).toBe('dry-cold')
    })

    it('boundary: minTemp exactly 0 does NOT qualify', () => {
      expect(
        classify({minTemp: 0, maxTemp: 5, totalPrecipitation: 0, maxWind: 5}).conditionType
      ).not.toBe('dry-cold')
    })

    it('boundary: precipitation exactly 1 does NOT qualify', () => {
      expect(
        classify({minTemp: -3, maxTemp: 2, totalPrecipitation: 1, maxWind: 5}).conditionType
      ).not.toBe('dry-cold')
    })
  })

  // ── Fallback ──────────────────────────────────────────────────────
  describe('fallback', () => {
    it('falls back to mild-damp when no rule matches', () => {
      // minTemp 0, precip 0, wind 5 — doesn't match any specific rule
      expect(
        classify({minTemp: 0, maxTemp: 5, totalPrecipitation: 0, maxWind: 5}).conditionType
      ).toBe('mild-damp')
    })
  })

  // ── Wind Warning ──────────────────────────────────────────────────
  describe('windWarning', () => {
    it('sets windWarning true when maxWind > 8', () => {
      expect(classify({maxWind: 9}).windWarning).toBe(true)
    })

    it('sets windWarning false when maxWind <= 8', () => {
      expect(classify({maxWind: 8}).windWarning).toBe(false)
    })

    it('boundary: maxWind exactly 8 is false', () => {
      expect(classify({maxWind: 8}).windWarning).toBe(false)
    })

    it('boundary: maxWind 8.1 is true', () => {
      expect(classify({maxWind: 8.1}).windWarning).toBe(true)
    })

    it('windWarning is independent of conditionType', () => {
      // dry-cold with high wind — conditionType should be windy-cold (minTemp < 5, wind > 8)
      // but let's test a case where wind is high in a non-windy-cold condition
      const result = classify({minTemp: 12, maxTemp: 18, totalPrecipitation: 0, maxWind: 10})
      expect(result.conditionType).toBe('dry-mild')
      expect(result.windWarning).toBe(true)
    })
  })

  // ── First-match-wins ordering ─────────────────────────────────────
  describe('first-match-wins ordering', () => {
    it('warm beats dry-mild (high temp, low precip, minTemp >= 10)', () => {
      expect(
        classify({maxTemp: 25, minTemp: 12, totalPrecipitation: 0}).conditionType
      ).toBe('warm')
    })

    it('dry-mild beats dry-cool when minTemp >= 10', () => {
      expect(
        classify({maxTemp: 18, minTemp: 10, totalPrecipitation: 0}).conditionType
      ).toBe('dry-mild')
    })

    it('windy-cold beats wet-slush when minTemp < 5 and wind > 8 and precip >= 2', () => {
      expect(
        classify({minTemp: 2, maxTemp: 6, maxWind: 10, totalPrecipitation: 3}).conditionType
      ).toBe('windy-cold')
    })

    it('windy-cold beats dry-cold when minTemp < 0 and wind > 8 and precip < 1', () => {
      expect(
        classify({minTemp: -5, maxTemp: -1, maxWind: 10, totalPrecipitation: 0}).conditionType
      ).toBe('windy-cold')
    })
  })

  // ── Humidity averaging ────────────────────────────────────────────
  describe('humidity averaging across periods', () => {
    it('uses average humidity from all periods', () => {
      // Average of [75, 85, 75, 85] = 80, which is NOT > 80, so wet-cold should NOT match
      const result = classify(
        {minTemp: -2, maxTemp: 2, totalPrecipitation: 2, maxWind: 5},
        [75, 85, 75, 85]
      )
      expect(result.conditionType).not.toBe('wet-cold')
    })

    it('handles single period', () => {
      const result = classify(
        {minTemp: -2, maxTemp: 2, totalPrecipitation: 2, maxWind: 5},
        [90]
      )
      expect(result.conditionType).toBe('wet-cold')
    })
  })
})
