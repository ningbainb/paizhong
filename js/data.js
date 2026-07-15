/**
 * 《牌宗》完整内容数据 — 支撑长线复玩（8 境 + 无尽 + 元进度）
 */

const SUITS = [
  { id: 'spade', symbol: '♠', color: 'black', name: '黑桃' },
  { id: 'heart', symbol: '♥', color: 'red', name: '红桃' },
  { id: 'club', symbol: '♣', color: 'black', name: '梅花' },
  { id: 'diamond', symbol: '♦', color: 'red', name: '方块' },
];

const RANKS = [
  { id: '3', label: '3', order: 3, li: 3 },
  { id: '4', label: '4', order: 4, li: 4 },
  { id: '5', label: '5', order: 5, li: 5 },
  { id: '6', label: '6', order: 6, li: 6 },
  { id: '7', label: '7', order: 7, li: 7 },
  { id: '8', label: '8', order: 8, li: 8 },
  { id: '9', label: '9', order: 9, li: 9 },
  { id: '10', label: '10', order: 10, li: 10 },
  { id: 'J', label: 'J', order: 11, li: 11 },
  { id: 'Q', label: 'Q', order: 12, li: 12 },
  { id: 'K', label: 'K', order: 13, li: 13 },
  { id: 'A', label: 'A', order: 14, li: 15 },
  { id: '2', label: '2', order: 15, li: 18 },
  { id: 'BJ', label: '小王', order: 16, li: 25, joker: true },
  { id: 'RJ', label: '大王', order: 17, li: 30, joker: true },
];

const HAND_TYPES = {
  single: { id: 'single', name: '单张', qi: 1.0, min: 1 },
  pair: { id: 'pair', name: '对子', qi: 1.4, min: 2 },
  triple: { id: 'triple', name: '三张', qi: 1.8, min: 3 },
  triple_one: { id: 'triple_one', name: '三带一', qi: 2.0, min: 4 },
  triple_two: { id: 'triple_two', name: '三带二', qi: 2.15, min: 5 },
  straight: { id: 'straight', name: '顺子', qi: 2.2, min: 5 },
  consecutive_pairs: { id: 'consecutive_pairs', name: '连对', qi: 2.6, min: 6 },
  airplane: { id: 'airplane', name: '飞机', qi: 3.0, min: 6 },
  bomb: { id: 'bomb', name: '炸弹', qi: 4.2, min: 4 },
  rocket: { id: 'rocket', name: '火箭', qi: 6.5, min: 2 },
};

// 完整 8 境门槛（方案曲线）+ 无尽在运行时生成
const REALM_THRESHOLDS = [
  { realm: 1, name: '第一境·初窥', stages: [
    { type: 'ming', name: '明局', threshold: 260 },
    { type: 'an', name: '暗局', threshold: 480, modifiers: ['hand_minus_1'] },
    { type: 'zong', name: '宗主局', threshold: 760, boss: 'shen' },
  ]},
  { realm: 2, name: '第二境·入门', stages: [
    { type: 'ming', name: '明局', threshold: 420 },
    { type: 'an', name: '暗局', threshold: 720, modifiers: ['tianming_hidden'] },
    { type: 'zong', name: '宗主局', threshold: 1100, boss: 'liu' },
  ]},
  { realm: 3, name: '第三境·小成', stages: [
    { type: 'ming', name: '明局', threshold: 680 },
    { type: 'an', name: '暗局', threshold: 1100, modifiers: ['jiguan_cost_up'] },
    { type: 'zong', name: '宗主局', threshold: 1650, boss: 'bu' },
  ]},
  { realm: 4, name: '第四境·破障', stages: [
    { type: 'ming', name: '明局', threshold: 1000 },
    { type: 'an', name: '暗局', threshold: 1600, modifiers: ['enemy_boost'] },
    { type: 'zong', name: '宗主局', threshold: 2400, boss: 'lu' },
  ]},
  { realm: 5, name: '第五境·通玄', stages: [
    { type: 'ming', name: '明局', threshold: 1500 },
    { type: 'an', name: '暗局', threshold: 2300, modifiers: ['xinmo_start', 'hand_minus_1'] },
    { type: 'zong', name: '宗主局', threshold: 3450, boss: 'ying' },
  ]},
  { realm: 6, name: '第六境·合道', stages: [
    { type: 'ming', name: '明局', threshold: 2400 },
    { type: 'an', name: '暗局', threshold: 3600, modifiers: ['no_bomb_qi', 'tianming_hidden'] },
    { type: 'zong', name: '宗主局', threshold: 5400, boss: 'gui' },
  ]},
  { realm: 7, name: '第七境·绝巅', stages: [
    { type: 'ming', name: '明局', threshold: 3600, modifiers: ['pass_xinmo'] },
    { type: 'an', name: '暗局', threshold: 5400, modifiers: ['enemy_boost', 'qi_cap_down'] },
    { type: 'zong', name: '宗主局', threshold: 8200, boss: 'void' },
  ]},
  { realm: 8, name: '第八境·归一', stages: [
    { type: 'ming', name: '明局', threshold: 5200, modifiers: ['score_tax'] },
    { type: 'an', name: '暗局', threshold: 8000, modifiers: ['hand_minus_2', 'xinmo_start', 'enemy_boost'] },
    { type: 'zong', name: '宗主局', threshold: 12000, boss: 'paizong' },
  ]},
];

const QI_CAP = { early: 8, mid: 12, late: 16, end: 20 };

// 难度：影响门槛、敌方、奖励
const DIFFICULTIES = [
  { id: 'normal', name: '常道', desc: '标准门槛与奖励，适合熟悉规则', mult: 1.0, reward: 1.0, enemy: 1.0, unlockYueli: 0 },
  { id: 'hard', name: '险途', desc: '门槛×1.28，守关者更狠，阅历+45%', mult: 1.28, reward: 1.45, enemy: 1.25, unlockYueli: 80 },
  { id: 'master', name: '宗师', desc: '门槛×1.65，心魔易涨，阅历+90%，掉落更好', mult: 1.65, reward: 1.9, enemy: 1.5, unlockYueli: 300 },
  { id: 'legend', name: '传说', desc: '门槛×2.15，极限构筑挑战，阅历×2.7', mult: 2.15, reward: 2.7, enemy: 1.75, unlockYueli: 900 },
];

// 无尽词条池
const ENDLESS_MODIFIERS = [
  { id: 'double_tianming', name: '双天命', desc: '本层两个天命花色', apply: 'double_tianming' },
  { id: 'qi_rain', name: '灵雨', desc: '每回合开始气+0.3', apply: 'qi_rain' },
  { id: 'thin_hand', name: '薄牌', desc: '起手少 2 张', apply: 'hand_minus_2' },
  { id: 'fat_enemy', name: '强敌', desc: '守关者进度+30%', apply: 'enemy_boost' },
  { id: 'bomb_tax', name: '禁炸令', desc: '炸弹基础气-1.0', apply: 'no_bomb_qi' },
  { id: 'jiguan_storm', name: '千机雨', desc: '开局多 2 张机关', apply: 'extra_jiguan' },
  { id: 'flush_king', name: '花王', desc: '同花额外+15%牌理', apply: 'flush_extra' },
  { id: 'pass_pain', name: '心魔潮', desc: '过牌额外+1心魔', apply: 'pass_xinmo' },
  { id: 'score_tax', name: '重压', desc: '得分×0.9，但顿悟+50%', apply: 'score_tax' },
  { id: 'wild_start', name: '百变开局', desc: '开局获得百变×1', apply: 'gift_baibian' },
  { id: 'qi_cap_crush', name: '气脉紧缩', desc: '气上限-2', apply: 'qi_cap_down' },
  { id: 'hand_pinch', name: '束手', desc: '起手少 1 张', apply: 'hand_minus_1' },
  { id: 'xinmo_dawn', name: '心魔初醒', desc: '开局心魔+2', apply: 'xinmo_start' },
  { id: 'tianming_veil', name: '天命隐', desc: '天命花色隐藏', apply: 'tianming_hidden' },
  { id: 'enemy_surge', name: '守关涨势', desc: '守关者进度再抬高', apply: 'enemy_boost' },
];

const CHARACTERS = [
  {
    id: 'shen', name: '沈惊寒', sect: '压牌宗', role: '炸弹压制', color: '#4a7cff',
    skill: '镇魂斩', skillDesc: '炸弹/火箭压过对手后多摸1张。非炸弹连出为下次炸弹+0.2气。',
    passive: { type: 'bomb_draw', bombQiStack: 0.2 }, unlockYueli: 0,
  },
  {
    id: 'liu', name: '柳千变', sect: '变数堂', role: '奇牌构筑', color: '#c44dff',
    skill: '千变引', skillDesc: '选奇牌 4 选 1。可放弃一张奇牌换 1 宗势令。',
    passive: { type: 'extra_qipai_choice', choices: 4 }, unlockYueli: 0,
  },
  {
    id: 'bu', name: '卜天姬', sect: '天命阁', role: '花色预判', color: '#ffb020',
    skill: '天机测', skillDesc: '可看牌堆顶 3 张花色。连续两次同花后下次天命翻倍。',
    passive: { type: 'peek_suits', count: 3 }, unlockYueli: 0,
  },
  {
    id: 'lu', name: '鲁小巧', sect: '千机门', role: '机关循环', color: '#20c997',
    skill: '百宝囊', skillDesc: '机关使用后 30% 不消耗；未消耗时气+0.3。',
    passive: { type: 'jiguan_save', chance: 0.3 }, unlockYueli: 50,
  },
  {
    id: 'ying', name: '影十三', sect: '谍影盟', role: '反击欺诈', color: '#e63946',
    skill: '伪装', skillDesc: '被守关者成功压制后，下次出牌气+1。',
    passive: { type: 'counter_qi', amount: 1 }, unlockYueli: 50,
  },
  {
    id: 'lu_gui', name: '陆归一', sect: '牌宗', role: '均衡成长', color: '#f4d35e',
    skill: '归一诀', skillDesc: '五种基础心法视为+1。五宗连携后宗势×1.25。',
    passive: { type: 'xinfa_bonus', amount: 1, zongshi: 1.25 }, unlockYueli: 200,
  },
  {
    id: 'han_mei', name: '寒梅', sect: '压牌宗', role: '连压节奏', color: '#7ec8e3',
    skill: '梅开二度', skillDesc: '连续成功压牌时，第 2/3/4 次额外气+0.3/0.5/0.8。',
    passive: { type: 'chain_qi_scale', scales: [0, 0.3, 0.5, 0.8] }, unlockYueli: 150,
  },
  {
    id: 'su_ye', name: '苏野', sect: '变数堂', role: '残卷专家', color: '#9b59b6',
    skill: '野火', skillDesc: '残卷奇牌效果增强 25%，但开局心魔+1。',
    passive: { type: 'cursed_boost', amount: 0.25, xinmo: 1 }, unlockYueli: 400,
  },
  {
    id: 'qing_lan', name: '青岚', sect: '天命阁', role: '同花宗师', color: '#2ecc71',
    skill: '岚色', skillDesc: '同花出牌额外牌理+12，且同花时气+0.4。',
    passive: { type: 'flush_master', li: 12, qi: 0.4 }, unlockYueli: 350,
  },
  {
    id: 'mo_qi', name: '墨七', sect: '千机门', role: '机关大师', color: '#1abc9c',
    skill: '七窍', skillDesc: '每局机关令+1；每使用 3 次机关，抽 1 张机关。',
    passive: { type: 'jiguan_master', tokens: 1, every: 3 }, unlockYueli: 500,
  },
];

