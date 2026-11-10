// Cohesive asset registry combining bespoke 3D obsidian-violet artwork and extracted UI assets
export const SUPERNOVA_IMAGES = {
  // Brand Wordmark & App Icon
  karkaLogo: require('../../assets/Karka Logo.png'),
  appIcon: require('../../assets/appicon.png'),

  // Bespoke 3D Coach & Milestone Artwork
  novaAvatar: require('../../assets/generated/nova_studio_portrait.jpg'),
  novaPortraitLegacy: require('../../assets/supernova/nova_avatar_card.png'),
  novaBw: require('../../assets/supernova/nova_bw.png'),
  streakNova: require('../../assets/generated/nova_studio_portrait.jpg'),
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
  },

  // Utility Icons from APK
  bubbleMic: require('../../assets/supernova/bubble_mic.png'),
  endCall: require('../../assets/supernova/end_call.png'),
  translate: require('../../assets/supernova/translate.png'),
  askDoubt: require('../../assets/supernova/ask_doubt.png'),
  continueArrow: require('../../assets/supernova/continue_arrow.png'),
  levelOverview1: require('../../assets/supernova/gemstore_levels_1_overview.png'),
  levelTitle1: require('../../assets/supernova/gemstore_levels_1_title.png'),
  levelTitleWon1: require('../../assets/supernova/gemstore_levels_1_titlewon.png'),
  superChallengeBanner: require('../../assets/supernova/gemstore_superchallengestartwidgetbanner.png'),
  storeBanner: require('../../assets/supernova/gemstore_gemstorestorebanner.png'),
  levelTitles: {
    1: require('../../assets/generated/map_unit1_foundation.jpg'),
    2: require('../../assets/generated/map_unit2_daily.jpg'),
    3: require('../../assets/generated/map_unit3_career.jpg'),
    4: require('../../assets/generated/map_unit4_mastery.jpg'),
  } as { [key: number]: any },
  levelOverviews: {
    1: require('../../assets/supernova/gemstore_levels_1_overview.png'),
    2: require('../../assets/supernova/gemstore_levels_2_overview.png'),
    3: require('../../assets/supernova/gemstore_levels_3_overview.png'),
    4: require('../../assets/supernova/gemstore_levels_4_overview.png'),
    5: require('../../assets/supernova/gemstore_levels_5_overview.png'),
    6: require('../../assets/supernova/gemstore_levels_6_overview.png'),
  } as { [key: number]: any },
};

const LESSON_EMBLEM_CATEGORY: Record<string, keyof typeof SUPERNOVA_IMAGES.nodeEmblems> = {
  'sn-1-1': 'speak',
  'sn-1-2': 'grammar',
  'sn-1-3': 'daily',
  'sn-1-4': 'career',
  'sn-1-5': 'daily',
  'sn-2-1': 'speak',
  'sn-2-2': 'grammar',
  'sn-2-3': 'daily',
  'sn-2-4': 'grammar',
  'sn-2-5': 'speak',
  'sn-3-1': 'career',
  'sn-3-2': 'daily',
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

export const COURSE_NODE_IMAGES: { [key: number]: { colored: any; grayscale: any } } = {
  1: {
    colored: SUPERNOVA_IMAGES.nodeEmblems.speak,
    grayscale: SUPERNOVA_IMAGES.nodeEmblems.speak,
  },
  2: {
    colored: SUPERNOVA_IMAGES.nodeEmblems.grammar,
    grayscale: SUPERNOVA_IMAGES.nodeEmblems.grammar,
  },
  3: {
    colored: SUPERNOVA_IMAGES.nodeEmblems.daily,
    grayscale: SUPERNOVA_IMAGES.nodeEmblems.daily,
  },
  4: {
    colored: SUPERNOVA_IMAGES.nodeEmblems.career,
    grayscale: SUPERNOVA_IMAGES.nodeEmblems.career,
  },
};
