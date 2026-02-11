
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

// Zoom out more on mobile (smaller scale value = wider view)
// 0.8 is desktop default. 0.6 provides roughly 40% wider view for mobile screens compared to desktop.
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
export const ZOOM_LEVEL = isMobile ? 0.6 : 0.8;

export const COLORS = {
  black: '#050505',
  white: '#f0f0f0',
  orange: '#ff6600',
  orangeDim: '#cc5200',
  orangeGlow: 'rgba(255, 102, 0, 0.3)',
  gray: '#333333',
};

export const PLAYER_BASE_STATS = {
  speed: 6,
  maxHealth: 100,
  magnetRadius: 150,
};

export const BALANCE = {
  XP_GROWTH_RATE: 1.35,      // 35% increase per level
  ENEMY_SCALING_RATE: 1.07, // 7% stats increase per wave
};
