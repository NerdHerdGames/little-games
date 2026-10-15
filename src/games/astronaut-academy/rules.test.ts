import { describe, expect, it } from 'vitest';
import {
  advanceTraining,
  chooseAnswer,
  completedTasks,
  createTraining,
  currentTask,
  STATIONS,
  TOTAL_TASKS,
} from './rules';

describe('astronaut training', () => {
  it('allows unlimited retries without losing progress or skipping a task', () => {
    const start = createTraining();
    expect(chooseAnswer(start, 'cap')).toBe(start);
    expect(chooseAnswer(start, 'unknown')).toBe(start);
    expect(advanceTraining(start)).toBe(start);
    const solved = chooseAnswer(start, 'helmet');
    expect(start.solved).toBe(false);
    expect(completedTasks(solved)).toBe(1);
    expect(chooseAnswer(solved, 'helmet')).toBe(solved);
    expect(chooseAnswer(solved, 'cap')).toBe(solved);
    expect(advanceTraining(solved)).toEqual({
      station: 0,
      task: 1,
      solved: false,
      complete: false,
    });
  });

  it('requires every activity before celebrating and starts fresh on replay', () => {
    let state = createTraining();
    for (let count = 0; count < TOTAL_TASKS; count += 1) {
      expect(state.complete).toBe(false);
      expect(completedTasks(state)).toBe(count);
      const task = currentTask(state)!;
      state = chooseAnswer(state, task.answer);
      expect(completedTasks(state)).toBe(count + 1);
      state = advanceTraining(state);
    }
    expect(state.complete).toBe(true);
    expect(currentTask(state)).toBeUndefined();
    expect(completedTasks(state)).toBe(TOTAL_TASKS);
    expect(advanceTraining(state)).toBe(state);
    expect(chooseAnswer(state, 'helmet')).toBe(state);
    expect(completedTasks(createTraining())).toBe(0);
  });

  it('offers one unambiguous answer, a hint, and an explanation for every task', () => {
    expect(STATIONS).toHaveLength(4);
    for (const station of STATIONS) {
      for (const task of station.tasks) {
        expect(task.choices.filter(({ id }) => id === task.answer)).toHaveLength(1);
        expect(new Set(task.choices.map(({ id }) => id)).size).toBe(task.choices.length);
        expect(task.hint.length).toBeGreaterThan(10);
        expect(task.fact.length).toBeGreaterThan(10);
      }
    }
  });
});