// ========== 奇牌大卡池（60+）==========
const QIPAI_POOL = [
  // 普通 18
  { id: 'lianchang', name: '连场', rarity: 'common', desc: '连续成功压牌，第二次起气+0.6', effect: { type: 'chain_qi', amount: 0.6 }, unlock: 0 },
  { id: 'xipai', name: '惜牌', rarity: 'common', desc: '过牌时气+0.4，本局最多 3 次', effect: { type: 'pass_qi', amount: 0.4, max: 3 }, unlock: 0 },
  { id: 'guzhu', name: '孤注', rarity: 'common', desc: '单张牌理+50%', effect: { type: 'single_li_pct', amount: 0.5 }, unlock: 0 },
  { id: 'shunmai', name: '顺脉', rarity: 'common', desc: '顺子额外+0.5 气', effect: { type: 'hand_qi', hand: 'straight', amount: 0.5 }, unlock: 0 },
  { id: 'shuangxiu', name: '双修', rarity: 'common', desc: '对子得分后，下次三张牌理+5', effect: { type: 'pair_to_triple', amount: 5 }, unlock: 0 },
  { id: 'canhuo', name: '残火', rarity: 'common', desc: '炸弹后未通关获得 1 护体', effect: { type: 'bomb_shield' }, unlock: 0 },
  { id: 'duifeng', name: '对锋', rarity: 'common', desc: '对子气+0.4', effect: { type: 'hand_qi', hand: 'pair', amount: 0.4 }, unlock: 0 },
  { id: 'sancai', name: '三才印', rarity: 'common', desc: '三张牌理+8', effect: { type: 'hand_li', hand: 'triple', amount: 8 }, unlock: 20 },
  { id: 'xiaobao', name: '小报', rarity: 'common', desc: '单张成功压制后气+0.25', effect: { type: 'single_beat_qi', amount: 0.25 }, unlock: 20 },
  { id: 'houqin', name: '后勤', rarity: 'common', desc: '每弃 1 张，下一次出牌牌理+4', effect: { type: 'discard_li', per: 1, amount: 4 }, unlock: 40 },
  { id: 'wenhuo', name: '文火', rarity: 'common', desc: '得分低于 40 时，该次气+0.8', effect: { type: 'low_score_qi', threshold: 40, amount: 0.8 }, unlock: 40 },
  { id: 'jichu', name: '厚积', rarity: 'common', desc: '手牌≥12 时牌理+6', effect: { type: 'handcount_li', min: 12, amount: 6 }, unlock: 60 },
  { id: 'qingshou', name: '清手', rarity: 'common', desc: '手牌≤8 时气+0.5', effect: { type: 'handcount_qi', max: 8, amount: 0.5 }, unlock: 60 },
  { id: 'liandui_mai', name: '连珠', rarity: 'common', desc: '连对气+0.4', effect: { type: 'hand_qi', hand: 'consecutive_pairs', amount: 0.4 }, unlock: 80 },
  { id: 'yunchi', name: '云翅', rarity: 'common', desc: '飞机气+0.5', effect: { type: 'hand_qi', hand: 'airplane', amount: 0.5 }, unlock: 80 },
  { id: 'pingwen', name: '平稳', rarity: 'common', desc: '心魔上限视为 6（更难爆）', effect: { type: 'xinmo_cap', amount: 6 }, unlock: 100 },
  { id: 'chuxin', name: '初心', rarity: 'common', desc: '本局第一次出牌气+1.0', effect: { type: 'first_play_qi', amount: 1.0 }, unlock: 100 },
  { id: 'shouhu', name: '守护', rarity: 'common', desc: '开局获得 1 层护体', effect: { type: 'start_shield', amount: 1 }, unlock: 120 },

  // 罕见 20
  { id: 'jiguan_lianhuan', name: '机关连环', rarity: 'rare', desc: '每用 1 机关，之后出牌气+0.2，最多+1.2', effect: { type: 'jiguan_qi', per: 0.2, max: 1.2 }, unlock: 0 },
  { id: 'tianming_huixiang', name: '天命回响', rarity: 'rare', desc: '同花出牌牌理额外+25%', effect: { type: 'flush_li_pct', amount: 0.25 }, unlock: 0 },
  { id: 'jieshi', name: '借势', rarity: 'rare', desc: '炸弹后下一次出牌气+1.5', effect: { type: 'after_bomb_qi', amount: 1.5 }, unlock: 0 },
  { id: 'pozhu', name: '破竹', rarity: 'rare', desc: '连续三次压牌后抽 1 机关', effect: { type: 'chain3_jiguan' }, unlock: 0 },
  { id: 'huangu_shenghua', name: '换骨生花', rarity: 'rare', desc: '每弃 2 张，下次出牌牌理+10', effect: { type: 'discard_li', per: 2, amount: 10 }, unlock: 0 },
  { id: 'mingdeng', name: '明灯', rarity: 'rare', desc: '首次触发天命花色获 1 锦囊', effect: { type: 'tianming_jinnang' }, unlock: 0 },
  { id: 'tonghua_jue', name: '同花诀', rarity: 'rare', desc: '同花时气+0.8', effect: { type: 'flush_qi', amount: 0.8 }, unlock: 80 },
  { id: 'shunshi_qiang', name: '顺势强化', rarity: 'rare', desc: '顺势气改为+0.8', effect: { type: 'shunshi_boost', amount: 0.8 }, unlock: 80 },
  { id: 'baozha_xue', name: '爆学问', rarity: 'rare', desc: '炸弹牌理+15', effect: { type: 'hand_li', hand: 'bomb', amount: 15 }, unlock: 120 },
  { id: 'qipai_xin', name: '奇心', rarity: 'rare', desc: '每拥有 1 张奇牌，气+0.15（最多+0.9）', effect: { type: 'qipai_count_qi', per: 0.15, max: 0.9 }, unlock: 120 },
  { id: 'xinfa_tong', name: '心法通', rarity: 'rare', desc: '所有心法等级视为+1', effect: { type: 'all_xinfa', amount: 1 }, unlock: 150 },
  { id: 'jiguan_ling', name: '机令', rarity: 'rare', desc: '开局机关令+2', effect: { type: 'start_tokens', amount: 2 }, unlock: 150 },
  { id: 'fanji', name: '反制印', rarity: 'rare', desc: '被压制后下次牌理+10', effect: { type: 'counter_li', amount: 10 }, unlock: 180 },
  { id: 'chang_shun', name: '长龙', rarity: 'rare', desc: '顺子每多 1 张，气+0.15', effect: { type: 'straight_len_qi', per: 0.15 }, unlock: 180 },
  { id: 'er_lian', name: '二连斩', rarity: 'rare', desc: '同回合若用机关再出牌，气+1.0', effect: { type: 'jiguan_then_play', amount: 1.0 }, unlock: 200 },
  { id: 'tianming_all', name: '万象', rarity: 'rare', desc: '所有花色均视为半个天命（+1 牌理/张）', effect: { type: 'all_tianming_half' }, unlock: 220 },
  { id: 'huti_tie', name: '铁护', rarity: 'rare', desc: '护体生效时回复 80 分进度差', effect: { type: 'shield_heal', amount: 80 }, unlock: 220 },
  { id: 'zhuang_qi', name: '壮气', rarity: 'rare', desc: '气软上限+3', effect: { type: 'qi_cap_bonus', amount: 3 }, unlock: 250 },
  { id: 'duo_chou', name: '多筹', rarity: 'rare', desc: '通关顿悟+15', effect: { type: 'clear_dunwu', amount: 15 }, unlock: 250 },
  { id: 'jing_yan', name: '精研', rarity: 'rare', desc: '藏经阁心法升级费用-5', effect: { type: 'shop_xinfa_discount', amount: 5 }, unlock: 280 },

  // 传说 12
  { id: 'wuzonghui', name: '五宗会', rarity: 'legend', desc: '出过单/对/三/顺/炸后，下一手宗势×1.5', effect: { type: 'five_types_zongshi', amount: 1.5 }, unlock: 100 },
  { id: 'wanfa_guizong', name: '万法归宗', rarity: 'legend', desc: '本局首次牌型心法视为+2', effect: { type: 'first_hand_xinfa', amount: 2 }, unlock: 100 },
  { id: 'zongzhu_sheling', name: '宗主赦令', rarity: 'legend', desc: '宗主局首次失败可续命，门槛+20%', effect: { type: 'boss_revive', thresholdPct: 0.2 }, unlock: 150 },
  { id: 'tiansha_linmen', name: '天煞临门', rarity: 'legend', desc: '火箭宗势×1.3，火箭后心魔+2', effect: { type: 'rocket_zongshi', amount: 1.3, xinmo: 2 }, unlock: 200 },
  { id: 'qiankun', name: '乾坤袋', rarity: 'legend', desc: '每场开局抽 3 张并弃 1 张', effect: { type: 'start_draw_discard', draw: 3, discard: 1 }, unlock: 300 },
  { id: 'taixu', name: '太虚', rarity: 'legend', desc: '每 5 次出牌，下一次宗势×1.35', effect: { type: 'every_n_zongshi', n: 5, amount: 1.35 }, unlock: 350 },
  { id: 'jiuzhuan', name: '九转', rarity: 'legend', desc: '气超过上限部分按 70% 折算（更优）', effect: { type: 'softcap_better', rate: 0.7 }, unlock: 400 },
  { id: 'hunyuan', name: '混元', rarity: 'legend', desc: '所有基础牌型气+0.25', effect: { type: 'all_hand_qi', amount: 0.25 }, unlock: 450 },
  { id: 'pozong', name: '破宗戟', rarity: 'legend', desc: '对宗主局得分×1.2', effect: { type: 'boss_score', amount: 1.2 }, unlock: 500 },
  { id: 'tianji_shu', name: '天机书', rarity: 'legend', desc: '开局揭示天命；同花额外+10%牌理', effect: { type: 'reveal_and_flush', pct: 0.1 }, unlock: 550 },
  { id: 'wuxing', name: '五行轮', rarity: 'legend', desc: '每使用过 1 种牌型，全局气+0.1', effect: { type: 'type_diversity_qi', per: 0.1 }, unlock: 600 },
  { id: 'zongshi_ling', name: '宗势印', rarity: 'legend', desc: '开局获得 1 宗势令', effect: { type: 'start_zongshi', amount: 1 }, unlock: 650 },

  // 残卷 12
  { id: 'fengmo', name: '疯魔', rarity: 'cursed', desc: '气永久+2，每 4 回合手牌上限-1', effect: { type: 'fengmo', qi: 2, every: 4 }, unlock: 80 },
  { id: 'duanwei', name: '断尾', rarity: 'cursed', desc: '装备弃最大牌，之后开局牌理+12', effect: { type: 'duanwei', li: 12 }, unlock: 80 },
  { id: 'gucheng', name: '孤城', rarity: 'cursed', desc: '手牌<5 气+2；>10 气-1', effect: { type: 'gucheng', low: 5, high: 10, lowQi: 2, highQi: -1 }, unlock: 100 },
  { id: 'guming', name: '赌命', rarity: 'cursed', desc: '下次出牌宗势×1.6；未通关心魔+3', effect: { type: 'guming', zongshi: 1.6, xinmo: 3 }, unlock: 100 },
  { id: 'xuejie', name: '血契', rarity: 'cursed', desc: '得分×1.25，但每次出牌心魔+1', effect: { type: 'blood_pact', mult: 1.25 }, unlock: 200 },
  { id: 'kongcheng', name: '空城', rarity: 'cursed', desc: '手牌上限-3，所有出牌气+1.2', effect: { type: 'empty_city', hand: -3, qi: 1.2 }, unlock: 250 },
  { id: 'nizhan', name: '逆战', rarity: 'cursed', desc: '进度落后时气+1.5，领先时气-0.5', effect: { type: 'underdog', behind: 1.5, ahead: -0.5 }, unlock: 300 },
  { id: 'fenshen', name: '焚身', rarity: 'cursed', desc: '炸弹气+1.5，非炸弹气-0.4', effect: { type: 'burn_body', bombQi: 1.5, other: -0.4 }, unlock: 350 },
  { id: 'shiming', name: '失明', rarity: 'cursed', desc: '天命始终隐藏，但所有牌理+8', effect: { type: 'blind_tianming', li: 8 }, unlock: 400 },
  { id: 'jieqi', name: '劫气', rarity: 'cursed', desc: '气上限-4，但宗势×1.2 常驻下一手可叠', effect: { type: 'jieqi', cap: -4, zongshi: 1.2 }, unlock: 450 },
  { id: 'lunhui', name: '轮回债', rarity: 'cursed', desc: '失败不扣，但通关门槛永久本局+10%', effect: { type: 'samsara', pct: 0.1 }, unlock: 500 },
  { id: 'miedao', name: '灭道', rarity: 'cursed', desc: '只能通过炸弹/火箭/顺子得分（其他×0.3）', effect: { type: 'only_big', types: ['bomb', 'rocket', 'straight'], mult: 0.3 }, unlock: 600 },
];

