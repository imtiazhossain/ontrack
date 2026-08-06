/** Coarse product surfaces for dwell analytics (never includes Health note text). */

export type AnalyticsSurface =
  | 'today'
  | 'calendar'
  | 'checklists'
  | 'travel'
  | 'plants'
  | 'workouts'
  | 'health'
  | 'vehicles'
  | 'vision-board'
  | 'games'
  | 'social'
  | 'insights'
  | 'profile'
  | 'nutrition'
  | 'agents'
  | 'auth'
  | 'other';

const SURFACE_LABELS: Record<AnalyticsSurface, string> = {
  today: 'Today',
  calendar: 'Calendar',
  checklists: 'Checklists & groceries',
  travel: 'Travel',
  plants: 'Plants',
  workouts: 'Workouts',
  health: 'Health',
  vehicles: 'Vehicles',
  'vision-board': 'Vision board',
  games: 'Games',
  social: 'Social',
  insights: 'Insights',
  profile: 'Profile',
  nutrition: 'Nutrition',
  agents: 'Agents',
  auth: 'Auth',
  other: 'Other',
};

export function analyticsSurfaceLabel(surface: AnalyticsSurface): string {
  return SURFACE_LABELS[surface] ?? surface;
}

export function resolveAnalyticsSurface(pathname: string | null | undefined): AnalyticsSurface {
  const path = (pathname ?? '/').split('?')[0] || '/';
  if (path === '/' || path === '') return 'today';
  if (path.startsWith('/calendar')) return 'calendar';
  if (
    path.startsWith('/to-do') ||
    path.startsWith('/todos') ||
    path.startsWith('/l/') ||
    path.startsWith('/c/') ||
    path.startsWith('/todo-')
  ) {
    return 'checklists';
  }
  if (path.startsWith('/travel') || path.startsWith('/invite/travel') || path.startsWith('/j/')) {
    return 'travel';
  }
  if (path.startsWith('/plants')) return 'plants';
  if (path.startsWith('/workouts') || path.startsWith('/detail/gym')) return 'workouts';
  if (path.startsWith('/health')) return 'health';
  if (path.startsWith('/vehicles') || path.startsWith('/v/')) return 'vehicles';
  if (path.startsWith('/vision-board')) return 'vision-board';
  if (path.startsWith('/games')) return 'games';
  if (path.startsWith('/social') || path.startsWith('/f/') || path.startsWith('/i/')) {
    return 'social';
  }
  if (path.startsWith('/insights')) return 'insights';
  if (path.startsWith('/profile') || path.startsWith('/account') || path.startsWith('/developer')) {
    return 'profile';
  }
  if (path.startsWith('/nutrition')) return 'nutrition';
  if (path.startsWith('/agents')) return 'agents';
  if (path.startsWith('/auth') || path.startsWith('/welcome') || path.startsWith('/onboarding')) {
    return 'auth';
  }
  if (path.startsWith('/detail/food') || path.startsWith('/activity-form')) return 'today';
  return 'other';
}

export function formatActiveDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
