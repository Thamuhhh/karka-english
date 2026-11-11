export type AvatarPackId =
  | 'lion'
  | 'panda'
  | 'shiba'
  | 'owl'
  | 'kitten'
  | 'penguin'
  | 'redpanda'
  | 'husky';

export interface AvatarPackItem {
  id: AvatarPackId;
  name: string;
  tamilName: string;
  tagline: string;
  description: string;
  accentColor: string;
  source: any;
}

export const AVATAR_PACK_ITEMS: readonly AvatarPackItem[] = [
  {
    id: 'lion',
    name: 'Leo the Lion',
    tamilName: 'லியோ',
    tagline: 'Bold & Confident',
    description: 'Ready to speak up and lead any English conversation.',
    accentColor: '#F59E0B',
    source: require('../../assets/avatars/avatar_lion.png'),
  },
  {
    id: 'panda',
    name: 'Bamboo Panda',
    tamilName: 'பாண்டா',
    tagline: 'Chill & Focused',
    description: 'Cool under pressure with music and relaxed practice.',
    accentColor: '#10B981',
    source: require('../../assets/avatars/avatar_panda.png'),
  },
  {
    id: 'shiba',
    name: 'Shiba Bolt',
    tamilName: 'ஷிபா',
    tagline: 'High Energy & Curious',
    description: 'Fast learner who brings enthusiasm to every lesson.',
    accentColor: '#F97316',
    source: require('../../assets/avatars/avatar_shiba.png'),
  },
  {
    id: 'owl',
    name: 'Sage Owl',
    tamilName: 'அறிவு ஆந்தை',
    tagline: 'Wise & Articulate',
    description: 'Sharp grammar sense and precise vocabulary mastery.',
    accentColor: '#06B6D4',
    source: require('../../assets/avatars/avatar_owl.png'),
  },
  {
    id: 'kitten',
    name: 'Mochi Kitty',
    tamilName: 'மோச்சி பூனை',
    tagline: 'Quick-witted & Playful',
    description: 'Charming, clever comebacks and natural small-talk.',
    accentColor: '#A855F7',
    source: require('../../assets/avatars/avatar_kitten.png'),
  },
  {
    id: 'penguin',
    name: 'Pippin Penguin',
    tamilName: 'பென்குவின்',
    tagline: 'Fearless Explorer',
    description: 'Loves travel English, bold questions, and adventure.',
    accentColor: '#38BDF8',
    source: require('../../assets/avatars/avatar_penguin.png'),
  },
  {
    id: 'redpanda',
    name: 'Rusty Red Panda',
    tamilName: 'ரெட் பாண்டா',
    tagline: 'Friendly & Cheerful',
    description: 'Warm, cozy learner who never gives up on daily goals.',
    accentColor: '#EC4899',
    source: require('../../assets/avatars/avatar_redpanda.png'),
  },
  {
    id: 'husky',
    name: 'Echo Husky',
    tamilName: 'ஹஸ்கி',
    tagline: 'Adventurous & Loyal',
    description: 'Energetic speaker built for roleplay and debates.',
    accentColor: '#6366F1',
    source: require('../../assets/avatars/avatar_husky.png'),
  },
];

export const DEFAULT_AVATAR_ID: AvatarPackId = 'lion';

export function getAvatarPackItem(
  id: string | null | undefined
): AvatarPackItem {
  if (!id) return AVATAR_PACK_ITEMS[0];
  const found = AVATAR_PACK_ITEMS.find((item) => item.id === id);
  return found || AVATAR_PACK_ITEMS[0];
}

export function isValidAvatarId(id: unknown): id is AvatarPackId {
  return (
    typeof id === 'string' &&
    AVATAR_PACK_ITEMS.some((item) => item.id === id)
  );
}

export function getAvatarSource(id: string | null | undefined): any {
  return getAvatarPackItem(id).source;
}

