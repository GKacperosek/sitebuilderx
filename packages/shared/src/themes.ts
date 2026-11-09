import type { SiteTheme } from './types.js';
import { DEFAULT_THEME } from './tree.js';

export const THEMES: SiteTheme[] = [
  structuredClone(DEFAULT_THEME),
  { name: 'Electric Violet', colors: { background: '#080910', surface: '#131522', text: '#f5f3ff', muted: '#aaa7bf', primary: '#a78bfa', secondary: '#22d3ee', border: '#2b2940' }, fontFamily: 'DM Sans', headingFont: 'Space Grotesk', radius: 24 },
  { name: 'Arctic Cyan', colors: { background: '#071217', surface: '#10242c', text: '#ecfeff', muted: '#91adb6', primary: '#22d3ee', secondary: '#a3e635', border: '#23414b' }, fontFamily: 'Inter', headingFont: 'Space Grotesk', radius: 20 },
  { name: 'Warm Studio', colors: { background: '#faf7f0', surface: '#f0ebe1', text: '#28251f', muted: '#777064', primary: '#c2613a', secondary: '#788b68', border: '#dfd6c8' }, fontFamily: 'DM Sans', headingFont: 'Georgia', radius: 12 },
  { name: 'Pure Commerce', colors: { background: '#ffffff', surface: '#f5f5f3', text: '#18191b', muted: '#6a6c70', primary: '#a3e635', secondary: '#7c3aed', border: '#e4e5e7' }, fontFamily: 'Inter', headingFont: 'DM Sans', radius: 16 },
  { name: 'Ocean Business', colors: { background: '#f4f8fc', surface: '#ffffff', text: '#102c4c', muted: '#587086', primary: '#1764cf', secondary: '#0d9488', border: '#d9e4ef' }, fontFamily: 'Inter', headingFont: 'Space Grotesk', radius: 16 },
  { name: 'Editorial Rose', colors: { background: '#fff8f7', surface: '#f8eae8', text: '#3a202a', muted: '#846773', primary: '#bb4267', secondary: '#9177b9', border: '#ecd4dc' }, fontFamily: 'DM Sans', headingFont: 'Georgia', radius: 20 },
  { name: 'Forest Retreat', colors: { background: '#f5f6ef', surface: '#e8ecdf', text: '#213729', muted: '#637360', primary: '#90b06b', secondary: '#d9a566', border: '#d3dcc9' }, fontFamily: 'DM Sans', headingFont: 'Georgia', radius: 24 },
  { name: 'Ember', colors: { background: '#140e0c', surface: '#251a15', text: '#fff7ed', muted: '#b9a095', primary: '#fb923c', secondary: '#facc15', border: '#443026' }, fontFamily: 'Inter', headingFont: 'Space Grotesk', radius: 16 },
];
