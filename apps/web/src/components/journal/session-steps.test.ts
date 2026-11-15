import { describe, expect, it } from 'vitest';
import { moveStep, type SessionStep, stepTotals } from './session-steps';

const step = (unit: SessionStep['unit'], amount: number | null, description = ''): SessionStep => ({
  unit,
  amount,
  target: null,
  description,
  done: false,
});

describe('session steps', () => {
  it('adds up the planned minutes and arrows, steps without an amount left out', () => {
    expect(
      stepTotals([
        step('MINUTES', 15),
        step('ARROWS', 36),
        step('ARROWS', 36),
        step('MINUTES', null),
      ]),
    ).toEqual({ minutes: 15, arrows: 72 });
    expect(stepTotals([])).toEqual({ minutes: 0, arrows: 0 });
  });

  it('moves a step up or down, not past either end', () => {
    const steps = [step('MINUTES', 1, 'a'), step('MINUTES', 2, 'b'), step('MINUTES', 3, 'c')];
    const order = (list: SessionStep[]) => list.map((s) => s.description).join('');
    expect(order(moveStep(steps, 1, -1))).toBe('bac');
    expect(order(moveStep(steps, 1, 1))).toBe('acb');
    expect(moveStep(steps, 0, -1)).toBe(steps);
    expect(moveStep(steps, 2, 1)).toBe(steps);
    // The list given is left as it was.
    expect(order(steps)).toBe('abc');
  });
});
