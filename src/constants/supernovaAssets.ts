// Cohesive asset registry combining bespoke 3D obsidian-violet artwork and extracted UI assets
export const SUPERNOVA_IMAGES = {
  // Brand Wordmark & App Icon
  karkaLogo: require('../../assets/Karka Logo.png'),
  appIcon: require('../../assets/appicon.png'),

  // Bespoke 3D Coach & Milestone Artwork
  novaAvatar: require('../../assets/generated/nova_studio_portrait.jpg'),
  trophyNova: require('../../assets/generated/map_trophy_crest.jpg'),

  // Bespoke 3D Map World Assets
  mapTopographyBg: require('../../assets/generated/map_bg_topography.jpg'),
  unitBanners: {
    1: require('../../assets/generated/map_unit1_foundation.jpg'),
    2: require('../../assets/generated/map_unit2_daily.jpg'),
    3: require('../../assets/generated/map_unit3_career.jpg'),
    4: require('../../assets/generated/map_unit4_mastery.jpg'),
  } as { [key: number]: any },

  // Bespoke 3D Lesson Node Medallions
  nodeEmblems: {
    speak: require('../../assets/generated/node_emblem_speak.jpg'),
    grammar: require('../../assets/generated/node_emblem_grammar.jpg'),
    daily: require('../../assets/generated/node_emblem_daily.jpg'),
    career: require('../../assets/generated/node_emblem_career.jpg'),
    shopping: require('../../assets/generated/node_emblem_1_5.jpg'),
    routine: require('../../assets/generated/node_emblem_2_2.jpg'),
    camera: require('../../assets/generated/node_emblem_2_3.jpg'),
    future: require('../../assets/generated/node_emblem_2_4.jpg'),
    meeting: require('../../assets/generated/node_emblem_2_5.jpg'),
    delay: require('../../assets/generated/node_emblem_3_1.jpg'),
    health: require('../../assets/generated/node_emblem_3_2.jpg'),
  },
};

const LESSON_EMBLEM_CATEGORY: Record<string, keyof typeof SUPERNOVA_IMAGES.nodeEmblems> = {
  'sn-1-1': 'speak',
  'sn-1-2': 'grammar',
  'sn-1-3': 'daily',
  'sn-1-4': 'career',
  'sn-1-5': 'shopping',
  'sn-2-1': 'speak',
  'sn-2-2': 'routine',
  'sn-2-3': 'camera',
  'sn-2-4': 'future',
  'sn-2-5': 'meeting',
  'sn-3-1': 'delay',
  'sn-3-2': 'health',
  'sn-3-3': 'career',
  'sn-3-4': 'speak',
  'sn-3-5': 'grammar',
  'sn-3-6': 'career',
  'sn-4-1': 'daily',
  'sn-4-2': 'speak',
  'sn-4-3': 'grammar',
  'sn-4-4': 'career',
  'sn-4-5': 'speak',
  'sn-4-6': 'career',
};

export function getLessonNodeEmblem(classId: string) {
  const category = LESSON_EMBLEM_CATEGORY[classId] || 'speak';
  return SUPERNOVA_IMAGES.nodeEmblems[category];
}

export function getUnitBanner(levelNumber: number) {
  return SUPERNOVA_IMAGES.unitBanners[levelNumber] || SUPERNOVA_IMAGES.unitBanners[1];
}
