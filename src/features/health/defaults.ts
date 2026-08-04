import type { EmotionDefinition } from './types';

export const DEFAULT_EMOTIONS: EmotionDefinition[] = [
  { id: 'happy', name: 'Happy', valence: 2, appleLabel: 'happy', builtIn: true },
  { id: 'sad', name: 'Sad', valence: -2, appleLabel: 'sad', builtIn: true },
  { id: 'angry', name: 'Angry', valence: -2, appleLabel: 'angry', builtIn: true },
  { id: 'excited', name: 'Excited', valence: 2, appleLabel: 'excited', builtIn: true },
  { id: 'anxious', name: 'Anxious', valence: -1, appleLabel: 'anxious', builtIn: true },
  { id: 'calm', name: 'Calm', valence: 1, appleLabel: 'calm', builtIn: true },
  { id: 'stressed', name: 'Stressed', valence: -1, appleLabel: 'stressed', builtIn: true },
  { id: 'frustrated', name: 'Frustrated', valence: -1, appleLabel: 'frustrated', builtIn: true },
  { id: 'lonely', name: 'Lonely', valence: -2, appleLabel: 'lonely', builtIn: true },
  { id: 'content', name: 'Content', valence: 1, appleLabel: 'content', builtIn: true },
  { id: 'grateful', name: 'Grateful', valence: 2, appleLabel: 'grateful', builtIn: true },
  { id: 'hopeful', name: 'Hopeful', valence: 1, appleLabel: 'hopeful', builtIn: true },
  { id: 'overwhelmed', name: 'Overwhelmed', valence: -1, appleLabel: 'overwhelmed', builtIn: true },
];
