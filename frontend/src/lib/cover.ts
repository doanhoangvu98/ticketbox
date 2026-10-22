/**
 * The API has no event images yet. Generate a deterministic gradient + icon per event id
 * so every card looks distinct and stays the same across reloads.
 */
const GRADIENTS = [
  'from-violet-600 via-fuchsia-500 to-pink-500',
  'from-sky-600 via-cyan-500 to-emerald-400',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-indigo-700 via-violet-600 to-purple-500',
  'from-emerald-600 via-teal-500 to-cyan-500',
  'from-rose-600 via-pink-500 to-orange-400',
];
const ICONS = ['ri-music-2-fill', 'ri-mic-2-fill', 'ri-film-fill', 'ri-guitar-fill', 'ri-presentation-fill', 'ri-sparkling-2-fill'];

export function coverOf(id: number): { gradient: string; icon: string } {
  return {
    gradient: GRADIENTS[id % GRADIENTS.length] ?? GRADIENTS[0]!,
    icon: ICONS[(id * 7) % ICONS.length] ?? ICONS[0]!,
  };
}
