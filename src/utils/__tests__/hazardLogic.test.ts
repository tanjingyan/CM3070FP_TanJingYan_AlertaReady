/// <reference types="jest" />

import {
  getDistanceKm,
  isEarthquakeRelevant,
  isEonetEventRelevant,
} from '../../../functions/src/hazardLogic';

describe('Alerta Ready hazard logic', () => {
  describe('getDistanceKm', () => {
    test('same coordinates return approximately 0 km', () => {
      expect(
        getDistanceKm(
          1.3521,
          103.8198,
          1.3521,
          103.8198
        )
      ).toBeCloseTo(0, 5);
    });

    test('one longitude degree at the equator is about 111 km', () => {
      const distance =
        getDistanceKm(
          0,
          0,
          0,
          1
        );

      expect(
        distance
      ).toBeGreaterThan(110);

      expect(
        distance
      ).toBeLessThan(112);
    });

    test('distance is symmetrical between two coordinates', () => {
      const first =
        getDistanceKm(
          1.3521,
          103.8198,
          35.6762,
          139.6503
        );

      const second =
        getDistanceKm(
          35.6762,
          139.6503,
          1.3521,
          103.8198
        );

      expect(first).toBeCloseTo(
        second,
        5
      );
    });
  });

  describe('isEarthquakeRelevant', () => {
    test('M5 earthquake at 300 km is relevant', () => {
      expect(
        isEarthquakeRelevant(
          5,
          300
        )
      ).toBe(true);
    });

    test('M5 earthquake beyond 300 km is not relevant', () => {
      expect(
        isEarthquakeRelevant(
          5,
          301
        )
      ).toBe(false);
    });

    test('M4 earthquake at 100 km is relevant', () => {
      expect(
        isEarthquakeRelevant(
          4,
          100
        )
      ).toBe(true);
    });

    test('M4 earthquake beyond 100 km is not relevant', () => {
      expect(
        isEarthquakeRelevant(
          4,
          101
        )
      ).toBe(false);
    });

    test('M2.5 earthquake at 30 km is relevant', () => {
      expect(
        isEarthquakeRelevant(
          2.5,
          30
        )
      ).toBe(true);
    });

    test('M2.5 earthquake beyond 30 km is not relevant', () => {
      expect(
        isEarthquakeRelevant(
          2.5,
          30.1
        )
      ).toBe(false);
    });

    test('M2.4 earthquake is not relevant even when very close', () => {
      expect(
        isEarthquakeRelevant(
          2.4,
          1
        )
      ).toBe(false);
    });
  });

  describe('isEonetEventRelevant', () => {
    test('NASA EONET event at 50 km is relevant', () => {
      expect(
        isEonetEventRelevant(
          50
        )
      ).toBe(true);
    });

    test('NASA EONET event beyond 50 km is not relevant', () => {
      expect(
        isEonetEventRelevant(
          50.1
        )
      ).toBe(false);
    });
  });
});