const JIGUAN_POOL = [
  { id: 'fenghou', name: '封喉', desc: '守关者下轮不能主动出牌', cost: 1, effect: { type: 'skip_enemy' } },
  { id: 'niliu', name: '逆流', desc: '削减守关者进度 40', cost: 0, effect: { type: 'switch_ai' } },
  { id: 'baibian', name: '百变', desc: '1 张牌临时视为指定点数', cost: 0, effect: { type: 'wild_rank' } },
  { id: 'dongpai', name: '冻牌', desc: '冻结守关者最高 1 张牌', cost: 0, effect: { type: 'freeze_enemy' } },
  { id: 'jifan', name: '急返', desc: '削减守关者进度', cost: 1, effect: { type: 'cancel_score' } },
  { id: 'sansheng', name: '三省', desc: '清空当前选牌重选', cost: 0, effect: { type: 'undo' } },
  { id: 'huangu', name: '换骨', desc: '弃 1 抽 1', cost: 0, effect: { type: 'discard_draw' } },
  { id: 'yinshe', name: '引蛇', desc: '摸 2 张，心魔+1', cost: 0, effect: { type: 'draw2_xinmo' } },
  { id: 'touliang', name: '偷梁', desc: '从守关者手中偷 1 张随机牌', cost: 1, effect: { type: 'steal_card' } },
  { id: 'jiehuo_jg', name: '借火', desc: '下次出牌气+1.2', cost: 0, effect: { type: 'next_qi', amount: 1.2 } },
  { id: 'qingxin_jg', name: '清心', desc: '心魔-2', cost: 0, effect: { type: 'clear_xinmo', amount: 2 } },
  { id: 'baoqi', name: '爆气', desc: '获得 1 层护体，心魔+1', cost: 0, effect: { type: 'shield_xinmo' } },
];

const XINFA = {
  single: { id: 'single', name: '单锋诀', perLevel: { li: 2, qi: 0.1 }, max: 5 },
  pair: { id: 'pair', name: '双环诀', perLevel: { li: 3, qi: 0.2 }, max: 5 },
  triple: { id: 'triple', name: '三才诀', perLevel: { li: 4 }, max: 5 },
  straight: { id: 'straight', name: '游龙诀', perLevel: { li: 3, flushQi: 0.2 }, max: 5 },
  consecutive_pairs: { id: 'consecutive_pairs', name: '连珠诀', perLevel: { qi: 0.25 }, max: 5 },
  airplane: { id: 'airplane', name: '云翼诀', perLevel: { qi: 0.3 }, max: 5 },
  bomb: { id: 'bomb', name: '雷火诀', perLevel: { li: 6, qi: 0.25 }, max: 5 },
  rocket: { id: 'rocket', name: '天煞诀', perLevel: { li: 8 }, max: 5, oncePerGame: true },
};

const JINNANG_POOL = [
  { id: 'yirong', name: '易容符', desc: '1 张手牌临时改点数' },
  { id: 'kuitian', name: '窥天镜', desc: '查看守关者 1 张牌' },
  { id: 'juqi', name: '聚气丹', desc: '下次出牌气+2.5' },
  { id: 'huichun', name: '回春丹', desc: '取回 1 张已用机关' },
  { id: 'liepai', name: '裂牌咒', desc: '拆对子，一张牌理翻倍' },
  { id: 'qingxin', name: '清心散', desc: '清除 2 层心魔' },
  { id: 'jiehuo', name: '借火令', desc: '本回合可额外用 1 机关' },
  { id: 'dunjia', name: '遁甲符', desc: '立即抽 2 张' },
  { id: 'pojun', name: '破军符', desc: '守关者进度-100' },
  { id: 'zongshi_dan', name: '宗势丹', desc: '获得 1 宗势令' },
];

const BOSS_RULES = {
  shen: { name: '沈惊寒·镇魂', desc: '炸弹基础气-0.8，溢出可转护体', bombQi: -0.8, overflowShield: true },
  liu: { name: '柳千变·千机', desc: '残卷出现率提升', cursedBoost: true },
  bu: { name: '卜天姬·天机', desc: '天命每 3 回合变化', tianmingRotate: 3 },
  lu: { name: '鲁小巧·百宝', desc: '机关费-1，每用 2 次机关+1 心魔', jiguanCost: -1, jiguanXinmo: 2 },
  ying: { name: '影十三·诡道', desc: '被压制时敌方额外+30 进度', enemyCounter: 30 },
  gui: { name: '陆归一·合道', desc: '必须至少使用 3 种牌型才能破境加分满额（否则得分×0.85）', needTypes: 3 },
  void: { name: '虚空守关', desc: '每 4 回合门槛+5%', thresholdCreep: 0.05, every: 4 },
  paizong: { name: '牌宗本尊', desc: '气上限-3；炸弹与火箭气-0.5；通关额外顿悟', qiCap: -3, bombQi: -0.5, clearBonus: 40 },
};

const RARITY_LABEL = { common: '普通', rare: '罕见', legend: '传说', cursed: '残卷' };
const RARITY_COLOR = { common: '#a0aec0', rare: '#4299e1', legend: '#ed8936', cursed: '#e53e3e' };

/**
 * 新手引导步骤
 * when: 所在界面 screen 名
 * highlight: CSS 选择器（可空）
 * placement: 卡片位置 top|bottom|center
 * waitAction: 可选，等待玩家操作再允许下一步 select|play
 */
/**
 * 新手引导步骤
 * when: title | battle | shop | any — 期望界面；跨屏会暂停并在对应界面续播
 * waitAction: select | play — 互动练习（纸面重看模式可跳过）
 */
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    when: 'title',
    title: '欢迎入门 · 牌宗',
    body: '这是一款「斗地主式压牌 + 分数破关」的单人论道。<br><br><b>核心一句话</b>：像斗地主一样出牌压过对手，得分累加，<b>分数达到门槛即破境</b>，不必出完手牌。<br><br>约 1 分钟带你走通核心循环。',
    placement: 'center',
    highlight: null,
    icon: 'guideMentor',
    badge: '入门',
  },
  {
    id: 'score',
    when: 'battle',
    title: '① 破境目标',
    body: '左侧进度条：<b>你</b> 与 <b>守关者</b> 各自冲分。<br>你的分数 ≥ 门槛 → <b>破境成功</b>。<br>守关者先满 → 落败（可用护体抵挡一次）。',
    placement: 'right',
    highlight: '.score-bars',
    icon: 'guideScore',
    badge: '目标',
  },
  {
    id: 'hand',
    when: 'battle',
    title: '② 选牌成组',
    body: '点手牌中的<b>一张</b>，会自动选中合法牌型（对子、顺子、炸弹等）。<br>再点同一组可<b>轮换</b>其它方案；Shift+点可微调。<br>双击可直接出牌。',
    placement: 'top',
    highlight: '#hand-cards',
    waitAction: 'select',
    icon: 'guideHand',
    badge: '选牌',
  },
  {
    id: 'play',
    when: 'battle',
    title: '③ 出牌得分',
    body: '得分 ≈ <b>牌理 × 气 × 宗势</b>。<br>同花、天命花色、连压、巧压都能加气/加分。<br>选好后点「出牌」或按 <kbd>空格</kbd>。可破境时按钮会变绿。',
    placement: 'top',
    highlight: '#btn-play',
    waitAction: 'play',
    icon: 'guidePlay',
    badge: '出牌',
  },
  {
    id: 'beat',
    when: 'battle',
    title: '④ 压牌与过牌',
    body: '对手出牌后，你需出<b>同型且更大</b>的牌，或用炸弹/火箭越级。<br>压不过：点「过牌」交出主动权（略增气，连续过牌涨心魔）。<br>也可「摸牌」补手，或用「提示」看推荐。',
    placement: 'top',
    highlight: '#action-bar',
    icon: 'guidePlay',
    badge: '压牌',
  },
  {
    id: 'tools',
    when: 'battle',
    title: '⑤ 机关与锦囊',
    body: '牌桌下方的<strong>机关托盘</strong>是本回合技能：点按钮发动。<br>右上角显示「令」与「本回合次数」；带费用的会标「N 令」。<br>锦囊是一次性道具，在藏经阁购买后出现。',
    placement: 'top',
    highlight: '#util-tray',
    icon: 'guideMentor',
    badge: '机关',
  },
  {
    id: 'shop',
    when: 'shop',
    title: '⑥ 藏经阁构筑',
    body: '破境后进入藏经阁：用<b>顿悟</b>升级心法、买奇牌与锦囊。<br>奇牌是本局被动，不进手牌。<br>点「继续论道」进入下一关，途中可能触发<b>奇遇</b>。',
    placement: 'center',
    highlight: '#screen-shop .shop-grid',
    icon: 'guideShop',
    badge: '构筑',
  },
  {
    id: 'meta',
    when: 'title',
    title: '⑦ 长线成长',
    body: '标题页可查看：<b>奇牌图鉴、成就、阅历阁</b>。<br>阅历永久解锁卡池与开局胚；成就也给阅历。<br>还有每日挑战、本周禁宗、无尽层里程碑。',
    placement: 'center',
    highlight: null,
    icon: 'guideMentor',
    badge: '长线',
  },
  {
    id: 'done',
    when: 'title',
    title: '入门完成',
    body: '准备好了！建议先打<b>常道 · 沈惊寒</b>熟悉压牌节奏。<br>随时可在「玩法说明」复习，或点「新手引导」重看本教学。<br><br>祝你早日五宗归一，成就牌宗。',
    placement: 'center',
    highlight: '#btn-start',
    icon: 'guideSeal',
    badge: '启程',
  },
];
const CODEX_RARITY_ORDER = ['common', 'rare', 'legend', 'cursed'];
const CODEX_RARITY_TABS = [
  { id: 'all', name: '全部' },
  { id: 'common', name: '普通' },
  { id: 'rare', name: '罕见' },
  { id: 'legend', name: '传说' },
  { id: 'cursed', name: '残卷' },
  { id: 'seen', name: '已见' },
  { id: 'unseen', name: '未见' },
];

