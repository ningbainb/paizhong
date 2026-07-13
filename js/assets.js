/**
 * 游戏美术资源映射
 */
const ASSETS = {
  /** 大框架壳层（全屏/顶栏/侧栏/托盘） */
  shell: {
    appBg: 'assets/shell/app_bg.jpg',
    battleBg: 'assets/shell/battle_bg.jpg',
    titleHall: 'assets/shell/title_hall.jpg',
    header: 'assets/shell/header.jpg',
    handTray: 'assets/shell/hand_tray.jpg',
    sidebar: 'assets/shell/sidebar.jpg',
    panel: 'assets/shell/panel.jpg',
    modal: 'assets/shell/modal.jpg',
    outerFrame: 'assets/shell/outer_frame.jpg',
    contentFrame: 'assets/shell/content_frame.jpg',
    tableFrame: 'assets/shell/table_frame.jpg',
    victoryFull: 'assets/shell/victory_full.jpg',
    defeatFull: 'assets/shell/defeat_full.jpg',
  },
  ui: {
    titleBg: 'assets/ui/title_bg.jpg',
    seal: 'assets/ui/seal.jpg',
    cardBack: 'assets/ui/card_back.jpg',
    tableFelt: 'assets/ui/table_felt.jpg',
    enemy: 'assets/ui/enemy.jpg',
    boss: 'assets/ui/boss.jpg',
    shopBg: 'assets/ui/shop_bg.jpg',
    mapBg: 'assets/ui/map_bg.jpg',
    resultBg: 'assets/ui/result_bg.jpg',
    weeklyBanner: 'assets/ui/weekly_banner.jpg',
    dailyBanner: 'assets/ui/daily_banner.jpg',
    charBg: 'assets/ui/char_bg.jpg',
    modeBg: 'assets/ui/mode_bg.jpg',
    helpBg: 'assets/ui/help_bg.jpg',
    codexBg: 'assets/ui/codex_bg.jpg',
    rankBg: 'assets/ui/rank_bg.jpg',
    metaBg: 'assets/ui/meta_bg.jpg',
    frameCommon: 'assets/ui/frame_common.jpg',
    frameRare: 'assets/ui/frame_rare.jpg',
    frameLegend: 'assets/ui/frame_legend.jpg',
    frameCursed: 'assets/ui/frame_cursed.jpg',
    /** 新手引导 */
    guidePanel: 'assets/ui/guide/panel.jpg',
    guideSeal: 'assets/ui/guide/seal.jpg',
    guideDivider: 'assets/ui/guide/divider.jpg',
    guideMentor: 'assets/ui/guide/icon_mentor.jpg',
    guideScore: 'assets/ui/guide/icon_score.jpg',
    guideHand: 'assets/ui/guide/icon_hand.jpg',
    guidePlay: 'assets/ui/guide/icon_play.jpg',
    guideShop: 'assets/ui/guide/icon_shop.jpg',
  },
  fx: {
    breakVictory: 'assets/fx/break_victory.jpg',
    defeat: 'assets/fx/defeat.jpg',
  },
  hands: {
    single: 'assets/hands/single.jpg',
    pair: 'assets/hands/pair.jpg',
    triple: 'assets/hands/triple.jpg',
    straight: 'assets/hands/straight.jpg',
    consecutive_pairs: 'assets/hands/consecutive_pairs.jpg',
    airplane: 'assets/hands/airplane.jpg',
    bomb: 'assets/hands/bomb.jpg',
    rocket: 'assets/hands/rocket.jpg',
  },
  xinfa: {
    single: 'assets/xinfa/single.jpg',
    pair: 'assets/xinfa/pair.jpg',
    triple: 'assets/xinfa/triple.jpg',
    straight: 'assets/xinfa/straight.jpg',
    consecutive_pairs: 'assets/xinfa/consecutive_pairs.jpg',
    airplane: 'assets/xinfa/airplane.jpg',
    bomb: 'assets/xinfa/bomb.jpg',
    rocket: 'assets/xinfa/rocket.jpg',
  },
  icons: {
    xinfa: 'assets/icons/xinfa.jpg',
    jinnang: 'assets/icons/jinnang.jpg',
    bomb: 'assets/icons/bomb.jpg',
    endless: 'assets/icons/endless.jpg',
    sfxOn: 'assets/icons/sfx_on.jpg',
    sfxOff: 'assets/icons/sfx_off.jpg',
    draw: 'assets/icons/draw.jpg',
    pass: 'assets/icons/pass.jpg',
    play: 'assets/icons/play.jpg',
    hint: 'assets/icons/hint.jpg',
    shield: 'assets/icons/shield.jpg',
    suit_heart: 'assets/icons/suit_heart.jpg',
    suit_spade: 'assets/icons/suit_spade.jpg',
    suit_diamond: 'assets/icons/suit_diamond.jpg',
    suit_club: 'assets/icons/suit_club.jpg',
    fenghou: 'assets/icons/fenghou.jpg',
    niliu: 'assets/icons/niliu.jpg',
    baibian: 'assets/icons/baibian.jpg',
    dongpai: 'assets/icons/dongpai.jpg',
    jifan: 'assets/icons/jifan.jpg',
    sansheng: 'assets/icons/sansheng.jpg',
    huangu: 'assets/icons/huangu.jpg',
    yinshe: 'assets/icons/yinshe.jpg',
    touliang: 'assets/icons/touliang.jpg',
    jiehuo_jg: 'assets/icons/jiehuo_jg.jpg',
    qingxin_jg: 'assets/icons/qingxin_jg.jpg',
    baoqi: 'assets/icons/baoqi.jpg',
  },
  achieve: {
    bronze: 'assets/achieve/bronze.jpg',
    silver: 'assets/achieve/silver.jpg',
    gold: 'assets/achieve/gold.jpg',
    diamond: 'assets/achieve/diamond.jpg',
    // 分类主题徽章
    victory: 'assets/achieve/victory.jpg',
    realm: 'assets/achieve/realm.jpg',
    bomb: 'assets/achieve/bomb.jpg',
    flush: 'assets/achieve/flush.jpg',
    endless: 'assets/achieve/endless.jpg',
    build: 'assets/achieve/build.jpg',
    skill: 'assets/achieve/skill.jpg',
    meta: 'assets/achieve/meta.jpg',
    challenge: 'assets/achieve/challenge.jpg',
    daily: 'assets/achieve/daily.jpg',
    chars: 'assets/achieve/chars.jpg',
  },
  /** 奇牌图鉴主题印记 */
  qipai: {
    chain: 'assets/qipai/chain.jpg',
    single: 'assets/qipai/single.jpg',
    pair: 'assets/qipai/pair.jpg',
    straight: 'assets/qipai/straight.jpg',
    bomb: 'assets/qipai/bomb.jpg',
    flush: 'assets/qipai/flush.jpg',
    jiguan: 'assets/qipai/jiguan.jpg',
    shield: 'assets/qipai/shield.jpg',
    qi: 'assets/qipai/qi.jpg',
    xinfa: 'assets/qipai/xinfa.jpg',
    tianming: 'assets/qipai/tianming.jpg',
    legend: 'assets/qipai/legend.jpg',
    cursed: 'assets/qipai/cursed.jpg',
    locked: 'assets/qipai/locked.jpg',
  },
  diff: {
    normal: 'assets/diff/normal.jpg',
    hard: 'assets/diff/hard.jpg',
    master: 'assets/diff/master.jpg',
    legend: 'assets/diff/legend.jpg',
    endless: 'assets/diff/endless.jpg',
  },
  sects: {
    压牌宗: 'assets/sects/yapai.jpg',
    变数堂: 'assets/sects/bianshu.jpg',
    天命阁: 'assets/sects/tianming.jpg',
    千机门: 'assets/sects/qianji.jpg',
    谍影盟: 'assets/sects/dieying.jpg',
    牌宗: 'assets/sects/yapai.jpg',
  },
  chars: {
    shen: 'assets/chars/shen.jpg',
    liu: 'assets/chars/liu.jpg',
    bu: 'assets/chars/bu.jpg',
    lu: 'assets/chars/lu.jpg',
    ying: 'assets/chars/ying.jpg',
    lu_gui: 'assets/chars/lu_gui.jpg',
    han_mei: 'assets/chars/han_mei.jpg',
    su_ye: 'assets/chars/su_ye.jpg',
    qing_lan: 'assets/chars/qing_lan.jpg',
    mo_qi: 'assets/chars/mo_qi.jpg',
  },
  charPortrait(id) {
    return this.chars[id] || this.ui.seal;
  },
  sectIcon(sectName) {
    return this.sects[sectName] || this.ui.seal;
  },
  frameForRarity(rarity) {
    if (rarity === 'rare') return this.ui.frameRare || this.ui.frame_rare;
    if (rarity === 'legend') return this.ui.frameLegend || this.ui.frame_legend;
    if (rarity === 'cursed') return this.ui.frameCursed || this.ui.frame_cursed;
    return this.ui.frameCommon || this.ui.frame_common;
  },
  /**
   * 根据奇牌效果/id 推断主题图标 key
   */
  qipaiThemeKey(q) {
    if (!q) return 'qi';
    if (q.icon && this.qipai[q.icon]) return q.icon;
    if (q.rarity === 'cursed') return 'cursed';
    if (q.rarity === 'legend') {
      // 传说默认金印，特定主题可覆盖
    }
    const t = (q.effect && q.effect.type) || '';
    const id = q.id || '';
    const hand = (q.effect && q.effect.hand) || '';

    if (/tianming|flush|tonghua|mingdeng|shunshi|shiming|tianji|wanxiang|all_tianming/i.test(t + id)) return 'tianming';
    if (/flush/.test(t) || hand === 'flush') return 'flush';
    if (/bomb|rocket|tiansha|baozha|canhuo|jieshi|fenshen|miedao|burn/i.test(t + id + hand)) return 'bomb';
    if (/jiguan|ling|er_lian|pozhu|huangu/i.test(t + id)) return 'jiguan';
    if (/shield|huti|shouhu|canhuo|baoqi/i.test(t + id)) return 'shield';
    if (/xinfa|jing_yan|wanfa/i.test(t + id)) return 'xinfa';
    if (/chain|lianchang|pozhu|er_lian|combo|initiative/i.test(t + id)) return 'chain';
    if (hand === 'straight' || /straight|shun|chang_shun|shunmai|liandui|airplane|yunchi/i.test(t + id + hand)) return 'straight';
    if (hand === 'pair' || /pair|duifeng|shuangxiu|er_lian/i.test(t + id + hand)) return 'pair';
    if (hand === 'single' || /single|guzhu|xiaobao/i.test(t + id + hand)) return 'single';
    if (/discard|houqin|duanwei|huangu/i.test(t + id)) return 'jiguan';
    if (q.rarity === 'legend') return 'legend';
    if (/qi|zhuang|wenhuo|chuxin|qingshou|jichu|pass|xipai|softcap|gucheng|kongcheng|nizhan|jieqi|fengmo|blood|guming|lunhui/i.test(t + id)) return 'qi';
    return 'qi';
  },
  /** 奇牌主题图：未见则显示锁定 */
  qipaiIcon(q, seen = true) {
    if (!seen) return this.qipai.locked;
    const key = this.qipaiThemeKey(q);
    return this.qipai[key] || this.qipai.qi;
  },
  enemyPortrait(isBoss) {
    return isBoss ? this.ui.boss : this.ui.enemy;
  },
  jiguanIcon(id) {
    return this.icons[id] || this.icons.baibian || this.ui.seal;
  },
  diffIcon(id) {
    return this.diff[id] || this.diff.normal;
  },
  jinnangIcon() {
    return this.icons.jinnang;
  },
  xinfaIcon(type) {
    if (type && this.xinfa[type]) return this.xinfa[type];
    return this.icons.xinfa;
  },
  suitIcon(suitId) {
    const map = {
      heart: this.icons.suit_heart,
      spade: this.icons.suit_spade,
      diamond: this.icons.suit_diamond,
      club: this.icons.suit_club,
    };
    return map[suitId] || this.ui.seal;
  },
  /** 成就主题徽章（优先 icon 字段，否则按分类） */
  achieveTheme(ach) {
    if (ach && ach.icon && this.achieve[ach.icon]) return this.achieve[ach.icon];
    const catMap = {
      journey: 'realm',
      skill: 'skill',
      build: 'build',
      challenge: 'challenge',
      meta: 'meta',
    };
    const key = catMap[ach && ach.cat] || 'bronze';
    return this.achieve[key] || this.achieve.bronze;
  },
  /** 档位边框/未解锁用金属章 */
  achieveTierBadge(ach, unlocked) {
    const tier = (ach && ach.tier) || this._tierFromYueli(ach && ach.yueli);
    if (!unlocked) return this.achieve.bronze;
    if (tier === 'diamond') return this.achieve.diamond;
    if (tier === 'gold') return this.achieve.gold;
    if (tier === 'silver') return this.achieve.silver;
    return this.achieve.bronze;
  },
  _tierFromYueli(y) {
    y = y || 0;
    if (y >= 150) return 'diamond';
    if (y >= 80) return 'gold';
    if (y >= 30) return 'silver';
    return 'bronze';
  },
  /** 成就主图：已解锁用主题图，未解锁用铜章灰显 */
  achieveBadge(ach, unlocked) {
    if (unlocked) return this.achieveTheme(ach);
    return this.achieve.bronze;
  },
  handIcon(type) {
    if (type === 'triple_one' || type === 'triple_two') {
      return this.hands.triple || this.icons.play;
    }
    return this.hands[type] || this.icons.play;
  },
};

