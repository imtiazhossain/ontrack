import type { ActivityCategory } from '@/types/models';

export const DEFAULT_CATEGORIES: ActivityCategory[] = [
  { id: 'food', name: 'Food', icon: 'fork.knife', colorKey: 'food', supportsPhotos: true, supportsTimer: false, detailKind: 'food' },
  { id: 'gym', name: 'Gym', icon: 'dumbbell.fill', colorKey: 'gym', supportsPhotos: true, supportsTimer: true, detailKind: 'gym' },
  { id: 'work', name: 'Work', icon: 'laptopcomputer', colorKey: 'work', supportsPhotos: false, supportsTimer: true, detailKind: 'work' },
  { id: 'movie', name: 'Movie', icon: 'film.fill', colorKey: 'movie', supportsPhotos: false, supportsTimer: false, detailKind: 'movie' },
  { id: 'sleep', name: 'Sleep', icon: 'moon.zzz.fill', colorKey: 'sleep', supportsPhotos: false, supportsTimer: false, detailKind: 'sleep' },
  { id: 'water', name: 'Water', icon: 'drop.fill', colorKey: 'water', supportsPhotos: false, supportsTimer: false, detailKind: 'generic' },
  { id: 'personal', name: 'Personal', icon: 'person.fill', colorKey: 'personal', supportsPhotos: true, supportsTimer: false, detailKind: 'generic' },
  { id: 'mindfulness', name: 'Mindfulness', icon: 'leaf.fill', colorKey: 'mindfulness', supportsPhotos: false, supportsTimer: true, detailKind: 'generic' },
  { id: 'learning', name: 'Learning', icon: 'book.fill', colorKey: 'learning', supportsPhotos: false, supportsTimer: true, detailKind: 'generic' },
  { id: 'appointment', name: 'Appointment', icon: 'calendar.badge.clock', colorKey: 'appointment', supportsPhotos: false, supportsTimer: false, detailKind: 'generic' },
  { id: 'habit', name: 'Habit', icon: 'sparkles', colorKey: 'habit', supportsPhotos: false, supportsTimer: false, detailKind: 'generic' },
  { id: 'plant', name: 'Plant care', icon: 'leaf.fill', colorKey: 'plant', supportsPhotos: true, supportsTimer: false, detailKind: 'plant' },
];

export function findCategory(categories: ActivityCategory[], id: string): ActivityCategory {
  return categories.find((c) => c.id === id) ?? categories[0];
}
