
import { Character } from './types';

export const INITIAL_CHARACTER: Character = {
  profile: {
    name: '',
    info: '',
    backstory: '',
    bonds: '',
    memories: '',
  },
  abilities: {
    luck: 3,
    skills: [
      { name: '체력', score: 1 },
      { name: '지능', score: 1 },
      { name: '민첩', score: 1 },
      { name: '재주', score: 1 },
      { name: '매력', score: 1 },
    ],
    enhancements: [],
    status: '',
    growthPoints: 0,
  },
  inventory: {
    items: [],
    money: 0,
  },
};

export const BASE_SKILLS = ['체력', '지능', '민첩', '재주', '매력'];
export const ADDITIONAL_SKILL_POINTS = 6;
export const MAX_ENHANCEMENTS = 2;
export const MAX_ITEMS = 3;
