import type {
  VisionBoardAccent,
  VisionBoardBackground,
  VisionBoardCategory,
} from './types';

interface DefaultCategory {
  id: string;
  name: string;
  intention: string;
  icon: VisionBoardCategory['icon'];
  accent: VisionBoardAccent;
  background: VisionBoardBackground;
}

export const DEFAULT_VISION_BOARD_CATEGORY_DATA: readonly DefaultCategory[] = [
  {
    id: 'vision-mindset',
    name: 'Mindset',
    intention: 'Build daily habits that support clarity and growth.',
    icon: 'mindfulness',
    accent: 'sage',
    background: 'linen',
  },
  {
    id: 'vision-health',
    name: 'Health',
    intention: 'Prioritize my health and feel strong every day.',
    icon: 'health',
    accent: 'rose',
    background: 'paper',
  },
  {
    id: 'vision-travel',
    name: 'Travel',
    intention: 'Explore the world and create unforgettable memories.',
    icon: 'flight',
    accent: 'sky',
    background: 'cork',
  },
  {
    id: 'vision-career',
    name: 'Career',
    intention: 'Build a meaningful career and financial freedom.',
    icon: 'work',
    accent: 'violet',
    background: 'charcoal',
  },
  {
    id: 'vision-home',
    name: 'Home',
    intention: 'Create a peaceful, beautiful space I love coming home to.',
    icon: 'home',
    accent: 'sand',
    background: 'sage',
  },
] as const;

export function createDefaultVisionBoardCategories(
  timestamp = new Date().toISOString(),
): VisionBoardCategory[] {
  return DEFAULT_VISION_BOARD_CATEGORY_DATA.map((category, order) => ({
    ...category,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export const VISION_BOARD_ACCENTS: Record<
  VisionBoardAccent,
  { light: string; dark: string; tintLight: string; tintDark: string }
> = {
  sage: { light: '#52745A', dark: '#8DB195', tintLight: '#DFE8DC', tintDark: '#223029' },
  rose: { light: '#A85661', dark: '#D68C96', tintLight: '#F2DDE0', tintDark: '#362126' },
  sky: { light: '#4A7399', dark: '#8FB5D8', tintLight: '#DEE8F1', tintDark: '#1E2C39' },
  violet: { light: '#746393', dark: '#AB9AC8', tintLight: '#E7E1EF', tintDark: '#292335' },
  sand: { light: '#9A7040', dark: '#C7A270', tintLight: '#EFE4D4', tintDark: '#32291E' },
};

export const VISION_BOARD_BACKGROUNDS: Record<
  VisionBoardBackground,
  { label: string; light: string; dark: string; pattern: string }
> = {
  cork: { label: 'Cork', light: '#C99861', dark: '#7D5D3E', pattern: '#6F4A2D' },
  linen: { label: 'Linen', light: '#EEE8DC', dark: '#514A41', pattern: '#BDB2A0' },
  paper: { label: 'Paper', light: '#F8F4EA', dark: '#3D3933', pattern: '#CFC4B0' },
  sage: { label: 'Sage', light: '#CBD5C2', dark: '#39483A', pattern: '#70806D' },
  charcoal: { label: 'Charcoal', light: '#3D403C', dark: '#242724', pattern: '#737970' },
};

export const VISION_BOARD_CATEGORY_ICONS: readonly VisionBoardCategory['icon'][] = [
  'mindfulness',
  'health',
  'flight',
  'work',
  'home',
  'learning',
  'personal',
  'plant',
  'target',
] as const;