// 成就分类
const ACHIEVE_CATS = [
  { id: 'journey', name: '论道之路' },
  { id: 'skill', name: '牌术精进' },
  { id: 'build', name: '构筑奇缘' },
  { id: 'challenge', name: '绝境试炼' },
  { id: 'meta', name: '藏经阅历' },
];

/**
 * 成就定义
 * cat: 分类 id
 * icon: ASSETS.achieve 键名（分类主题徽章）
 * tier: bronze|silver|gold|diamond 展示档（也可由 yueli 推断）
 * progress: { type, target } 可选进度条
 */
const ACHIEVEMENTS = [
  // —— 论道之路 ——
  { id: 'first_win', name: '初破', desc: '首次通关任意一局', yueli: 10, cat: 'journey', icon: 'victory', tier: 'bronze' },
  { id: 'realm1', name: '一境通', desc: '通关第一境宗主', yueli: 20, cat: 'journey', icon: 'realm', tier: 'bronze' },
  { id: 'realm3', name: '三境成', desc: '通关第三境宗主', yueli: 40, cat: 'journey', icon: 'realm', tier: 'silver' },
  { id: 'realm5', name: '五境立', desc: '通关第五境宗主', yueli: 70, cat: 'journey', icon: 'realm', tier: 'silver' },
  { id: 'realm8', name: '八境归一', desc: '通关第八境宗主', yueli: 150, cat: 'journey', icon: 'realm', tier: 'diamond' },
  { id: 'endless10', name: '无尽十层', desc: '无尽达到 10 层', yueli: 80, cat: 'journey', icon: 'endless', tier: 'gold', progress: { type: 'endless', target: 10 } },
  { id: 'endless20', name: '无尽二十', desc: '无尽达到 20 层', yueli: 120, cat: 'journey', icon: 'endless', tier: 'gold', progress: { type: 'endless', target: 20 } },
  { id: 'endless30', name: '无尽三十', desc: '无尽达到 30 层', yueli: 200, cat: 'journey', icon: 'endless', tier: 'diamond', progress: { type: 'endless', target: 30 } },
  { id: 'endless50', name: '无尽五十', desc: '无尽达到 50 层', yueli: 350, cat: 'journey', icon: 'endless', tier: 'diamond', progress: { type: 'endless', target: 50 } },
  { id: 'endless75', name: '无尽七十五', desc: '无尽达到 75 层', yueli: 450, cat: 'journey', icon: 'endless', tier: 'diamond', progress: { type: 'endless', target: 75 } },
  { id: 'endless100', name: '百层牌宗', desc: '无尽达到 100 层', yueli: 600, cat: 'journey', icon: 'endless', tier: 'diamond', progress: { type: 'endless', target: 100 } },
  { id: 'event5', name: '奇缘客', desc: '累计触发 5 次关间奇遇', yueli: 40, cat: 'journey', icon: 'build', tier: 'silver', progress: { type: 'events', target: 5 } },
  { id: 'event20', name: '天机满袖', desc: '累计触发 20 次关间奇遇', yueli: 100, cat: 'journey', icon: 'build', tier: 'gold', progress: { type: 'events', target: 20 } },
  { id: 'milestone_all', name: '层楼尽览', desc: '领取全部无尽里程碑奖励（至 50 层）', yueli: 200, cat: 'journey', icon: 'endless', tier: 'diamond' },

  // —— 牌术精进 ——
  { id: 'bomb_king', name: '炸弹客', desc: '单局使用炸弹/火箭 5 次', yueli: 25, cat: 'skill', icon: 'bomb', tier: 'bronze' },
  { id: 'bomb_legend', name: '炸裂宗', desc: '单局使用炸弹/火箭 10 次', yueli: 60, cat: 'skill', icon: 'bomb', tier: 'gold' },
  { id: 'flush_master', name: '花色师', desc: '单局同花出牌 4 次', yueli: 25, cat: 'skill', icon: 'flush', tier: 'bronze' },
  { id: 'flush_legend', name: '花色宗', desc: '单局同花出牌 8 次', yueli: 55, cat: 'skill', icon: 'flush', tier: 'gold' },
  { id: 'big_hand', name: '一掌破境', desc: '单手得分 ≥ 500', yueli: 30, cat: 'skill', icon: 'skill', tier: 'silver', progress: { type: 'maxHand', target: 500 } },
  { id: 'big_hand_2', name: '千钧一掷', desc: '单手得分 ≥ 1500', yueli: 80, cat: 'skill', icon: 'skill', tier: 'gold', progress: { type: 'maxHand', target: 1500 } },
  { id: 'big_hand_3', name: '破天一击', desc: '单手得分 ≥ 3000', yueli: 160, cat: 'skill', icon: 'skill', tier: 'diamond', progress: { type: 'maxHand', target: 3000 } },
  { id: 'combo_chain', name: '连压如风', desc: '连续成功压牌 6 次', yueli: 35, cat: 'skill', icon: 'skill', tier: 'silver', progress: { type: 'maxChain', target: 6 } },
  { id: 'combo_chain_10', name: '十连不绝', desc: '连续成功压牌 10 次', yueli: 90, cat: 'skill', icon: 'skill', tier: 'gold', progress: { type: 'maxChain', target: 10 } },
  { id: 'no_pass', name: '不停手', desc: '一局内从不主动过牌并通关', yueli: 35, cat: 'skill', icon: 'victory', tier: 'silver' },
  { id: 'rocket_once', name: '双王问天', desc: '任意一局打出火箭', yueli: 20, cat: 'skill', icon: 'bomb', tier: 'bronze' },
  { id: 'perfect_clear', name: '余韵未绝', desc: '破境时手牌剩余 ≥ 8 张', yueli: 45, cat: 'skill', icon: 'victory', tier: 'silver' },

  // —— 构筑奇缘 ——
  { id: 'qipai3', name: '起步奇缘', desc: '单次论道集齐 3 张奇牌', yueli: 15, cat: 'build', icon: 'build', tier: 'bronze' },
  { id: 'qipai5', name: '构筑师', desc: '单次论道集齐 5 张奇牌', yueli: 30, cat: 'build', icon: 'build', tier: 'silver' },
  { id: 'qipai8', name: '奇牌宗', desc: '单次论道集齐 8 张奇牌', yueli: 60, cat: 'build', icon: 'build', tier: 'gold' },
  { id: 'qipai12', name: '满袖乾坤', desc: '单次论道集齐 12 张奇牌', yueli: 120, cat: 'build', icon: 'build', tier: 'diamond' },
  { id: 'xinfa_max', name: '心法大成', desc: '单次论道将任一心法升至 5 级', yueli: 40, cat: 'build', icon: 'build', tier: 'silver' },
  { id: 'xinfa_dual', name: '双修', desc: '单次论道有 2 种心法 ≥ 3 级', yueli: 50, cat: 'build', icon: 'build', tier: 'gold' },
  { id: 'cursed_win', name: '残卷问道', desc: '持有至少 1 张残卷并通关一局', yueli: 55, cat: 'build', icon: 'build', tier: 'gold' },

  // —— 绝境试炼 ——
  { id: 'hard_clear', name: '险途客', desc: '险途难度通关第三境', yueli: 80, cat: 'challenge', icon: 'challenge', tier: 'gold' },
  { id: 'master_clear', name: '宗师令', desc: '宗师难度通关第五境', yueli: 150, cat: 'challenge', icon: 'challenge', tier: 'diamond' },
  { id: 'legend_clear', name: '传说之座', desc: '传说难度通关第八境', yueli: 400, cat: 'challenge', icon: 'challenge', tier: 'diamond' },
  { id: 'hard_realm1', name: '险途启程', desc: '险途难度通关第一境', yueli: 40, cat: 'challenge', icon: 'challenge', tier: 'silver' },
  { id: 'weekly1', name: '禁宗客', desc: '完成 1 次本周禁宗挑战', yueli: 50, cat: 'challenge', icon: 'daily', tier: 'silver' },
  { id: 'weekly3', name: '周行三禁', desc: '累计完成 3 次周常禁宗（跨周）', yueli: 120, cat: 'challenge', icon: 'daily', tier: 'gold', progress: { type: 'weeklyDone', target: 3 } },
  { id: 'puzzle1', name: '残局入门', desc: '通关 1 个残局', yueli: 25, cat: 'challenge', icon: 'skill', tier: 'bronze', progress: { type: 'puzzles', target: 1 } },
  { id: 'puzzle5', name: '残谱半卷', desc: '通关 5 个残局', yueli: 60, cat: 'challenge', icon: 'skill', tier: 'silver', progress: { type: 'puzzles', target: 5 } },
  { id: 'puzzle10', name: '残谱成册', desc: '通关 10 个残局', yueli: 90, cat: 'challenge', icon: 'skill', tier: 'gold', progress: { type: 'puzzles', target: 10 } },
  { id: 'puzzle15', name: '残谱精通', desc: '通关 15 个残局', yueli: 120, cat: 'challenge', icon: 'skill', tier: 'gold', progress: { type: 'puzzles', target: 15 } },
  { id: 'puzzle_all', name: '残谱尽解', desc: '通关全部残局', yueli: 200, cat: 'challenge', icon: 'skill', tier: 'diamond', progress: { type: 'puzzlesFull', target: 0 } },
  { id: 'puzzle_master', name: '三星解客', desc: '任意 3 个残局打出三星', yueli: 80, cat: 'challenge', icon: 'skill', tier: 'gold', progress: { type: 'puzzleStars3', target: 3 } },
  { id: 'puzzle_master10', name: '十星解宗', desc: '任意 10 个残局打出三星', yueli: 160, cat: 'challenge', icon: 'skill', tier: 'diamond', progress: { type: 'puzzleStars3', target: 10 } },

  // —— 藏经阅历 ——
  { id: 'all_chars', name: '千面', desc: '用全部牌客各通关一局', yueli: 100, cat: 'meta', icon: 'chars', tier: 'gold', progress: { type: 'charWins', target: 0 } },
  { id: 'collector', name: '藏经人', desc: '图鉴解锁 40 张奇牌', yueli: 100, cat: 'meta', icon: 'meta', tier: 'gold', progress: { type: 'seen', target: 40 } },
  { id: 'collector_full', name: '经库尽收', desc: '图鉴解锁全部奇牌', yueli: 250, cat: 'meta', icon: 'meta', tier: 'diamond', progress: { type: 'seenFull', target: 0 } },
  { id: 'play10', name: '初入道', desc: '累计开始 10 次论道', yueli: 20, cat: 'meta', icon: 'meta', tier: 'bronze', progress: { type: 'games', target: 10 } },
  { id: 'play50', name: '牌痴', desc: '累计开始 50 次论道', yueli: 50, cat: 'meta', icon: 'meta', tier: 'silver', progress: { type: 'games', target: 50 } },
  { id: 'play200', name: '牌魔', desc: '累计开始 200 次论道', yueli: 150, cat: 'meta', icon: 'meta', tier: 'diamond', progress: { type: 'games', target: 200 } },
  { id: 'yueli1k', name: '阅尽', desc: '累计获得 1000 阅历', yueli: 50, cat: 'meta', icon: 'meta', tier: 'silver', progress: { type: 'yueli', target: 1000 } },
  { id: 'yueli5k', name: '阅尽千山', desc: '累计获得 5000 阅历', yueli: 150, cat: 'meta', icon: 'meta', tier: 'gold', progress: { type: 'yueli', target: 5000 } },
  { id: 'daily3', name: '日课', desc: '完成 3 次每日论道', yueli: 40, cat: 'meta', icon: 'daily', tier: 'silver', progress: { type: 'daily', target: 3 } },
  { id: 'daily7', name: '七日禅', desc: '完成 7 次每日论道', yueli: 80, cat: 'meta', icon: 'daily', tier: 'gold', progress: { type: 'daily', target: 7 } },
  { id: 'shop_buy', name: '藏经初购', desc: '在阅历商店购置任意一项', yueli: 25, cat: 'meta', icon: 'meta', tier: 'bronze' },
];

