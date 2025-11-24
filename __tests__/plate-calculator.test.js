/**
 * Tests for Plate Calculator
 */

import { calculatePlates, getPlateVisualization, isWeightAchievable, getSmallestIncrement, BAR_WEIGHTS } from '../src/js/plate-calculator.js';

describe('Plate Calculator', () => {
  describe('calculatePlates', () => {
    test('should return empty plates for bar-only weight', () => {
      const result = calculatePlates(20, 20);
      expect(result.plates).toEqual([]);
      expect(result.totalWeight).toBe(20);
      expect(result.perSide).toBe(0);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('No plates needed');
    });

    test('should calculate single plate per side', () => {
      const result = calculatePlates(70, 20); // 20kg bar + 50kg plates (25kg per side)
      expect(result.plates).toEqual([25]);
      expect(result.perSide).toBe(25);
      expect(result.totalWeight).toBe(70);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('1×25kg');
    });

    test('should calculate multiple different plates', () => {
      const result = calculatePlates(100, 20); // 20kg bar + 80kg plates (40kg per side)
      expect(result.plates).toEqual([25, 15]);
      expect(result.perSide).toBe(40);
      expect(result.totalWeight).toBe(100);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('1×25kg, 1×15kg');
    });

    test('should calculate multiple same plates', () => {
      const result = calculatePlates(120, 20); // 20kg bar + 100kg plates (50kg per side)
      expect(result.plates).toEqual([25, 25]);
      expect(result.perSide).toBe(50);
      expect(result.totalWeight).toBe(120);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('2×25kg');
    });

    test('should handle complex plate combinations', () => {
      const result = calculatePlates(140, 20); // 20kg bar + 120kg plates (60kg per side)
      expect(result.plates).toEqual([25, 25, 10]);
      expect(result.perSide).toBe(60);
      expect(result.totalWeight).toBe(140);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('2×25kg, 1×10kg');
    });

    test('should handle fractional plates', () => {
      const result = calculatePlates(62.5, 20); // 20kg bar + 42.5kg plates (21.25kg per side)
      expect(result.plates).toEqual([20, 1.25]);
      expect(result.perSide).toBe(21.25);
      expect(result.totalWeight).toBe(62.5);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('1×20kg, 1×1.25kg');
    });

    test('should handle small increment plates', () => {
      const result = calculatePlates(22.5, 20); // 20kg bar + 2.5kg plates (1.25kg per side)
      expect(result.plates).toEqual([1.25]);
      expect(result.perSide).toBe(1.25);
      expect(result.totalWeight).toBe(22.5);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('1×1.25kg');
    });

    test('should use greedy algorithm for optimal plate selection', () => {
      const result = calculatePlates(92.5, 20); // 20kg bar + 72.5kg plates (36.25kg per side)
      expect(result.plates).toEqual([25, 10, 1.25]);
      expect(result.perSide).toBe(36.25);
      expect(result.totalWeight).toBe(92.5);
      expect(result.isExact).toBe(true);
    });

    test('should handle 0.5kg micro plates', () => {
      const result = calculatePlates(21, 20); // 20kg bar + 1kg plates (0.5kg per side)
      expect(result.plates).toEqual([0.5]);
      expect(result.perSide).toBe(0.5);
      expect(result.totalWeight).toBe(21);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('1×0.5kg');
    });

    test('should handle 0.25kg micro plates', () => {
      const result = calculatePlates(20.5, 20); // 20kg bar + 0.5kg plates (0.25kg per side)
      expect(result.plates).toEqual([0.25]);
      expect(result.perSide).toBe(0.25);
      expect(result.totalWeight).toBe(20.5);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('1×0.25kg');
    });
  });

  describe('Bar Weights', () => {
    test('should calculate with Olympic men\'s bar (20kg)', () => {
      const result = calculatePlates(60, BAR_WEIGHTS.OLYMPIC_MENS);
      expect(result.barWeight).toBe(20);
      expect(result.totalWeight).toBe(60);
      expect(result.perSide).toBe(20);
    });

    test('should calculate with Olympic women\'s bar (15kg)', () => {
      const result = calculatePlates(60, BAR_WEIGHTS.OLYMPIC_WOMENS);
      expect(result.barWeight).toBe(15);
      expect(result.totalWeight).toBe(60);
      expect(result.perSide).toBe(22.5);
      expect(result.plates).toEqual([20, 2.5]);
    });

    test('should use standard bar by default', () => {
      const result = calculatePlates(60);
      expect(result.barWeight).toBe(BAR_WEIGHTS.STANDARD);
      expect(result.barWeight).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    test('should handle weight less than bar weight', () => {
      const result = calculatePlates(15, 20);
      expect(result.plates).toEqual([]);
      expect(result.totalWeight).toBe(20);
      expect(result.isExact).toBe(true);
      expect(result.message).toBe('Bar only');
    });

    test('should handle exact bar weight', () => {
      const result = calculatePlates(20, 20);
      expect(result.plates).toEqual([]);
      expect(result.totalWeight).toBe(20);
      expect(result.isExact).toBe(true);
    });

    test('should handle very heavy weights', () => {
      const result = calculatePlates(300, 20); // 280kg in plates (140kg per side)
      expect(result.perSide).toBe(140);
      expect(result.totalWeight).toBe(300);
      expect(result.isExact).toBe(true);
      // Should be efficient: 5×25kg + 1×15kg = 140kg
      expect(result.plates).toEqual([25, 25, 25, 25, 25, 15]);
    });

    test('should handle floating point precision', () => {
      const result = calculatePlates(60.5, 20); // Should handle 0.5 increments
      expect(result.totalWeight).toBe(60.5);
      expect(result.perSide).toBe(20.25);
      expect(result.plates).toEqual([20, 0.25]);
    });
  });

  describe('Custom Available Plates', () => {
    test('should work with limited plate selection', () => {
      const limitedPlates = [25, 20, 10, 5, 2.5];
      const result = calculatePlates(80, 20, limitedPlates);
      expect(result.plates).toEqual([25, 5]);
      expect(result.totalWeight).toBe(80);
    });

    test('should handle gym without small plates', () => {
      const noSmallPlates = [25, 20, 15, 10];
      const result = calculatePlates(60, 20, noSmallPlates);
      expect(result.plates).toEqual([20]);
      expect(result.totalWeight).toBe(60);
    });
  });

  describe('Message Formatting', () => {
    test('should format single plate correctly', () => {
      const result = calculatePlates(70, 20);
      expect(result.message).toBe('1×25kg');
    });

    test('should format multiple same plates correctly', () => {
      const result = calculatePlates(120, 20);
      expect(result.message).toBe('2×25kg');
    });

    test('should format multiple different plates correctly', () => {
      const result = calculatePlates(100, 20);
      expect(result.message).toBe('1×25kg, 1×15kg');
    });

    test('should sort plates by size descending', () => {
      const result = calculatePlates(92.5, 20); // 25, 10, 1.25
      expect(result.message).toBe('1×25kg, 1×10kg, 1×1.25kg');
    });

    test('should group duplicate plates', () => {
      const result = calculatePlates(167.5, 20); // Multiple 25s, some smaller plates
      // 147.5kg in plates total, 73.75kg per side
      // Should be: 25+25+20+2.5+1.25 = 73.75
      expect(result.message).toContain('2×25kg');
    });
  });

  describe('Utility Functions', () => {
    test('isWeightAchievable should return true for achievable weights', () => {
      expect(isWeightAchievable(100, 20)).toBe(true);
      expect(isWeightAchievable(62.5, 20)).toBe(true);
    });

    test('isWeightAchievable should work with limited plates', () => {
      const limitedPlates = [25, 20];
      expect(isWeightAchievable(70, 20, limitedPlates)).toBe(true); // 25kg per side
      expect(isWeightAchievable(60, 20, limitedPlates)).toBe(true); // 20kg per side
      expect(isWeightAchievable(120, 20, limitedPlates)).toBe(true); // 2×25kg per side
      expect(isWeightAchievable(80, 20, limitedPlates)).toBe(false); // Can't make 30kg per side
      expect(isWeightAchievable(90, 20, limitedPlates)).toBe(false); // Can't make 35kg per side
    });

    test('getSmallestIncrement should return minimum increment', () => {
      expect(getSmallestIncrement()).toBe(0.5); // 0.25kg per side × 2
    });

    test('getSmallestIncrement should work with custom plates', () => {
      expect(getSmallestIncrement([25, 20, 10, 5, 2.5])).toBe(5); // 2.5kg per side × 2
      expect(getSmallestIncrement([25, 20, 10])).toBe(20); // 10kg per side × 2
    });
  });

  describe('getPlateVisualization', () => {
    test('should include visual data', () => {
      const result = getPlateVisualization(100, 20);
      expect(result.visuals).toBeDefined();
      expect(result.visuals.length).toBe(2); // [25, 15]
      expect(result.visuals[0]).toHaveProperty('weight');
      expect(result.visuals[0]).toHaveProperty('size');
      expect(result.visuals[0]).toHaveProperty('color');
    });

    test('should assign correct size classes', () => {
      const result = getPlateVisualization(142.5, 20);
      // Should have plates: 25, 25, 20, 10, 1.25
      const visual25 = result.visuals.find(v => v.weight === 25);
      const visual10 = result.visuals.find(v => v.weight === 10);
      const visual125 = result.visuals.find(v => v.weight === 1.25);

      expect(visual25.size).toBe('large');
      expect(visual10.size).toBe('medium');
      expect(visual125.size).toBe('tiny');
    });

    test('should assign colors to plates', () => {
      const result = getPlateVisualization(100, 20);
      expect(result.visuals[0].color).toBeDefined();
      expect(result.visuals[0].color).toMatch(/^#[0-9a-f]{6}$/i); // Valid hex color
    });
  });

  describe('Real-world 531 Program Weights', () => {
    test('should handle typical beginner squat progression', () => {
      // Beginner squat TM might be 100kg
      // Week 1: 65%, 75%, 85%
      const week1Set1 = calculatePlates(65, 20); // 65% of 100kg = 65kg
      expect(week1Set1.plates).toEqual([20, 2.5]);
      expect(week1Set1.totalWeight).toBe(65);

      const week1Set3 = calculatePlates(85, 20); // 85% of 100kg = 85kg
      expect(week1Set3.plates).toEqual([25, 5, 2.5]);
      expect(week1Set3.totalWeight).toBe(85);
    });

    test('should handle typical intermediate deadlift weights', () => {
      // Intermediate DL TM might be 180kg
      // Week 2: 70%, 80%, 90%
      const week2Set3 = calculatePlates(162, 20); // 90% of 180kg = 162kg
      expect(week2Set3.perSide).toBe(71);
      expect(week2Set3.totalWeight).toBe(162);
      expect(week2Set3.isExact).toBe(true);
    });

    test('should handle typical bench press weights', () => {
      // Intermediate bench TM might be 90kg
      // Week 3: 75%, 85%, 95%
      const week3Set3 = calculatePlates(85.5, 20); // 95% of 90kg = 85.5kg
      expect(week3Set3.perSide).toBe(32.75);
      expect(week3Set3.totalWeight).toBe(85.5);
      expect(week3Set3.plates).toEqual([25, 5, 2.5, 0.25]);
    });

    test('should handle OHP light weights', () => {
      // OHP TM might be 50kg
      // Week 1: 65% = 32.5kg
      const ohp = calculatePlates(32.5, 20);
      expect(ohp.perSide).toBe(6.25);
      expect(ohp.totalWeight).toBe(32.5);
      expect(ohp.plates).toEqual([5, 1.25]);
    });
  });
});
