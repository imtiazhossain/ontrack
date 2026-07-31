import type { AppIconName } from '@/design-system';

export type VisionBoardAccent = 'sage' | 'rose' | 'sky' | 'violet' | 'sand';
export type VisionBoardBackground = 'cork' | 'linen' | 'paper' | 'sage' | 'charcoal';

export interface CanvasFrame {
  /** Unit coordinates relative to the 4:5 poster. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface VisionBoardCategory {
  id: string;
  name: string;
  intention: string;
  icon: AppIconName;
  accent: VisionBoardAccent;
  background: VisionBoardBackground;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface VisionBoardItemBase {
  id: string;
  categoryId: string;
  frame: CanvasFrame;
  createdAt: string;
  updatedAt: string;
}

export interface VisionBoardImageItem extends VisionBoardItemBase {
  kind: 'image';
  uri: string;
  aspectRatio: number;
  caption?: string;
}

export interface VisionBoardAffirmationItem extends VisionBoardItemBase {
  kind: 'affirmation';
  text: string;
  attribution?: string;
}

export interface VisionBoardGoalItem extends VisionBoardItemBase {
  kind: 'goal';
  title: string;
  note?: string;
}

export type VisionBoardItem =
  | VisionBoardImageItem
  | VisionBoardAffirmationItem
  | VisionBoardGoalItem;

export type VisionBoardItemPatch =
  | Partial<Omit<VisionBoardImageItem, 'id' | 'categoryId' | 'kind' | 'createdAt'>>
  | Partial<Omit<VisionBoardAffirmationItem, 'id' | 'categoryId' | 'kind' | 'createdAt'>>
  | Partial<Omit<VisionBoardGoalItem, 'id' | 'categoryId' | 'kind' | 'createdAt'>>;

export interface VisionBoardSnapshot {
  category: VisionBoardCategory;
  items: VisionBoardItem[];
}

export type VisionBoardItemKind = VisionBoardItem['kind'];