/**
 * 阅历永久商店
 * cat: pool | start | growth | combat | utility
 * type/max/amount/effectHint 供 UI 与 getMetaBonuses 使用
 * effectHint 中 {v}=amount*lv，{lv}=等级，{pct}=百分数
 */
const META_SHOP_CATS = [
  { id: 'all', name: '全部' },
  { id: 'pool', name: '卡池' },
  { id: 'start', name: '开局胚' },
  { id: 'combat', name: '论道术' },
  { id: 'growth', name: '收益' },
  { id: 'utility', name: '便利' },
];

const META_SHOP = [
  // ========== 卡池（6）==========
  { id: 'unlock_pool_1', name: '开卡池·初窥', cat: 'pool', type: 'pool', maxUnlock: 100, cost: 50,
    desc: '可抽奇牌门槛 ≤100，拓宽常见构筑。', tip: '入门优先', effectHint: '卡池 ≤100' },
  { id: 'unlock_pool_1b', name: '开卡池·小成', cat: 'pool', type: 'pool', maxUnlock: 150, cost: 90,
    desc: '可抽奇牌门槛 ≤150。', effectHint: '卡池 ≤150' },
  { id: 'unlock_pool_2', name: '开卡池·深入', cat: 'pool', type: 'pool', maxUnlock: 250, cost: 140,
    desc: '可抽奇牌门槛 ≤250，罕见牌增多。', effectHint: '卡池 ≤250' },
  { id: 'unlock_pool_2b', name: '开卡池·精进', cat: 'pool', type: 'pool', maxUnlock: 350, cost: 200,
    desc: '可抽奇牌门槛 ≤350。', effectHint: '卡池 ≤350' },
  { id: 'unlock_pool_3', name: '开卡池·通玄', cat: 'pool', type: 'pool', maxUnlock: 450, cost: 260,
    desc: '可抽奇牌门槛 ≤450，传说向出现。', effectHint: '卡池 ≤450' },
  { id: 'unlock_pool_3b', name: '开卡池·大成', cat: 'pool', type: 'pool', maxUnlock: 650, cost: 360,
    desc: '可抽奇牌门槛 ≤650，残卷边缘也可见。', effectHint: '卡池 ≤650' },
  { id: 'unlock_pool_4', name: '开卡池·尽藏', cat: 'pool', type: 'pool', maxUnlock: 9999, cost: 480,
    desc: '解锁全部奇牌，藏经再无未见之牌。', tip: '终局目标', effectHint: '卡池全开' },

  // ========== 开局胚（12）==========
  { id: 'start_dunwu', name: '顿悟胚', cat: 'start', type: 'stack', max: 5, amount: 12, cost: 70,
    desc: '开局顿悟 +12/层（最高 +60）。首关就能升心法。', tip: '构筑流首选', effectHint: '开局顿悟 +{v}' },
  { id: 'start_dunwu_plus', name: '顿悟果', cat: 'start', type: 'stack', max: 3, amount: 20, cost: 130,
    desc: '开局顿悟再 +20/层（与顿悟胚叠加）。', effectHint: '额外顿悟 +{v}' },
  { id: 'start_token', name: '机关胚', cat: 'start', type: 'stack', max: 3, amount: 1, cost: 90,
    desc: '开局机关令 +1/层。', effectHint: '机关令 +{lv}' },
  { id: 'jiguan_pack', name: '机匣', cat: 'start', type: 'stack', max: 3, amount: 1, cost: 85,
    desc: '开局多带 1 张随机机关（可叠 3）。', effectHint: '机关牌 +{lv}' },
  { id: 'start_jinnang', name: '锦囊胚', cat: 'start', type: 'stack', max: 3, amount: 1, cost: 80,
    desc: '开局随机锦囊 +1/层。', effectHint: '锦囊 ×{lv}' },
  { id: 'start_zongshi', name: '宗势胚', cat: 'start', type: 'stack', max: 3, amount: 1, cost: 100,
    desc: '开局宗势令 +1/层。', effectHint: '宗势令 +{lv}' },
  { id: 'hand_seed', name: '厚牌种', cat: 'start', type: 'stack', max: 2, amount: 1, cost: 120,
    desc: '开局手牌 +1/层（最高 +2）。', effectHint: '起手 +{v} 张' },
  { id: 'start_qi', name: '气脉种', cat: 'start', type: 'stack', max: 4, amount: 0.25, cost: 75,
    desc: '开局下一手气 +0.25/层。', effectHint: '下手数气 +{v}' },
  { id: 'shield_seed', name: '护体种', cat: 'start', type: 'stack', max: 1, amount: 1, cost: 110,
    desc: '开局 50% 获得 1 护体。', effectHint: '50% 护体' },
  { id: 'shield_seed2', name: '护体果', cat: 'start', type: 'stack', max: 1, amount: 1, cost: 180,
    desc: '开局必得 1 护体（与护体种叠加则稳 1 层）。', effectHint: '必得护体' },
  { id: 'xinfa_seed', name: '心法胚', cat: 'start', type: 'stack', max: 2, amount: 1, cost: 140,
    desc: '开局单/对/三/顺/炸 心法各 +1/层。', effectHint: '基础心法 +{lv}' },
  { id: 'endless_seed', name: '无尽胚', cat: 'start', type: 'stack', max: 5, amount: 18, cost: 80,
    desc: '无尽开局顿悟 +18/层。', effectHint: '无尽顿悟 +{v}' },
  { id: 'endless_token', name: '无尽机令', cat: 'start', type: 'stack', max: 2, amount: 1, cost: 100,
    desc: '仅无尽：开局机关令额外 +1/层。', effectHint: '无尽机关令 +{lv}' },

  // ========== 论道术（12）==========
  { id: 'first_qi', name: '起手势', cat: 'combat', type: 'stack', max: 3, amount: 0.12, cost: 65,
    desc: '本局第一手自由出牌气 +0.12/层。', effectHint: '首手气 +{v}' },
  { id: 'type_qi', name: '百型诀', cat: 'combat', type: 'stack', max: 3, amount: 0.08, cost: 70,
    desc: '牌型首见气 +0.08/层（叠在原有首见上）。', effectHint: '首见气 +{v}' },
  { id: 'clever_qi', name: '巧压诀', cat: 'combat', type: 'stack', max: 3, amount: 0.1, cost: 75,
    desc: '巧压（高 1～3 阶）额外气 +0.1/层。', effectHint: '巧压气 +{v}' },
  { id: 'chain_seed', name: '连压种', cat: 'combat', type: 'stack', max: 3, amount: 0.08, cost: 85,
    desc: '连压动量气上限提高，每层额外 +0.08 计入连压气。', effectHint: '连压气 +{v}' },
  { id: 'bomb_seed', name: '雷火种', cat: 'combat', type: 'stack', max: 3, amount: 0.2, cost: 95,
    desc: '炸弹/火箭额外气 +0.2/层。', effectHint: '炸/火气 +{v}' },
  { id: 'flush_seed', name: '同花种', cat: 'combat', type: 'stack', max: 3, amount: 0.05, cost: 90,
    desc: '同花出牌牌理再 +5%/层。', effectHint: '同花牌理 +{pct}%' },
  { id: 'pass_seed', name: '惜牌种', cat: 'combat', type: 'stack', max: 3, amount: 0.1, cost: 60,
    desc: '过牌蓄气额外 +0.1/层。', effectHint: '过牌气 +{v}' },
  { id: 'enemy_soft', name: '抑敌符', cat: 'combat', type: 'stack', max: 3, amount: 0.03, cost: 100,
    desc: '守关者破境门槛 -3%/层（最高 -9%）。', effectHint: '敌门槛 -{pct}%' },
  { id: 'qi_cap_seed', name: '气海种', cat: 'combat', type: 'stack', max: 3, amount: 1, cost: 80,
    desc: '气上限 +1/层。', effectHint: '气上限 +{v}' },
  { id: 'jiguan_turn', name: '连机诀', cat: 'combat', type: 'stack', max: 1, amount: 1, cost: 160,
    desc: '每回合可发动机关次数 +1（变为 2）。', tip: '千机流核心', effectHint: '每回合机关 ×2' },
  { id: 'draw_extra', name: '摸牌种', cat: 'combat', type: 'stack', max: 3, amount: 1, cost: 70,
    desc: '本局主动摸牌上限 +1/层（默认 6）。', effectHint: '摸牌上限 +{v}' },
  { id: 'beat_li', name: '压理种', cat: 'combat', type: 'stack', max: 3, amount: 2, cost: 85,
    desc: '成功压过守关者时，下一手牌理 +2/层。', effectHint: '压后牌理 +{v}' },

  // ========== 收益（10）==========
  { id: 'interest', name: '藏经息', cat: 'growth', type: 'stack', max: 8, amount: 0.08, cost: 60,
    desc: '破境顿悟 +8%/层（最高 +64%）。', tip: '正传复利', effectHint: '顿悟 +{pct}%' },
  { id: 'yueli_boost', name: '阅历种', cat: 'growth', type: 'stack', max: 5, amount: 0.12, cost: 90,
    desc: '结算阅历 +12%/层。', effectHint: '阅历 +{pct}%' },
  { id: 'yueli_flat', name: '阅历丹', cat: 'growth', type: 'stack', max: 5, amount: 3, cost: 70,
    desc: '每次破境额外固定 +3 阅历/层。', effectHint: '破境阅历 +{v}' },
  { id: 'event_luck', name: '奇缘种', cat: 'growth', type: 'stack', max: 4, amount: 1, cost: 85,
    desc: '关间奇遇率提高（可叠 4）。', effectHint: '奇遇率 ×{lv}' },
  { id: 'daily_boost', name: '日课种', cat: 'growth', type: 'stack', max: 3, amount: 0.2, cost: 75,
    desc: '每日挑战结算阅历 +20%/层。', effectHint: '每日阅历 +{pct}%' },
  { id: 'weekly_boost', name: '周常种', cat: 'growth', type: 'stack', max: 3, amount: 0.25, cost: 95,
    desc: '周常结算阅历 +25%/层。', effectHint: '周常阅历 +{pct}%' },
  { id: 'mile_boost', name: '层碑种', cat: 'growth', type: 'stack', max: 3, amount: 0.2, cost: 100,
    desc: '无尽里程碑阅历/顿悟 +20%/层。', effectHint: '里程碑 +{pct}%' },
  { id: 'clean_bonus', name: '净境种', cat: 'growth', type: 'stack', max: 3, amount: 4, cost: 70,
    desc: '干净破境额外顿悟 +4/层。', effectHint: '干净破境 +{v}' },
  { id: 'speed_bonus', name: '速破种', cat: 'growth', type: 'stack', max: 3, amount: 3, cost: 70,
    desc: '速破（≤12 回合）额外顿悟 +3/层。', effectHint: '速破 +{v}' },
  { id: 'diverse_bonus', name: '百戏种', cat: 'growth', type: 'stack', max: 3, amount: 3, cost: 65,
    desc: '牌型多样（≥4 型）额外顿悟 +3/层。', effectHint: '多样 +{v}' },

  // ========== 便利（10）==========
  { id: 'hint_plus', name: '牌眼', cat: 'utility', type: 'stack', max: 1, amount: 1, cost: 35,
    desc: '提示显示牌型与预估得分。', tip: '最便宜', effectHint: '强化提示' },
  { id: 'hint_pro', name: '天眼', cat: 'utility', type: 'stack', max: 1, amount: 1, cost: 90,
    desc: '提示额外显示是否可破境、气倍率摘要。', effectHint: '高级提示' },
  { id: 'soft_extra', name: '缓局符', cat: 'utility', type: 'stack', max: 4, amount: 2, cost: 75,
    desc: '软回合上限 +2/层。', effectHint: '软回合 +{v}' },
  { id: 'xinmo_seed', name: '清心根', cat: 'utility', type: 'stack', max: 2, amount: 1, cost: 85,
    desc: '心魔上限 +1/层。', effectHint: '心魔上限 +{v}' },
  { id: 'xinmo_start', name: '静心符', cat: 'utility', type: 'stack', max: 1, amount: 1, cost: 60,
    desc: '开局心魔 -1（不低于 0）。', effectHint: '开局心魔 -1' },
  { id: 'shop_choice', name: '慧眼种', cat: 'utility', type: 'stack', max: 2, amount: 1, cost: 110,
    desc: '选奇牌时选项 +1/层（在原有基础上）。', effectHint: '选牌 +{lv}' },
  { id: 'shop_discount', name: '廉贾符', cat: 'utility', type: 'stack', max: 3, amount: 0.08, cost: 100,
    desc: '藏经阁顿悟 consumable 价格视为 -8%/层（向上取整减免）。', effectHint: '店价 -{pct}%' },
  { id: 'log_detail', name: '战录', cat: 'utility', type: 'stack', max: 1, amount: 1, cost: 40,
    desc: '战报显示更详细的得分拆解关键词。', effectHint: '详细战报' },
  { id: 'retry_bonus', name: '再起种', cat: 'utility', type: 'stack', max: 2, amount: 8, cost: 55,
    desc: '使用「再开上一局」时开局顿悟 +8/层。', effectHint: '再开顿悟 +{v}' },
  { id: 'tianming_peek', name: '窥命', cat: 'utility', type: 'stack', max: 1, amount: 1, cost: 120,
    desc: '暗局/隐藏天命时，开局有 40% 直接揭示天命。', effectHint: '40% 揭天命' },
];