// 已请求资源去重：页面切换时只为当前页面补齐所需素材，避免首屏并发抢占全部图片。
const PRELOADED_ASSET_URLS = new Set();

function preloadAssetUrls(urls) {
  [...new Set(urls.filter(Boolean))].forEach(src => {
    if (PRELOADED_ASSET_URLS.has(src)) return;
    PRELOADED_ASSET_URLS.add(src);
    const img = new Image();
    img.src = src;
  });
}

/** 首屏只预取壳层与标题页资源；页面本身仍会正常加载其 CSS 背景。 */
function preloadAssets() {
  preloadAssetUrls([
    ASSETS.shell.appBg,
    ASSETS.shell.header,
    ASSETS.shell.outerFrame,
    ASSETS.shell.contentFrame,
    ASSETS.shell.titleHall,
    ASSETS.ui.titleBg,
    ASSETS.ui.seal,
  ]);
}

/** 在进入对应页面后补齐该页面的图标和插画，不抢占首屏带宽。 */
function preloadAssetsForScreen(screen) {
  const values = (obj) => Object.values(obj || {});
  let urls = [];
  switch (screen) {
    case 'mode':
      urls = [ASSETS.ui.modeBg, ...values(ASSETS.diff)];
      break;
    case 'char':
      urls = [ASSETS.ui.charBg, ...values(ASSETS.sects), ...values(ASSETS.chars)];
      break;
    case 'map':
      urls = [ASSETS.ui.mapBg];
      break;
    case 'qipai':
    case 'codex':
      urls = [ASSETS.ui.codexBg, ASSETS.ui.frameCommon, ASSETS.ui.frameRare, ASSETS.ui.frameLegend,
        ASSETS.ui.frameCursed, ...values(ASSETS.qipai)];
      break;
    case 'battle':
      urls = [ASSETS.shell.battleBg, ASSETS.shell.sidebar, ASSETS.shell.handTray, ASSETS.shell.tableFrame,
        ASSETS.ui.tableFelt, ASSETS.ui.cardBack, ASSETS.ui.enemy, ASSETS.ui.boss,
        ...values(ASSETS.icons), ...values(ASSETS.hands)];
      break;
    case 'shop':
      urls = [ASSETS.ui.shopBg, ...values(ASSETS.xinfa), ...values(ASSETS.qipai)];
      break;
    case 'result':
      urls = [ASSETS.ui.resultBg, ...values(ASSETS.fx)];
      break;
    case 'help':
      urls = [ASSETS.ui.helpBg, ...values(ASSETS.hands)];
      break;
    case 'achieve':
      urls = [...values(ASSETS.achieve)];
      break;
    case 'meta':
      urls = [ASSETS.ui.metaBg];
      break;
    case 'rank':
      urls = [ASSETS.ui.rankBg];
      break;
    case 'weekly':
      urls = [ASSETS.ui.weeklyBanner];
      break;
    default:
      return;
  }
  preloadAssetUrls(urls);
}
