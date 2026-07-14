import { Preferences } from './Preferences';
import { ActionState } from '../input/ActionState';
import { ProgressStore } from '../storage/ProgressStore';

export const actions = new ActionState();
export const preferences = new Preferences();
export const progress = new ProgressStore();
