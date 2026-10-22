import type { EventCategory } from './types';

export const CATEGORIES: { value: EventCategory; icon: string }[] = [
  { value: 'MUSIC', icon: 'ri-music-2-line' },
  { value: 'THEATER', icon: 'ri-movie-2-line' },
  { value: 'CONFERENCE', icon: 'ri-presentation-line' },
  { value: 'SPORTS', icon: 'ri-basketball-line' },
  { value: 'COMEDY', icon: 'ri-emotion-laugh-line' },
];

export const CITIES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];

export const TIER_COLORS = ['#f59e0b', '#8b5cf6', '#0ea5e9', '#10b981', '#ef4444', '#64748b'];
