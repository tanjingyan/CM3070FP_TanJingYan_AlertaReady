/// <reference types="jest" />

import {
  getAdditionalSimulationXp,
  getEligibleSimulationXp,
  getLevelFromXp,
  getSimulationScore,
} from '../progressLogic';

describe('Alerta Ready progression logic', () => {
  describe('getLevelFromXp', () => {
    test('0 XP is Level 1', () => {
      expect(getLevelFromXp(0)).toBe(1);
    });

    test('99 XP is still Level 1', () => {
      expect(getLevelFromXp(99)).toBe(1);
    });

    test('100 XP is Level 2', () => {
      expect(getLevelFromXp(100)).toBe(2);
    });

    test('250 XP is Level 3', () => {
      expect(getLevelFromXp(250)).toBe(3);
    });

    test('500 XP is Level 4', () => {
      expect(getLevelFromXp(500)).toBe(4);
    });

    test('1000 XP is Level 5', () => {
      expect(getLevelFromXp(1000)).toBe(5);
    });
  });

  describe('getSimulationScore', () => {
    test('3 safe decisions out of 3 gives 100%', () => {
      expect(getSimulationScore(3, 3)).toBe(100);
    });

    test('2 safe decisions out of 3 gives 67%', () => {
      expect(getSimulationScore(2, 3)).toBe(67);
    });

    test('1 safe decision out of 3 gives 33%', () => {
      expect(getSimulationScore(1, 3)).toBe(33);
    });

    test('0 safe decisions gives 0%', () => {
      expect(getSimulationScore(0, 3)).toBe(0);
    });

    test('0 total stages returns 0 instead of dividing by zero', () => {
      expect(getSimulationScore(0, 0)).toBe(0);
    });
  });

  describe('getEligibleSimulationXp', () => {
    test('3 safe decisions gives 30 XP', () => {
      expect(getEligibleSimulationXp(3)).toBe(30);
    });

    test('2 safe decisions gives 20 XP', () => {
      expect(getEligibleSimulationXp(2)).toBe(20);
    });

    test('0 safe decisions gives 0 XP', () => {
      expect(getEligibleSimulationXp(0)).toBe(0);
    });
  });

  describe('getAdditionalSimulationXp', () => {
    test('first completion awards all eligible XP', () => {
      expect(
        getAdditionalSimulationXp(30, 0)
      ).toBe(30);
    });

    test('repeating the same score gives no extra XP', () => {
      expect(
        getAdditionalSimulationXp(30, 30)
      ).toBe(0);
    });

    test('improving a score awards only the XP difference', () => {
      expect(
        getAdditionalSimulationXp(30, 20)
      ).toBe(10);
    });

    test('getting a lower score does not remove XP', () => {
      expect(
        getAdditionalSimulationXp(20, 30)
      ).toBe(0);
    });
  });
});