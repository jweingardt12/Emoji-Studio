// Route configuration for environment-based routing
// When accessed through emojistudio.xyz/app/*, use /app prefix
// When accessed directly, use /dashboard prefix

const isProduction = process.env.NODE_ENV === 'production';
const isProxied = process.env.NEXT_PUBLIC_PROXIED === 'true';

// Use /app prefix when deployed and accessed through proxy
// Use /dashboard prefix for local development and direct access
export const BASE_PATH = isProduction && isProxied ? '/app' : '/dashboard';

export const routes = {
  home: BASE_PATH,
  dashboard: BASE_PATH,
  leaderboard: `${BASE_PATH}/leaderboard`,
  visualizations: `${BASE_PATH}/visualizations`,
  explorer: `${BASE_PATH}/explorer`,
  myEmojis: `${BASE_PATH}/my-emojis`,
  create: `${BASE_PATH}/create`,
  settings: `${BASE_PATH}/settings`,
  about: `${BASE_PATH}/about`,
} as const;

export type RoutePath = typeof routes[keyof typeof routes];