// 无尽里程碑：首次达到该层领取（meta.endlessMilestones）
const ENDLESS_MILESTONES = [
  { floor: 5, dunwu: 15, yueli: 20, name: '初入无尽' },
  { floor: 10, dunwu: 25, yueli: 35, name: '十层试炼' },
  { floor: 15, dunwu: 30, yueli: 40, name: '深渊十五' },
  { floor: 20, dunwu: 40, yueli: 55, name: '二十重楼' },
  { floor: 30, dunwu: 55, yueli: 80, name: '三十归一' },
  { floor: 40, dunwu: 70, yueli: 100, name: '四十不惑' },
  { floor: 50, dunwu: 100, yueli: 150, name: '五十圆满' },
  { floor: 75, dunwu: 120, yueli: 200, name: '七十五劫' },
  { floor: 100, dunwu: 180, yueli: 300, name: '百层牌宗' },
];

// 关间奇遇（破境后、藏经阁前/后可触发）
const STAGE_EVENTS = [
  {
    id: 'qi_rain',
    name: '灵雨夜',
    desc: '一夜灵雨，选择一种恩惠。',
    choices: [
      { id: 'dunwu', label: '顿悟 +18', apply: { dunwu: 18 } },
      { id: 'token', label: '机关令 +1', apply: { tokens: 1 } },
      { id: 'shield', label: '下局护体 +1', apply: { nextShield: 1 } },
    ],
  },
  {
    id: 'xinfa_scroll',
    name: '心法残页',
    desc: '捡到半页心法，选一门提升。',
    choices: [
      { id: 'single', label: '单锋诀 +1', apply: { xinfa: 'single', lv: 1 } },
      { id: 'pair', label: '双环诀 +1', apply: { xinfa: 'pair', lv: 1 } },
      { id: 'bomb', label: '雷火诀 +1', apply: { xinfa: 'bomb', lv: 1 } },
    ],
  },
  {
    id: 'merchant',
    name: '游方货郎',
    desc: '货郎低价换货（顿悟换物资）。',
    choices: [
      { id: 'buy_jn', label: '12 顿悟 → 随机锦囊', apply: { costDunwu: 12, jinnang: 1 } },
      { id: 'buy_token', label: '10 顿悟 → 机关令 +1', apply: { costDunwu: 10, tokens: 1 } },
      { id: 'leave', label: '婉拒离去', apply: {} },
    ],
  },
  {
    id: 'cursed_tempt',
    name: '残卷低语',
    desc: '一册残卷在耳边低语……',
    choices: [
      { id: 'take', label: '收下残卷（随机残卷奇牌）', apply: { randomCursed: 1 } },
      { id: 'burn', label: '付之一炬：顿悟 +22', apply: { dunwu: 22 } },
      { id: 'ignore', label: '充耳不闻', apply: {} },
    ],
  },
  {
    id: 'zongshi_trial',
    name: '宗势试炼',
    desc: '试炼台前，可换取宗势。',
    choices: [
      { id: 'get', label: '获得 1 宗势令', apply: { zongshi: 1 } },
      { id: 'trade', label: '花 15 顿悟再拿 1 令', apply: { costDunwu: 15, zongshi: 1 } },
      { id: 'skip', label: '不必', apply: {} },
    ],
  },
  {
    id: 'hand_fate',
    name: '牌运占卜',
    desc: '卜天姬的弟子愿替你改运。',
    choices: [
      { id: 'flush', label: '下局同花额外 +8% 牌理', apply: { nextFlushPct: 0.08 } },
      { id: 'tianming', label: '下局天命强制揭示', apply: { nextReveal: 1 } },
      { id: 'dunwu', label: '只要顿悟 +15', apply: { dunwu: 15 } },
    ],
  },
  {
    id: 'blood_pact_event',
    name: '血契香案',
    desc: '燃香可换一时之强。',
    choices: [
      { id: 'power', label: '下局开场气 +0.5（心魔 +1）', apply: { nextQi: 0.5, nextXinmo: 1 } },
      { id: 'heal', label: '心魔 -2（若战斗中）/ 顿悟 +10', apply: { clearXinmo: 2, dunwu: 10 } },
      { id: 'no', label: '不燃', apply: {} },
    ],
  },
  {
    id: 'qipai_forge',
    name: '奇牌锻台',
    desc: '可花费顿悟再抽一张奇牌三选一。',
    choices: [
      { id: 'forge', label: '25 顿悟 · 打开奇牌三选一', apply: { costDunwu: 25, openQipai: 1 } },
      { id: 'cheap', label: '15 顿悟 · 随机一张普通奇牌', apply: { costDunwu: 15, randomCommon: 1 } },
      { id: 'pass', label: '离开', apply: {} },
    ],
  },
];

