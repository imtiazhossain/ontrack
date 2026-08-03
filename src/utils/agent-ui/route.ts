/** Active route + in-app navigation for __DEV__ agent-ui dump/goto/reset. */

type AgentUiNavigate = (href: string) => void;

let currentRoute: string | null = null;
let navigateFn: AgentUiNavigate | null = null;

/** Stable aliases agents can pass to `op=goto&to=…` or `agent-ui-open.sh`. */
export const AGENT_UI_ROUTE_ALIASES = {
  today: '/',
  home: '/',
  reset: '/',
  calendar: '/calendar',
  checklists: '/to-do',
  todos: '/to-do',
  'to-do': '/to-do',
  social: '/social',
  insights: '/insights',
  profile: '/profile',
  workouts: '/workouts',
  plants: '/plants',
  travel: '/travel',
  visionBoard: '/vision-board',
  'vision-board': '/vision-board',
  games: '/games',
  vehicles: '/vehicles',
  agents: '/agents',
  nutrition: '/nutrition-profile',
  activityForm: '/activity-form',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type AgentUiRouteAlias = keyof typeof AGENT_UI_ROUTE_ALIASES;

export function setAgentUiRoute(route: string | null): void {
  currentRoute = route;
}

export function getAgentUiRoute(): string | null {
  return currentRoute;
}

export function setAgentUiNavigator(navigate: AgentUiNavigate | null): void {
  navigateFn = navigate;
}

export function agentUiNavigate(href: string): boolean {
  if (!navigateFn || !href) return false;
  navigateFn(href);
  return true;
}

/**
 * Resolve an agent destination to an Expo Router href.
 * Accepts aliases (`today`), absolute paths (`/travel/abc`), or bare segments (`travel/abc`).
 */
export function resolveAgentUiDestination(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const aliasKey = trimmed as AgentUiRouteAlias;
  if (aliasKey in AGENT_UI_ROUTE_ALIASES) {
    return AGENT_UI_ROUTE_ALIASES[aliasKey];
  }

  if (trimmed.startsWith('/')) return trimmed;

  // Bare path: travel/xyz → /travel/xyz
  return `/${trimmed.replace(/^\/+/, '')}`;
}

/** Host deep link for a destination (three-slash form). */
export function agentUiDeepLinkForDestination(raw: string): string | null {
  const href = resolveAgentUiDestination(raw);
  if (!href) return null;
  if (href === '/') return 'ontrack:///';
  return `ontrack:///${href.replace(/^\/+/, '')}`;
}
