import type { ActivityCategory } from '@/types/models';

export const DEFAULT_CATEGORIES: ActivityCategory[] = [
  { id: 'food', name: 'Food', icon: 'food', colorKey: 'food', supportsPhotos: true, supportsTimer: false, detailKind: 'food' },
  { id: 'gym', name: 'Gym', icon: 'gym', colorKey: 'gym', supportsPhotos: true, supportsTimer: true, detailKind: 'gym' },
  { id: 'work', name: 'Work', icon: 'work', colorKey: 'work', supportsPhotos: false, supportsTimer: true, detailKind: 'work' },
  { id: 'movie', name: 'Movie', icon: 'movie', colorKey: 'movie', supportsPhotos: false, supportsTimer: false, detailKind: 'movie' },
  { id: 'sleep', name: 'Sleep', icon: 'sleep', colorKey: 'sleep', supportsPhotos: false, supportsTimer: false, detailKind: 'sleep' },
  { id: 'water', name: 'Water', icon: 'water', colorKey: 'water', supportsPhotos: false, supportsTimer: false, detailKind: 'generic' },
  { id: 'personal', name: 'Personal', icon: 'personal', colorKey: 'personal', supportsPhotos: true, supportsTimer: false, detailKind: 'generic' },
  { id: 'mindfulness', name: 'Mindfulness', icon: 'mindfulness', colorKey: 'mindfulness', supportsPhotos: false, supportsTimer: true, detailKind: 'generic' },
  { id: 'learning', name: 'Learning', icon: 'learning', colorKey: 'learning', supportsPhotos: false, supportsTimer: true, detailKind: 'generic' },
  { id: 'appointment', name: 'Appointment', icon: 'appointment', colorKey: 'appointment', supportsPhotos: false, supportsTimer: false, detailKind: 'generic' },
  { id: 'habit', name: 'Habit', icon: 'habit', colorKey: 'habit', supportsPhotos: false, supportsTimer: false, detailKind: 'generic' },
];

export function findCategory(categories: ActivityCategory[], id: string): ActivityCategory {
  return categories.find((c) => c.id === id) ?? categories[0];
}