// 周常禁宗挑战模板（按 ISO 周轮换）
const WEEKLY_CHALLENGES = [
  {
    id: 'no_bomb',
    name: '禁炸周',
    desc: '禁用炸弹流奇牌；炸弹基础气-1.2。顺子/连对加强。',
    bannedHands: [],
    bannedQipaiTags: ['bomb'],
    banQipaiIds: ['canhuo', 'jieshi', 'baozha_xue', 'fenshen', 'tiansha_linmen'],
    mods: ['no_bomb_qi'],
    extraBombQi: -0.4,
    bonus: { straightQi: 0.3, pairQi: 0.2 },
    rewardYueli: 40,
  },
  {
    id: 'jiguan_week',
    name: '千机周',
    desc: '机关流加强：开局多 2 机关、令+1；禁止残卷。',
    banRarity: ['cursed'],
    mods: ['extra_jiguan'],
    startTokens: 1,
    bonus: { jiguanQi: 0.15 },
    rewardYueli: 40,
  },
  {
    id: 'flush_week',
    name: '花色周',
    desc: '同花与天命双倍价值；暗局天命强制显示。',
    mods: ['flush_extra', 'double_tianming'],
    forceRevealTianming: true,
    bonus: { flushPct: 0.1 },
    rewardYueli: 45,
  },
  {
    id: 'thin_week',
    name: '薄牌周',
    desc: '起手少 2 张；孤城/清手类奇牌更强。低手牌气+0.4。',
    mods: ['hand_minus_2'],
    bonus: { lowHandQi: 0.4 },
    rewardYueli: 45,
  },
  {
    id: 'pass_week',
    name: '蓄势周',
    desc: '过牌蓄势×2，但过牌心魔+1；惜牌次数+2。',
    mods: ['pass_xinmo'],
    bonus: { passQiMul: 2, xipaiMax: 5 },
    rewardYueli: 40,
  },
  {
    id: 'all_type',
    name: '全能周',
    desc: '鼓励五宗会：每多一种牌型气+0.15；禁用只打炸弹的残卷灭道。',
    banQipaiIds: ['miedao', 'fenshen'],
    bonus: { diversity: 0.15 },
    rewardYueli: 50,
  },
  {
    id: 'hard_core',
    name: '苦修周',
    desc: '门槛×1.35，守关者更狠，通关顿悟与阅历+80%。',
    thresholdMul: 1.35,
    enemyMul: 1.25,
    rewardMul: 1.8,
    rewardYueli: 60,
  },
  {
    id: 'bomb_week',
    name: '炸裂周',
    desc: '炸弹/火箭气+0.4，但心魔上限-1；鼓励炸流。',
    mods: [],
    bonus: { bombQi: 0.4 },
    rewardYueli: 45,
  },
  {
    id: 'no_pass_week',
    name: '不停手周',
    desc: '过牌心魔+1；连续压牌气+0.2。逼你抢节奏。',
    mods: ['pass_xinmo'],
    bonus: { chainQi: 0.2 },
    rewardYueli: 50,
  },
  {
    id: 'legend_drop',
    name: '传说周',
    desc: '卡池传说权重提高；门槛×1.15。',
    thresholdMul: 1.15,
    preferLegend: true,
    rewardYueli: 55,
  },
];

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function getWeeklyChallenge(date = new Date()) {
  const key = getWeekKey(date);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % WEEKLY_CHALLENGES.length;
  return { key, challenge: WEEKLY_CHALLENGES[idx], index: idx };
}

/**
 * 残局论道：固定手牌/台面/门槛的短局解谜。
 * 牌码：H3/S10/DJ/CA/BJ/RJ（花色+点数，王为 BJ/RJ）
 *
 * pack: intro | advance | master | legend
 * star: 1–3 展示难度
 * unlockClears: 需已通关残局数量
 * unlockStars: 需累计最佳星级总和
 * maxRounds / starsByRound: 回合压力与评星
 */
const PUZZLE_PACKS = [
  { id: 'intro', name: '入门谱', desc: '熟悉点选与压牌' },
  { id: 'advance', name: '进阶谱', desc: '炸弹、同花与多手节奏' },
  { id: 'master', name: '宗师谱', desc: '紧回合与牌型精度' },
  { id: 'legend', name: '传说谱', desc: '极限门槛与复合解法' },
];

const PUZZLE_POOL = [
  // —— 入门 ——
  {
    id: 'p01_open', pack: 'intro', name: '开门见山',
    desc: '自由出牌。打出顺子或对子，一锤破境。',
    star: 1, unlockClears: 0,
    tip: '点 3-7 同花顺，或更大对子',
    charId: 'shen', threshold: 90, enemyThreshold: 9999,
    freePlay: true, maxRounds: 10, starsByRound: [3, 6],
    tianmingSuit: 'heart',
    playerHand: ['H3', 'H4', 'H5', 'H6', 'H7', 'S8', 'S9', 'C9', 'D2'],
    enemyHand: ['S3', 'C4', 'D5'],
    yueliFirst: 20, yueliWin: 6,
  },
  {
    id: 'p02_beat', pack: 'intro', name: '压过一记',
    desc: '守关者出了单张 5。用更大的单张压过即可破境。',
    star: 1, unlockClears: 0,
    tip: '单张要比 5 大；黑桃 A 带天命更赚',
    charId: 'liu', threshold: 28, enemyThreshold: 9999,
    freePlay: false, lastHand: ['S5'], lastPlayer: 'enemy',
    maxRounds: 8, starsByRound: [2, 5],
    tianmingSuit: 'spade',
    playerHand: ['H3', 'H4', 'C7', 'D9', 'SA', 'H2'],
    enemyHand: ['C3', 'D4'],
    yueliFirst: 20, yueliWin: 6,
  },
  {
    id: 'p03_pair', pack: 'intro', name: '对子破局',
    desc: '台面是对 6。用更大对子压过；天命方块可加牌理。',
    star: 1, unlockClears: 0,
    tip: '对 8 / 对 K 都能压；方块对更赚',
    charId: 'bu', threshold: 44, enemyThreshold: 9999,
    freePlay: false, lastHand: ['S6', 'H6'], lastPlayer: 'enemy',
    maxRounds: 8, starsByRound: [2, 5],
    tianmingSuit: 'diamond',
    playerHand: ['D8', 'C8', 'SK', 'HK', 'S3', 'H4', 'C5'],
    enemyHand: ['S4', 'C5'],
    yueliFirst: 22, yueliWin: 6,
  },
  {
    id: 'p04_triple', pack: 'intro', name: '三才初试',
    desc: '台面是对 5。同型更大对子可压；也可炸弹越级。',
    star: 1, unlockClears: 0,
    tip: '对 A 压对 5；炸弹也可越级',
    charId: 'shen', threshold: 50, enemyThreshold: 9999,
    freePlay: false, lastHand: ['S5', 'H5'], lastPlayer: 'enemy',
    maxRounds: 8, starsByRound: [2, 5],
    tianmingSuit: 'heart',
    playerHand: ['D8', 'S8', 'H8', 'CA', 'DA', 'C3', 'S4'],
    enemyHand: ['C3', 'D4'],
    yueliFirst: 22, yueliWin: 6,
  },
  {
    id: 'p05_single_race', pack: 'intro', name: '单骑破阵',
    desc: '自由出牌。用大单张连续推进，注意回合。',
    star: 1, unlockClears: 0,
    tip: '优先 2 / A / K 等大单；可多手',
    charId: 'liu', threshold: 60, enemyThreshold: 9999,
    freePlay: true, maxRounds: 8, starsByRound: [3, 6],
    tianmingSuit: 'spade',
    playerHand: ['S2', 'HA', 'CK', 'DQ', 'SJ', 'H9', 'C6', 'D4'],
    enemyHand: ['S3', 'H4'],
    yueliFirst: 22, yueliWin: 6,
  },

  // —— 进阶 ——
  {
    id: 'p06_straight', pack: 'advance', name: '顺势长驱',
    desc: '自由出牌。凑长顺或连对，一次接近破境。',
    star: 2, unlockClears: 2,
    tip: '8-9-10-J-Q 顺子气高；也可连对',
    charId: 'shen', threshold: 140, enemyThreshold: 9999,
    freePlay: true, maxRounds: 10, starsByRound: [3, 7],
    tianmingSuit: 'club',
    playerHand: ['C8', 'C9', 'C10', 'CJ', 'CQ', 'S8', 'H9', 'D3', 'D4', 'HA'],
    enemyHand: ['S3', 'H4', 'C5'],
    yueliFirst: 28, yueliWin: 8,
  },
  {
    id: 'p07_bomb', pack: 'advance', name: '炸开迷障',
    desc: '守关者打出长顺。普通牌压不过，请用炸弹破局。',
    star: 2, unlockClears: 2,
    tip: '四张 9 是炸弹，可越级压顺子',
    charId: 'liu', threshold: 160, enemyThreshold: 9999,
    freePlay: false, lastHand: ['S3', 'S4', 'S5', 'S6', 'S7'], lastPlayer: 'enemy',
    maxRounds: 8, starsByRound: [2, 5],
    tianmingSuit: 'spade',
    playerHand: ['H9', 'S9', 'C9', 'D9', 'H3', 'C4', 'D5', 'S2'],
    enemyHand: ['H3', 'C4'],
    yueliFirst: 30, yueliWin: 8,
  },
  {
    id: 'p08_flush', pack: 'advance', name: '同花点睛',
    desc: '自由出牌。尽量同花出牌吃 20% 牌理，一击破境。',
    star: 2, unlockClears: 3,
    tip: '红桃顺或红桃连张更赚；天命红桃',
    charId: 'qing_lan', threshold: 120, enemyThreshold: 9999,
    freePlay: true, maxRounds: 10, starsByRound: [3, 7],
    tianmingSuit: 'heart',
    playerHand: ['H5', 'H6', 'H7', 'H8', 'H9', 'S5', 'S6', 'C10', 'DK'],
    enemyHand: ['C3', 'D4', 'S5'],
    yueliFirst: 30, yueliWin: 8,
  },
  {
    id: 'p09_jiguan', pack: 'advance', name: '机关借力',
    desc: '手牌略散。可用「换骨」重整，或连出几手小牌破境。',
    star: 2, unlockClears: 3,
    tip: '点机关区用换骨；也可多手推进',
    charId: 'lu', threshold: 50, enemyThreshold: 9999,
    freePlay: true, maxRounds: 10, starsByRound: [4, 8],
    tianmingSuit: 'club',
    playerHand: ['C3', 'C5', 'C7', 'C9', 'SJ', 'HQ', 'HK', 'DA', 'S2'],
    enemyHand: ['H3', 'C4'],
    jiguanTokens: 2, jiguanIds: ['huangu'],
    yueliFirst: 32, yueliWin: 8,
  },
  {
    id: 'p10_pairs', pack: 'advance', name: '连对穿云',
    desc: '自由出牌。打出三连对（6-7-8）拿高气破境。',
    star: 2, unlockClears: 4,
    tip: '6-7-8 三连对气高；别拆散',
    charId: 'han_mei', threshold: 120, enemyThreshold: 9999,
    freePlay: true,
    maxRounds: 8, starsByRound: [3, 6],
    tianmingSuit: 'spade',
    playerHand: ['S6', 'H6', 'S7', 'H7', 'S8', 'H8', 'C3', 'D9', 'CA'],
    enemyHand: ['C3', 'D5'],
    yueliFirst: 34, yueliWin: 9,
  },
  {
    id: 'p11_beat_pair', pack: 'advance', name: '跟牌取势',
    desc: '需压过三张 6。打出后往往还需第二手凑分。',
    star: 2, unlockClears: 4,
    tip: '三张 8+ 或炸弹；破境分可能要两手',
    charId: 'bu', threshold: 90, enemyThreshold: 9999,
    freePlay: false, lastHand: ['S6', 'H6', 'C6'], lastPlayer: 'enemy',
    maxRounds: 8, starsByRound: [3, 6],
    tianmingSuit: 'diamond',
    playerHand: ['D8', 'S8', 'H8', 'C4', 'SK', 'HK', 'SA', 'D3'],
    enemyHand: ['S3', 'H4'],
    yueliFirst: 34, yueliWin: 9,
  },

  // —— 宗师 ——
  {
    id: 'p12_tight', pack: 'master', name: '巧压残局',
    desc: '台面三张 7。用三张或炸弹压过；手牌紧，别浪费。',
    star: 3, unlockClears: 6,
    tip: '三带一/三张 8+ 可压；炸弹备着',
    charId: 'ying', threshold: 100, enemyThreshold: 9999, playerScore: 20,
    freePlay: false, lastHand: ['S7', 'H7', 'C7'], lastPlayer: 'enemy',
    maxRounds: 6, starsByRound: [2, 4],
    tianmingSuit: 'club',
    playerHand: ['D8', 'S8', 'H8', 'C3', 'SA', 'H9', 'S9', 'C9', 'D9'],
    enemyHand: ['S4', 'H5'],
    yueliFirst: 40, yueliWin: 10,
  },
  {
    id: 'p13_rocket', pack: 'master', name: '火箭定音',
    desc: '台面是大炸弹。唯有火箭可压；一发定音破境。',
    star: 3, unlockClears: 6,
    tip: '大王+小王 = 火箭',
    charId: 'mo_qi', threshold: 200, enemyThreshold: 9999,
    freePlay: false, lastHand: ['S2', 'H2', 'C2', 'D2'], lastPlayer: 'enemy',
    maxRounds: 5, starsByRound: [1, 3],
    tianmingSuit: 'diamond',
    playerHand: ['BJ', 'RJ', 'H3', 'S4', 'C5', 'D6', 'HA'],
    enemyHand: ['S3', 'H4'],
    yueliFirst: 45, yueliWin: 12,
  },
  {
    id: 'p14_chain', pack: 'master', name: '两手破境',
    desc: '门槛稍高，往往需要两手。先立型，再连压取气。',
    star: 3, unlockClears: 7,
    tip: '先打小对/小顺蓄气，再打高分牌型',
    charId: 'han_mei', threshold: 200, enemyThreshold: 9999,
    freePlay: true, maxRounds: 8, starsByRound: [3, 6],
    tianmingSuit: 'spade',
    playerHand: ['S3', 'H3', 'S4', 'H4', 'S5', 'H5', 'S6', 'H6', 'CK', 'DK', 'SA', 'HA'],
    enemyHand: ['C3', 'D4', 'C5'],
    jiguanTokens: 1,
    yueliFirst: 45, yueliWin: 12,
  },
  {
    id: 'p15_plane', pack: 'master', name: '云翼过关',
    desc: '自由出牌。飞机（连续三张）气高，一击可破。',
    star: 3, unlockClears: 8,
    tip: '7-8 双三张可组飞机',
    charId: 'shen', threshold: 140, enemyThreshold: 9999,
    freePlay: true, maxRounds: 7, starsByRound: [2, 5],
    tianmingSuit: 'heart',
    playerHand: ['S7', 'H7', 'C7', 'S8', 'H8', 'C8', 'D3', 'D4', 'SA', 'HK'],
    enemyHand: ['S3', 'H4', 'C5'],
    yueliFirst: 48, yueliWin: 12,
  },
  {
    id: 'p16_clock', pack: 'master', name: '残阳三巡',
    desc: '回合极少。必须尽快破境，拖不起。',
    star: 3, unlockClears: 8,
    tip: '优先炸弹/长顺等高分一手',
    charId: 'ying', threshold: 150, enemyThreshold: 9999,
    freePlay: true, maxRounds: 4, starsByRound: [2, 3],
    tianmingSuit: 'club',
    playerHand: ['C10', 'CJ', 'CQ', 'CK', 'CA', 'S10', 'H3', 'D4', 'S5'],
    enemyHand: ['S3', 'H4'],
    yueliFirst: 50, yueliWin: 12,
  },
  {
    id: 'p17_midscore', pack: 'master', name: '半途杀机',
    desc: '你已有进度。压过台面并一击收官。',
    star: 3, unlockClears: 9,
    tip: '台面是顺子，炸弹或更大顺可压',
    charId: 'liu', threshold: 220, enemyThreshold: 9999, playerScore: 80,
    freePlay: false, lastHand: ['D4', 'D5', 'D6', 'D7', 'D8'], lastPlayer: 'enemy',
    maxRounds: 5, starsByRound: [2, 4],
    tianmingSuit: 'diamond',
    playerHand: ['H9', 'S9', 'C9', 'D9', 'HA', 'SA', 'C3', 'S4'],
    enemyHand: ['S3', 'H5'],
    yueliFirst: 50, yueliWin: 13,
  },

  // —— 传说 ——
  {
    id: 'p18_long_road', pack: 'legend', name: '长夜跋涉',
    desc: '高门槛，需多手经营。回合仍有限。',
    star: 3, unlockClears: 11, unlockStars: 12,
    tip: '拆型要克制；先小后大叠气',
    charId: 'han_mei', threshold: 280, enemyThreshold: 9999,
    freePlay: true, maxRounds: 9, starsByRound: [4, 7],
    tianmingSuit: 'spade',
    playerHand: [
      'S3', 'H3', 'S4', 'H4', 'S5', 'H5', 'S6', 'H6',
      'C7', 'D7', 'C8', 'D8', 'SK', 'HK', 'SA', 'DA',
    ],
    enemyHand: ['C3', 'D4', 'C5'],
    jiguanTokens: 1, jiguanIds: ['jiehuo_jg'],
    yueliFirst: 55, yueliWin: 14,
  },
  {
    id: 'p19_no_waste', pack: 'legend', name: '寸牌必争',
    desc: '手牌不多，几乎每张都要算进破境。',
    star: 3, unlockClears: 12, unlockStars: 14,
    tip: '同花顺优先；别先打散关键张',
    charId: 'qing_lan', threshold: 160, enemyThreshold: 9999,
    freePlay: true, maxRounds: 6, starsByRound: [2, 4],
    tianmingSuit: 'heart',
    playerHand: ['H8', 'H9', 'H10', 'HJ', 'HQ', 'S3', 'C4', 'D5'],
    enemyHand: ['S3', 'H4'],
    yueliFirst: 58, yueliWin: 14,
  },
  {
    id: 'p20_double_bomb', pack: 'legend', name: '连环爆响',
    desc: '台面是小炸弹。更大炸弹或火箭才能压。',
    star: 3, unlockClears: 13, unlockStars: 16,
    tip: '四张 A 压四张 5；或留火箭',
    charId: 'shen', threshold: 240, enemyThreshold: 9999,
    freePlay: false, lastHand: ['S5', 'H5', 'C5', 'D5'], lastPlayer: 'enemy',
    maxRounds: 5, starsByRound: [2, 4],
    tianmingSuit: 'spade',
    playerHand: ['SA', 'HA', 'CA', 'DA', 'BJ', 'RJ', 'S3', 'H4', 'C6'],
    enemyHand: ['S3', 'H4'],
    yueliFirst: 60, yueliWin: 15,
  },
  {
    id: 'p21_jiguan_race', pack: 'legend', name: '千机竞速',
    desc: '高门槛 + 机关。借火/换骨可加速破境。',
    star: 3, unlockClears: 14, unlockStars: 18,
    tip: '借火抬气后再打长牌型',
    charId: 'mo_qi', threshold: 200, enemyThreshold: 9999,
    freePlay: true, maxRounds: 7, starsByRound: [3, 5],
    tianmingSuit: 'club',
    playerHand: ['C6', 'C7', 'C8', 'C9', 'C10', 'S6', 'H7', 'D8', 'SK', 'HA'],
    enemyHand: ['S3', 'H4', 'C5'],
    jiguanTokens: 2, jiguanIds: ['jiehuo_jg', 'huangu'],
    yueliFirst: 62, yueliWin: 15,
  },
  {
    id: 'p22_final', pack: 'legend', name: '终卷·归一',
    desc: '终局试炼：压过飞机，再在极短回合内破境。',
    star: 3, unlockClears: 16, unlockStars: 22,
    tip: '更大飞机/炸弹/火箭；收官要干净',
    charId: 'shen', threshold: 260, enemyThreshold: 9999, playerScore: 40,
    freePlay: false,
    lastHand: ['S5', 'H5', 'C5', 'S6', 'H6', 'C6'], lastPlayer: 'enemy',
    maxRounds: 5, starsByRound: [2, 4],
    tianmingSuit: 'heart',
    playerHand: [
      'S7', 'H7', 'C7', 'S8', 'H8', 'C8',
      'S9', 'H9', 'C9', 'D9',
      'BJ', 'RJ', 'DA',
    ],
    enemyHand: ['S3', 'H4'],
    jiguanTokens: 1,
    yueliFirst: 80, yueliWin: 18,
  },
];

function getPuzzleById(id) {
  return (typeof PUZZLE_POOL !== 'undefined' ? PUZZLE_POOL : []).find(p => p.id === id) || null;
}

function getPuzzleProgress(meta) {
  return (meta && meta.puzzles) || {};
}

function getPuzzleTotalStars(meta) {
  const map = (meta && meta.puzzles) || {};
  return Object.values(map).reduce((s, r) => s + (r?.stars || 0), 0);
}

function isPuzzleUnlocked(puzzle, meta, clearedCount) {
  if (!puzzle) return false;
  const needC = puzzle.unlockClears || 0;
  const needS = puzzle.unlockStars || 0;
  const clears = clearedCount != null
    ? clearedCount
    : Object.values((meta && meta.puzzles) || {}).filter(r => (r?.stars || 0) >= 1).length;
  const stars = getPuzzleTotalStars(meta);
  return clears >= needC && stars >= needS;
}

function generateEndlessStage(floor, difficultyMult = 1, rng = Math.random) {
  // 无尽：前期约 ×1.12，高层略陡，拉长冲层压力
  const steep = floor >= 40 ? 1.145 : floor >= 25 ? 1.132 : 1.12;
  const base = 10500 * Math.pow(steep, floor - 1) * difficultyMult;
  const threshold = Math.floor(base);
  const mods = [];
  const pool = ENDLESS_MODIFIERS.slice();
  let count = 1 + (floor % 3 === 0 ? 1 : 0) + (floor >= 15 ? 1 : 0);
  if (floor >= 30) count += 1;
  if (floor >= 50) count += 1;
  count = Math.min(count, 5);
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor((typeof rng === 'function' ? rng() : Math.random()) * pool.length);
    mods.push(pool.splice(idx, 1)[0]);
  }
  return {
    type: floor % 5 === 0 ? 'zong' : (floor % 2 === 0 ? 'an' : 'ming'),
    name: `无尽·第${floor}层`,
    threshold,
    endless: true,
    floor,
    modifiers: mods.map(m => m.apply),
    modifierNames: mods.map(m => m.name),
    boss: floor % 5 === 0 ? ['void', 'paizong', 'gui', 'ying'][floor % 4] : null,
  };
}
