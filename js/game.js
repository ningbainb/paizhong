/**
 * 《牌宗》游戏状态 — 长线复玩版
 * 8 境 + 无尽 + 难度 + 成就 + 阅历商店 + 每日挑战
 */

class PaiZongGame {
  constructor() {
    this.resetMeta();
  }

  defaultMeta() {
    return {
      version: 2,
      gamesPlayed: 0,
      unlockedChars: ['shen', 'liu', 'bu'],
      totalYueli: 0,
      spentYueli: 0,
      bestScore: 0,
      bestEndless: 0,
      tutorialStep: 0, // 兼容旧字段
      tutorialDone: false, // 是否完成过新手引导
      tutorialIndex: 0, // 当前引导步骤
      poolUnlock: 80, // 可抽取奇牌 unlock 上限
      metaUpgrades: {}, // id -> level
      achievements: {}, // id -> unlocked ts
      seenQipai: [],
      charWins: {}, // charId -> wins
      charMastery: {}, // charId -> stages cleared total
      realmBest: {}, // difficulty -> max realm cleared (0-8)
      daily: { date: '', completed: false, streak: 0, total: 0 },
      weekly: { key: '', completed: false, bestStages: 0, attempts: 0 },
      weeklyDoneCount: 0, // 跨周累计完成周常次数
      stats: {
        totalStages: 0,
        totalScore: 0,
        bombs: 0,
        flushes: 0,
        rockets: 0,
        maxHandScore: 0,
        maxChain: 0,
        shopBuys: 0,
      },
      runHistory: [], // last 30 runs summary
      leaderboard: {
        bestStageRun: null, // { stages, score, char, diff, t }
        bestEndless: null,
        bestHand: null,
        weeklyBest: null,
      },
      sfxEnabled: true,
      lastRunSetup: null, // { characterId, mode, difficulty }
      endlessMilestones: {}, // floor -> claimed ts
      eventCount: 0, // 累计关间奇遇
    };
  }

  resetMeta() {
    this.meta = this.defaultMeta();
    this.load();
    this.migrateMeta();
  }

  migrateMeta() {
    const d = this.defaultMeta();
    // 须在默认字段填充之前：老存档无 tutorialDone 时按游玩进度推断，避免老玩家被打断
    if (this.meta.tutorialDone === undefined) {
      this.meta.tutorialDone = (this.meta.gamesPlayed || 0) >= 2 || (this.meta.tutorialStep || 0) >= 6;
    }
    if (this.meta.tutorialIndex === undefined) this.meta.tutorialIndex = 0;
    for (const k of Object.keys(d)) {
      if (this.meta[k] === undefined) this.meta[k] = d[k];
    }
    if (!this.meta.stats) this.meta.stats = { ...d.stats };
    else {
      for (const sk of Object.keys(d.stats)) {
        if (this.meta.stats[sk] === undefined) this.meta.stats[sk] = d.stats[sk];
      }
    }
    if (!this.meta.metaUpgrades) this.meta.metaUpgrades = {};
    if (this.meta.weeklyDoneCount === undefined) this.meta.weeklyDoneCount = 0;
    if (this.meta.lastRunSetup === undefined) this.meta.lastRunSetup = null;
    if (!this.meta.endlessMilestones) this.meta.endlessMilestones = {};
    if (this.meta.eventCount === undefined) this.meta.eventCount = 0;
  }

  isTutorialActive() {
    return !this.meta.tutorialDone;
  }

  setTutorialIndex(i) {
    this.meta.tutorialIndex = Math.max(0, i);
    this.save();
  }

  completeTutorial() {
    this.meta.tutorialDone = true;
    this.meta.tutorialStep = 6;
    this.meta.tutorialIndex = (typeof TUTORIAL_STEPS !== 'undefined') ? TUTORIAL_STEPS.length : 99;
    this.save();
  }

  resetTutorial() {
    this.meta.tutorialDone = false;
    this.meta.tutorialIndex = 0;
    this.meta.tutorialStep = 0;
    this.save();
  }

  save() {
    try {
      localStorage.setItem('paizong_meta_v2', JSON.stringify(this.meta));
      // 兼容旧 key
      localStorage.setItem('paizong_meta', JSON.stringify({
        gamesPlayed: this.meta.gamesPlayed,
        unlockedChars: this.meta.unlockedChars,
        totalYueli: this.meta.totalYueli,
        bestScore: this.meta.bestScore,
        tutorialStep: this.meta.tutorialStep,
      }));
    } catch (_) {}
  }

  load() {
    try {
      const s2 = localStorage.getItem('paizong_meta_v2');
      if (s2) {
        Object.assign(this.meta, JSON.parse(s2));
        return;
      }
      const s = localStorage.getItem('paizong_meta');
      if (s) Object.assign(this.meta, JSON.parse(s));
    } catch (_) {}
  }

  /** 导出元进度存档（JSON 字符串，可跨设备粘贴恢复） */
  exportMetaSave() {
    const payload = {
      app: 'paizong',
      ver: 2,
      exportedAt: Date.now(),
      meta: this.meta,
    };
    return JSON.stringify(payload);
  }

  /**
   * 导入元进度存档
   * @returns {{ ok: boolean, reason?: string }}
   */
  importMetaSave(raw) {
    try {
      let text = String(raw || '').trim();
      if (!text) return { ok: false, reason: '内容为空' };
      // 允许包在 ``` 代码块里
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const data = JSON.parse(text);
      const meta = data.meta || (data.version != null || data.totalYueli != null ? data : null);
      if (!meta || typeof meta !== 'object') return { ok: false, reason: '不是有效的牌宗存档' };
      // 浅合并默认结构，避免缺字段
      const base = this.defaultMeta();
      const merged = { ...base, ...meta };
      if (!merged.stats) merged.stats = { ...base.stats };
      else merged.stats = { ...base.stats, ...merged.stats };
      if (!merged.metaUpgrades) merged.metaUpgrades = {};
      if (!merged.achievements) merged.achievements = {};
      if (!Array.isArray(merged.unlockedChars)) merged.unlockedChars = base.unlockedChars;
      if (!Array.isArray(merged.seenQipai)) merged.seenQipai = [];
      this.meta = merged;
      this.migrateMeta();
      this.save();
      // 导入后清局内，避免脏状态
      this.run = null;
      this.battle = null;
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: '解析失败：' + (e.message || '格式错误') };
    }
  }

  availableYueli() {
    return Math.max(0, (this.meta.totalYueli || 0) - (this.meta.spentYueli || 0));
  }

  getDifficulty(id) {
    return DIFFICULTIES.find(d => d.id === (id || 'normal')) || DIFFICULTIES[0];
  }

  isCharUnlocked(id) {
    if (this.meta.unlockedChars.includes(id)) return true;
    const c = CHARACTERS.find(x => x.id === id);
    if (c && (c.unlockYueli || 0) <= this.meta.totalYueli) {
      this.meta.unlockedChars.push(id);
      this.save();
      return true;
    }
    return this.meta.unlockedChars.includes(id);
  }

  refreshCharUnlocks() {
    CHARACTERS.forEach(c => {
      if ((c.unlockYueli || 0) <= this.meta.totalYueli && !this.meta.unlockedChars.includes(c.id)) {
        this.meta.unlockedChars.push(c.id);
      }
    });
  }

  metaLevel(id) {
    return this.meta.metaUpgrades[id] || 0;
  }

  buyMeta(itemId) {
    const item = META_SHOP.find(x => x.id === itemId);
    if (!item) return { ok: false, reason: '无效商品' };
    const lv = this.metaLevel(itemId);
    if (item.max && lv >= item.max) return { ok: false, reason: '已满级' };
    if (item.type === 'pool' && this.meta.poolUnlock >= item.maxUnlock) {
      return { ok: false, reason: '已解锁' };
    }
    if (this.availableYueli() < item.cost) return { ok: false, reason: '阅历不足' };

    this.meta.spentYueli += item.cost;
    if (item.type === 'pool') {
      this.meta.poolUnlock = Math.max(this.meta.poolUnlock, item.maxUnlock);
    } else {
      this.meta.metaUpgrades[itemId] = lv + 1;
    }
    if (!this.meta.stats) this.meta.stats = {};
    this.meta.stats.shopBuys = (this.meta.stats.shopBuys || 0) + 1;
    this.grantAchievement('shop_buy');
    this.save();
    return { ok: true, item };
  }

  /** 元升级数值 */
  metaAmount(id, fallback = 0) {
    const item = META_SHOP.find(x => x.id === id);
    const lv = this.metaLevel(id);
    if (!item || !lv) return fallback;
    return (item.amount || 0) * lv;
  }

  /** 汇总阅历阁永久加成（对局内统一读取） */
  getMetaBonuses(modeHint) {
    const m = (id) => this.metaAmount(id, 0);
    const l = (id) => this.metaLevel(id);
    const mode = modeHint || this.run?.mode || 'normal';
    const isEndless = mode === 'endless' || !!this.run?.isEndless;
    return {
      startDunwu: m('start_dunwu') + m('start_dunwu_plus'),
      endlessDunwu: isEndless ? m('endless_seed') : 0,
      startToken: l('start_token') + (isEndless ? l('endless_token') : 0),
      startJinnang: l('start_jinnang'),
      startZongshi: l('start_zongshi'),
      jiguanPack: l('jiguan_pack'),
      startHand: m('hand_seed'),
      startQi: m('start_qi'),
      shieldChance: l('shield_seed') ? 0.5 : 0,
      shieldGuaranteed: l('shield_seed2') > 0,
      xinfaSeed: l('xinfa_seed'),
      softRound: m('soft_extra'),
      xinmoCap: m('xinmo_seed'),
      xinmoStart: l('xinmo_start') > 0 ? 1 : 0,
      interest: m('interest'),
      yueliPct: m('yueli_boost'),
      yueliFlat: m('yueli_flat'),
      eventLuck: l('event_luck'),
      dailyYueli: m('daily_boost'),
      weeklyYueli: m('weekly_boost'),
      milePct: m('mile_boost'),
      cleanBonus: m('clean_bonus'),
      speedBonus: m('speed_bonus'),
      diverseBonus: m('diverse_bonus'),
      firstQi: m('first_qi'),
      typeQi: m('type_qi'),
      cleverQi: m('clever_qi'),
      chainQi: m('chain_seed'),
      bombQi: m('bomb_seed'),
      flushPct: m('flush_seed'),
      passQi: m('pass_seed'),
      enemySoft: m('enemy_soft'),
      qiCap: m('qi_cap_seed'),
      jiguanTurn: l('jiguan_turn'),
      drawExtra: m('draw_extra'),
      beatLi: m('beat_li'),
      shopChoice: l('shop_choice'),
      shopDiscount: m('shop_discount'),
      retryDunwu: m('retry_bonus'),
      tianmingPeek: l('tianming_peek') > 0,
      betterHint: l('hint_plus') > 0,
      proHint: l('hint_pro') > 0,
      logDetail: l('log_detail') > 0,
    };
  }

  grantAchievement(id) {
    if (!this.meta.achievements) this.meta.achievements = {};
    if (this.meta.achievements[id]) return false;
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return false;
    this.meta.achievements[id] = Date.now();
    this.meta.totalYueli += a.yueli || 0;
    this.save();
    if (!this._achieveQueue) this._achieveQueue = [];
    this._achieveQueue.push(a);
    if (!this._deferAchieveUi) {
      try {
        if (typeof UI !== 'undefined' && UI.onAchievementUnlock) UI.onAchievementUnlock(a);
      } catch (_) {}
    }
    return a;
  }

  /** 成就进度 { cur, target, pct } 或 null */
  getAchieveProgress(a) {
    if (!a || !a.progress) return null;
    const t = a.progress.type;
    let target = a.progress.target || 1;
    let cur = 0;
    const st = this.meta.stats || {};
    switch (t) {
      case 'games': cur = this.meta.gamesPlayed || 0; break;
      case 'yueli': cur = this.meta.totalYueli || 0; break;
      case 'seen': cur = (this.meta.seenQipai || []).length; break;
      case 'seenFull':
        cur = (this.meta.seenQipai || []).length;
        target = (typeof QIPAI_POOL !== 'undefined') ? QIPAI_POOL.length : target || 1;
        break;
      case 'endless': cur = this.meta.bestEndless || 0; break;
      case 'daily': cur = (this.meta.daily && this.meta.daily.total) || 0; break;
      case 'maxHand': cur = st.maxHandScore || 0; break;
      case 'maxChain': cur = st.maxChain || 0; break;
      case 'bombsTotal': cur = st.bombs || 0; break;
      case 'flushesTotal': cur = st.flushes || 0; break;
      case 'charWins': {
        cur = CHARACTERS.filter(c => (this.meta.charWins[c.id] || 0) > 0).length;
        target = CHARACTERS.length;
        break;
      }
      case 'weeklyDone': cur = this.meta.weeklyDoneCount || 0; break;
      case 'events': cur = this.meta.eventCount || 0; break;
      case 'realms': {
        const vals = Object.values(this.meta.realmBest || {});
        cur = vals.length ? Math.max(...vals) : 0;
        break;
      }
      default: return null;
    }
    return {
      cur: Math.min(cur, target),
      target,
      raw: cur,
      pct: target > 0 ? Math.min(1, cur / target) : 0,
    };
  }

  drainAchieveQueue() {
    const q = this._achieveQueue || [];
    this._achieveQueue = [];
    return q;
  }

  checkMetaAchievements() {
    const unlocked = [];
    const tryA = (id, cond) => { if (cond && this.grantAchievement(id)) unlocked.push(id); };
    tryA('play10', this.meta.gamesPlayed >= 10);
    tryA('play50', this.meta.gamesPlayed >= 50);
    tryA('play200', this.meta.gamesPlayed >= 200);
    tryA('yueli1k', this.meta.totalYueli >= 1000);
    tryA('yueli5k', this.meta.totalYueli >= 5000);
    tryA('collector', (this.meta.seenQipai || []).length >= 40);
    tryA('collector_full', (this.meta.seenQipai || []).length >= QIPAI_POOL.length);
    tryA('all_chars', CHARACTERS.every(c => (this.meta.charWins[c.id] || 0) > 0));
    const be = this.meta.bestEndless || 0;
    tryA('endless10', be >= 10);
    tryA('endless20', be >= 20);
    tryA('endless30', be >= 30);
    tryA('endless50', be >= 50);
    tryA('endless75', be >= 75);
    tryA('endless100', be >= 100);
    tryA('event5', (this.meta.eventCount || 0) >= 5);
    tryA('event20', (this.meta.eventCount || 0) >= 20);
    {
      const need = (typeof ENDLESS_MILESTONES !== 'undefined')
        ? ENDLESS_MILESTONES.filter(m => m.floor <= 50)
        : [];
      const got = this.meta.endlessMilestones || {};
      tryA('milestone_all', need.length > 0 && need.every(m => got[m.floor]));
    }
    const dt = (this.meta.daily && this.meta.daily.total) || 0;
    tryA('daily3', dt >= 3);
    tryA('daily7', dt >= 7);
    tryA('weekly1', !!(this.meta.weekly && this.meta.weekly.completed) || (this.meta.weeklyDoneCount || 0) >= 1);
    tryA('weekly3', (this.meta.weeklyDoneCount || 0) >= 3);
    tryA('shop_buy', (this.meta.stats && this.meta.stats.shopBuys || 0) >= 1);
    const mh = (this.meta.stats && this.meta.stats.maxHandScore) || 0;
    tryA('big_hand', mh >= 500);
    tryA('big_hand_2', mh >= 1500);
    tryA('big_hand_3', mh >= 3000);
    const mc = (this.meta.stats && this.meta.stats.maxChain) || 0;
    tryA('combo_chain', mc >= 6);
    tryA('combo_chain_10', mc >= 10);
    return unlocked;
  }

  todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  getDailySeed() {
    const key = this.todayKey();
    let h = 0;
    for (let i = 0; i < key.length; i++) h = ((h << 5) - h) + key.charCodeAt(i);
    return Math.abs(h);
  }

  /** mode: normal | endless | daily | weekly */
  startRun(characterId, options = {}) {
    this.refreshCharUnlocks();
    const char = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
    let diff = this.getDifficulty(options.difficulty || 'normal');
    const mode = options.mode || 'normal';

    const weeklyInfo = mode === 'weekly' ? getWeeklyChallenge() : null;
    if (weeklyInfo) {
      // 周常默认至少险途压力
      if (diff.id === 'normal') diff = this.getDifficulty('hard');
    }

    this.run = {
      character: char,
      difficulty: diff,
      mode,
      isDaily: mode === 'daily',
      isEndless: mode === 'endless',
      isWeekly: mode === 'weekly',
      weekly: weeklyInfo,
      endlessFloor: 0,
      realmIndex: mode === 'endless' ? 8 : 0,
      stageIndex: 0,
      qipai: [],
      xinfa: { single: 0, pair: 0, triple: 0, straight: 0, consecutive_pairs: 0, airplane: 0, bomb: 0, rocket: 0 },
      jinnang: [],
      dunwu: 0,
      runFlags: {}, // 下局临时 buff：nextShield, nextFlushPct, nextReveal, nextQi, nextXinmo
      yueli: 0,
      zongshiTokens: 0,
      totalScore: 0,
      stagesCleared: 0,
      realmsCleared: 0,
      handLimitBonus: 0,
      duanweiLi: 0,
      stats: { bombs: 0, flushes: 0, passes: 0, maxHand: 0, maxChain: 0, types: new Set() },
      dailySeed: mode === 'daily' ? this.getDailySeed() : null,
      importedBuild: false,
    };

    if (char.passive?.type === 'xinfa_bonus') {
      ['single', 'pair', 'triple', 'straight', 'bomb'].forEach(k => {
        this.run.xinfa[k] = (this.run.xinfa[k] || 0) + char.passive.amount;
      });
    }

    // 阅历阁开局胚
    const mb = this.getMetaBonuses(mode);
    this.run.dunwu = (mb.startDunwu || 0) + (mb.endlessDunwu || 0);
    this.run.zongshiTokens = mb.startZongshi || 0;
    if (mb.xinfaSeed) {
      ['single', 'pair', 'triple', 'straight', 'bomb'].forEach(k => {
        this.run.xinfa[k] = (this.run.xinfa[k] || 0) + mb.xinfaSeed;
      });
    }
    // 再开加成
    if (options.retryBonus && mb.retryDunwu) {
      this.run.dunwu += mb.retryDunwu;
    }

    // 导入构筑（挑战模式仅作开局参考装备）
    if (options.importBuild) {
      this.applyImportBuild(options.importBuild);
    }

    for (let i = 0; i < (mb.startJinnang || 0); i++) {
      const jn = JINNANG_POOL[Math.floor(Math.random() * JINNANG_POOL.length)];
      this.run.jinnang.push({ ...jn, uid: uid() });
    }

    if (weeklyInfo) {
      this.meta.weekly = this.meta.weekly || {};
      if (this.meta.weekly.key !== weeklyInfo.key) {
        this.meta.weekly = { key: weeklyInfo.key, completed: false, bestStages: 0, attempts: 0 };
      }
      this.meta.weekly.attempts = (this.meta.weekly.attempts || 0) + 1;
      if (weeklyInfo.challenge.startTokens) {
        // 在 battle 里加令
      }
    }

    this.meta.gamesPlayed++;
    // 记录最近开局，便于「再来一局」
    this.meta.lastRunSetup = {
      characterId: char.id,
      mode,
      difficulty: diff.id,
    };
    this.save();
    this.checkMetaAchievements();
    return this.run;
  }

  applyImportBuild(decoded) {
    if (!decoded) return;
    this.run.importedBuild = true;
    if (decoded.xinfa) Object.assign(this.run.xinfa, decoded.xinfa);
    if (decoded.qipai?.length) {
      const ban = this.getWeeklyBanSet();
      decoded.qipai.forEach(q => {
        if (ban.has(q.id)) return;
        if (!this.run.qipai.some(x => x.id === q.id)) this.run.qipai.push(q);
      });
      this.markSeenQipai(this.run.qipai);
    }
  }

  getWeeklyBanSet() {
    const set = new Set();
    const w = this.run?.weekly?.challenge;
    if (!w) return set;
    (w.banQipaiIds || []).forEach(id => set.add(id));
    if (w.banRarity) {
      QIPAI_POOL.filter(q => w.banRarity.includes(q.rarity)).forEach(q => set.add(q.id));
    }
    return set;
  }

  isQipaiAllowed(q) {
    if (!q) return false;
    if (this.getWeeklyBanSet().has(q.id)) return false;
    return true;
  }

  getCurrentStage() {
    if (!this.run) return null;
    if (this.run.isEndless || this.run.realmIndex >= REALM_THRESHOLDS.length) {
      const floor = this.run.endlessFloor || 1;
      const stage = generateEndlessStage(floor, this.run.difficulty.mult);
      return {
        realm: { realm: 9, name: '无尽论道' },
        stage,
        realmIndex: 8,
        stageIndex: floor - 1,
        endless: true,
      };
    }
    const realm = REALM_THRESHOLDS[this.run.realmIndex];
    if (!realm) return null;
    return {
      realm,
      stage: realm.stages[this.run.stageIndex],
      realmIndex: this.run.realmIndex,
      stageIndex: this.run.stageIndex,
    };
  }

  getQiCap() {
    const r = this.run?.realmIndex || 0;
    let cap = r <= 1 ? QI_CAP.early : r <= 3 ? QI_CAP.mid : r <= 6 ? QI_CAP.late : QI_CAP.end;
    if (this.run?.isEndless) cap = QI_CAP.end;
    // 奇牌/词条在 battle 里再调
    return cap;
  }

  hasQipai(id) {
    return this.run?.qipai?.some(q => q.id === id);
  }

  markSeenQipai(list) {
    if (!list) return;
    if (!this.meta.seenQipai) this.meta.seenQipai = [];
    const arr = Array.isArray(list) ? list : [list];
    arr.forEach(q => {
      if (!q || !q.id) return;
      if (!this.meta.seenQipai.includes(q.id)) this.meta.seenQipai.push(q.id);
    });
  }

  getUnlockedPoolMax() {
    return this.meta.poolUnlock || 80;
  }

  startBattle() {
    const info = this.getCurrentStage();
    if (!info) return null;
    const { realm, stage } = info;
    const diff = this.run.difficulty;

    let threshold = Math.floor(stage.threshold * diff.mult);
    // 轮回债
    if (this.hasQipai('lunhui')) threshold = Math.floor(threshold * 1.1);

    let mods = [...(stage.modifiers || [])];
    const weekly = this.run.weekly?.challenge;
    if (weekly?.mods) mods = [...mods, ...weekly.mods];

    let thresholdMul = 1;
    if (weekly?.thresholdMul) thresholdMul *= weekly.thresholdMul;
    threshold = Math.floor(threshold * thresholdMul);

    const deck = createDeck();
    const mb = this.getMetaBonuses();
    let playerCount = 17;
    if (mods.includes('hand_minus_1') || stage.type === 'an') playerCount = 16;
    if (mods.includes('hand_minus_2')) playerCount = 15;
    if (this.hasQipai('kongcheng')) playerCount = Math.max(10, playerCount - 3);
    playerCount += mb.startHand || 0;

    let playerHand = sortCards(drawCards(deck, playerCount));
    let enemyHand = sortCards(drawCards(deck, 17));
    const reserve = drawCards(deck, 3);

    const boss = stage.boss ? BOSS_RULES[stage.boss] : null;
    let tianmingSuit = randomTianmingSuit();
    let tianmingSuits = [tianmingSuit];
    let tianmingHidden = mods.includes('tianming_hidden') || stage.type === 'an';

    if (mods.includes('double_tianming')) {
      let s2 = randomTianmingSuit();
      while (s2 === tianmingSuit) s2 = randomTianmingSuit();
      tianmingSuits = [tianmingSuit, s2];
    }
    if (this.hasQipai('shiming')) tianmingHidden = true;
    if (this.hasQipai('tianji_shu') || weekly?.forceRevealTianming) tianmingHidden = false;
    if (tianmingHidden && mb.tianmingPeek && Math.random() < 0.4) tianmingHidden = false;

    let jiguanTokens = 2 + (mb.startToken || 0);
    if (this.run.character.passive?.type === 'jiguan_master') {
      jiguanTokens += this.run.character.passive.tokens || 0;
    }
    if (this.hasQipai('jiguan_ling')) jiguanTokens += 2;
    if (weekly?.startTokens) jiguanTokens += weekly.startTokens;
    if (this.run.runFlags?.nextTokens) {
      jiguanTokens += this.run.runFlags.nextTokens;
      this.run.runFlags.nextTokens = 0;
    }
    // 新手局也给少量免费机关，避免工具栏空白难懂；令牌从 1 起手
    if (this.meta.tutorialStep < 2 && this.meta.gamesPlayed <= 1) {
      jiguanTokens = Math.max(1, Math.min(jiguanTokens, 1));
    }

    let jiguanCount = 2 + (mb.jiguanPack || 0);
    if (mods.includes('extra_jiguan')) jiguanCount += 2;
    let jiguanHand = [];
    if (this.meta.tutorialStep >= 2 || this.meta.gamesPlayed > 1) {
      jiguanHand = shuffle(JIGUAN_POOL).slice(0, jiguanCount).map(j => ({ ...j, uid: uid() }));
    } else {
      // 首局：2 张免费教学机关（清心 + 借火），建立「技能按钮」心智
      const teachIds = ['qingxin_jg', 'jiehuo_jg'];
      jiguanHand = teachIds.map(id => {
        const j = JIGUAN_POOL.find(x => x.id === id) || JIGUAN_POOL[0];
        return { ...j, cost: 0, uid: uid() };
      });
      // 若已购机匣，首局也补随机机关
      const extra = Math.max(0, (mb.jiguanPack || 0));
      if (extra > 0) {
        const more = shuffle(JIGUAN_POOL).slice(0, extra).map(j => ({ ...j, uid: uid() }));
        jiguanHand = jiguanHand.concat(more);
      }
    }
    if (mods.includes('gift_baibian')) {
      const bb = JIGUAN_POOL.find(j => j.id === 'baibian');
      if (bb) jiguanHand.push({ ...bb, uid: uid() });
    }

    if (this.hasQipai('duanwei') && playerHand.length) {
      playerHand = sortCards(playerHand).slice().sort((a, b) => b.order - a.order);
      playerHand.shift();
      this.run.duanweiLi = 12;
    }

    // 乾坤袋
    if (this.hasQipai('qiankun')) {
      const extra = drawCards(deck, 3);
      playerHand = sortCards([...playerHand, ...extra]);
      // 弃最大
      playerHand.sort((a, b) => b.order - a.order);
      playerHand.shift();
      playerHand = sortCards(playerHand);
    }

    let shield = 0;
    if (this.hasQipai('shouhu')) shield += 1;
    if (mb.shieldGuaranteed) shield += 1;
    else if (mb.shieldChance && Math.random() < mb.shieldChance) shield += 1;
    if (this.run.runFlags?.nextShield) {
      shield += this.run.runFlags.nextShield;
      this.run.runFlags.nextShield = 0;
    }

    let xinmo = 0;
    if (mods.includes('xinmo_start')) xinmo = 1;
    if (this.run.character.passive?.type === 'cursed_boost') xinmo += this.run.character.passive.xinmo || 0;
    if (this.run.runFlags?.nextXinmo) {
      xinmo += this.run.runFlags.nextXinmo;
      this.run.runFlags.nextXinmo = 0;
    }
    if (this.run.runFlags?.nextReveal) {
      tianmingHidden = false;
      this.run.runFlags.nextReveal = 0;
    }
    if (this.run.runFlags?.nextFlushPct) {
      // applied below into flushExtraPct
    }

    if (this.hasQipai('zongshi_ling')) this.run.zongshiTokens += 1;

    // 宗主局：守关者先手气势（进度起步）
    let enemyStartScore = 0;
    if (stage.type === 'zong') {
      enemyStartScore = Math.floor(threshold * 0.06 * diff.enemy);
    } else if (stage.type === 'an') {
      enemyStartScore = Math.floor(threshold * 0.03 * diff.enemy);
    }

    let enemyMul = diff.enemy * (weekly?.enemyMul || 1);
    let enemyThreshold = Math.floor(threshold * (1.15 + (this.run.realmIndex || 0) * 0.03) / enemyMul);
    if (mods.includes('enemy_boost')) enemyThreshold = Math.floor(enemyThreshold * 0.75);
    if (mb.enemySoft) enemyThreshold = Math.floor(enemyThreshold * (1 - mb.enemySoft));

    let qiCap = this.getQiCap();
    if (boss?.qiCap) qiCap += boss.qiCap;
    if (mods.includes('qi_cap_down')) qiCap -= 2;
    if (this.hasQipai('zhuang_qi')) qiCap += 3;
    if (this.hasQipai('jieqi')) qiCap -= 4;
    qiCap += mb.qiCap || 0;

    let modBombQi = mods.includes('no_bomb_qi') ? -1.0 : 0;
    if (weekly?.extraBombQi) modBombQi += weekly.extraBombQi;
    if (weekly?.bonus?.bombQi) modBombQi += weekly.bonus.bombQi;
    modBombQi += mb.bombQi || 0;

    this.battle = {
      realmName: realm.name,
      stageName: stage.name,
      stageType: stage.type,
      threshold,
      baseThreshold: threshold,
      playerScore: 0,
      enemyScore: enemyStartScore || 0,
      enemyThreshold,
      playerHand: sortCards(playerHand),
      enemyHand: sortCards(enemyHand),
      deck,
      reserve,
      lastHand: null,
      lastPlayer: null,
      turn: 'player',
      freePlay: true,
      passStreak: 0,
      xinmo: Math.max(0, xinmo - (mb.xinmoStart || 0)),
      xinmoCap: (this.hasQipai('pingwen') ? 6 : 5) + (mb.xinmoCap || 0),
      round: 1,
      // 暗局/宗主局多给几回合，避免前期硬拖；后期略紧
      maxSoftRound: (stage.type === 'zong' ? 26 : stage.type === 'an' ? 24 : 22)
        + Math.min(8, this.run.stagesCleared)
        + (diff.id === 'legend' ? -2 : 0)
        + (mb.softRound || 0),
      selectedIds: new Set(),
      boss,
      tianmingSuit: tianmingSuits[0],
      tianmingSuits,
      tianmingHidden,
      tianmingDouble: 1,
      flushStreak: 0,
      playerChain: 0,
      enemyChain: 0,
      jiguanTokens,
      jiguanHand,
      jiguanUsedThisTurn: false,
      jiguanUsedCount: 0,
      jiguanUsedTotal: 0,
      discardedJiguan: [],
      tempQi: 0,
      tempLi: 0,
      nextPlayQi: mb.startQi || 0,
      afterBombQi: 0,
      juqiBonus: 0,
      discardCount: 0,
      discardLiBonus: 0,
      pairToTripleBonus: 0,
      bombQiStacks: 0,
      yingCounterQi: 0,
      counterLi: 0,
      typesPlayed: new Set(),
      fiveTypesReady: false,
      fiveTypesFired: false,
      firstHandType: null,
      firstHandBoost: this.hasQipai('wanfa_guizong'),
      gumingActive: false,
      gumingPending: this.hasQipai('guming'),
      passQiUsed: 0,
      shield,
      frozenEnemyIds: new Set(),
      enemySkip: false,
      extraJiguanTurn: false,
      lastPlayerMaxOrder: null,
      lastScoreBreakdown: null,
      lastPlayScore: 0,
      log: [],
      status: 'playing',
      reviveUsed: false,
      baibianActive: null,
      yirongActive: null,
      turnJiguanUsed: 0,
      maxJiguanPerTurn: 1 + (mb.jiguanTurn || 0),
      metaFlushPct: mb.flushPct || 0,
      metaChainQi: mb.chainQi || 0,
      metaBeatLi: mb.beatLi || 0,
      fengmoRounds: 0,
      tianmingTriggerCount: 0,
      pendingZongshi: null,
      zongshiArmed: false, // 手动蓄势宗势令
      guiyiTypes: new Set(),
      guiyiReady: false,
      modifiers: mods,
      modifierNames: stage.modifierNames || mods,
      playsThisBattle: 0,
      successfulBeats: 0,
      initiativeStreak: 0,
      bombCount: 0,
      flushCount: 0,
      passedThisBattle: false,
      drawsThisBattle: 0,
      autoDrawCounter: 0,
      handLimit: Math.max(8, 20 + (this.run.handLimitBonus || 0) + (this.hasQipai('kongcheng') ? -3 : 0)),
      qiCap,
      enemyBoost: mods.includes('enemy_boost') ? 1.3 : 1,
      scoreTax: mods.includes('score_tax') ? 0.9 : 1,
      passXinmoExtra: mods.includes('pass_xinmo') ? 1 : 0,
      flushExtraPct: (mods.includes('flush_extra') ? 0.15 : 0) + (weekly?.bonus?.flushPct || 0)
        + (this.run.runFlags?.nextFlushPct || 0),
      qiRain: mods.includes('qi_rain') ? 0.3 : 0,
      modBombQi,
      weeklyBonus: weekly?.bonus || null,
      softcapRate: this.hasQipai('jiuzhuan') ? 0.7 : 0.4,
      allXinfaBonus: this.hasQipai('xinfa_tong') ? 1 : 0,
      shunshiBoost: this.hasQipai('shunshi_qiang') ? 0.8 : null,
      allTianmingHalf: this.hasQipai('tianming_all'),
      jieqiZongshi: this.hasQipai('jieqi') ? 1.2 : null,
      bloodPact: this.hasQipai('xuejie'),
      endlessFloor: stage.floor || 0,
      comboMomentumQi: 0,
      threatQi: 0,
      stageTip: '',
    };

    // 关卡提示文案
    let stageTip = '推高破境进度，压制守关者。';
    if (stage.type === 'an') stageTip = '暗局：信息更少/手牌更紧，稳扎稳打。';
    if (stage.type === 'zong') stageTip = '宗主局：规则更苛，优先保命再求破境。';
    if (this.run.isEndless) stageTip = `无尽第 ${stage.floor || this.run.endlessFloor || 1} 层：词条叠层，速战速决。`;
    this.battle.stageTip = stageTip;

    this.log(`【${realm.name}·${stage.name}】门槛 ${threshold} · ${diff.name}`);
    this.log(stageTip);
    if (this.run.isWeekly && weekly) this.log(`周常【${weekly.name}】${weekly.desc}`);
    if (boss) this.log(`宗主：${boss.desc}`);
    if (stage.modifierNames?.length) this.log(`词条：${stage.modifierNames.join('、')}`);
    else if (mods.length) this.log(`词条：${mods.join('、')}`);
    if (!tianmingHidden) {
      const names = tianmingSuits.map(id => SUITS.find(s => s.id === id)?.symbol).join('');
      this.log(`天命：${names}`);
    } else this.log('天命花色已隐藏');
    if (enemyStartScore) this.log(`守关者起势 ${enemyStartScore}`);
    if (this.battle.reserve?.length) {
      this.log(`境界底牌 ${this.battle.reserve.length} 张（可主动摸牌）`);
    }
    if (shield) this.log(`开局护体 ×${shield}`);
    if (jiguanTokens) this.log(`机关令 ${jiguanTokens}`);
    // 消耗「下局」临时词条
    if (this.run.runFlags?.nextFlushPct) {
      this.log(`奇遇·同花加持 +${Math.round(this.run.runFlags.nextFlushPct * 100)}%`);
      this.run.runFlags.nextFlushPct = 0;
    }
    if (this.run.runFlags?.nextQi) {
      this.battle.nextPlayQi += this.run.runFlags.nextQi;
      this.log(`奇遇·开场气 +${this.run.runFlags.nextQi}`);
      this.run.runFlags.nextQi = 0;
    }
    this.refreshBattleDynamics();

    return this.battle;
  }

  /** 领取已达成的无尽里程碑，返回本次新领列表 */
  claimEndlessMilestones() {
    if (!this.run?.isEndless) return [];
    const floor = this.run.endlessFloor || this.meta.bestEndless || 0;
    if (!this.meta.endlessMilestones) this.meta.endlessMilestones = {};
    const claimed = [];
    const list = typeof ENDLESS_MILESTONES !== 'undefined' ? ENDLESS_MILESTONES : [];
    const milePct = this.getMetaBonuses().milePct || 0;
    list.forEach(m => {
      if (floor < m.floor) return;
      if (this.meta.endlessMilestones[m.floor]) return;
      this.meta.endlessMilestones[m.floor] = Date.now();
      let dunwu = m.dunwu || 0;
      let yueli = m.yueli || 0;
      if (milePct) {
        dunwu = Math.floor(dunwu * (1 + milePct));
        yueli = Math.floor(yueli * (1 + milePct));
      }
      if (this.run) this.run.dunwu = (this.run.dunwu || 0) + dunwu;
      this.meta.totalYueli = (this.meta.totalYueli || 0) + yueli;
      if (this.run) this.run.yueli = (this.run.yueli || 0) + yueli;
      claimed.push({ ...m, dunwu, yueli });
      this.log(`【里程碑·${m.name}】顿悟+${dunwu} 阅历+${yueli}`);
    });
    if (claimed.length) {
      this.save();
      this.checkMetaAchievements();
    }
    return claimed;
  }

  /** 是否触发关间奇遇 */
  rollStageEvent() {
    if (!this.run) return null;
    const luck = this.getMetaBonuses().eventLuck || 0;
    let chance = 0.42 + luck * 0.1;
    if (this.run.isEndless) chance += 0.08;
    if (Math.random() > chance) return null;
    const pool = typeof STAGE_EVENTS !== 'undefined' ? STAGE_EVENTS : [];
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** 应用奇遇选项 */
  applyStageEventChoice(eventId, choiceId) {
    if (!this.run) return { ok: false, reason: '无论道' };
    const ev = (typeof STAGE_EVENTS !== 'undefined' ? STAGE_EVENTS : []).find(e => e.id === eventId);
    if (!ev) return { ok: false, reason: '无效奇遇' };
    const ch = (ev.choices || []).find(c => c.id === choiceId);
    if (!ch) return { ok: false, reason: '无效选项' };
    const a = ch.apply || {};
    if (!this.run.runFlags) this.run.runFlags = {};

    if (a.costDunwu) {
      if ((this.run.dunwu || 0) < a.costDunwu) return { ok: false, reason: '顿悟不足' };
      this.run.dunwu -= a.costDunwu;
    }
    if (a.dunwu) this.run.dunwu = (this.run.dunwu || 0) + a.dunwu;
    if (a.tokens) {
      // 下局开战再给机关令：记在 runFlags，开战时加
      this.run.runFlags.nextTokens = (this.run.runFlags.nextTokens || 0) + a.tokens;
    }
    if (a.nextShield) this.run.runFlags.nextShield = (this.run.runFlags.nextShield || 0) + a.nextShield;
    if (a.zongshi) this.run.zongshiTokens = (this.run.zongshiTokens || 0) + a.zongshi;
    if (a.xinfa && XINFA[a.xinfa]) {
      const max = XINFA[a.xinfa].max || 5;
      this.run.xinfa[a.xinfa] = Math.min(max, (this.run.xinfa[a.xinfa] || 0) + (a.lv || 1));
    }
    if (a.jinnang) {
      for (let i = 0; i < a.jinnang; i++) {
        const jn = JINNANG_POOL[Math.floor(Math.random() * JINNANG_POOL.length)];
        this.run.jinnang.push({ ...jn, uid: uid() });
      }
    }
    if (a.randomCursed) {
      const cursed = QIPAI_POOL.filter(q => q.rarity === 'cursed' && !this.run.qipai.some(x => x.id === q.id));
      if (cursed.length) {
        const q = cursed[Math.floor(Math.random() * cursed.length)];
        this.run.qipai.push(q);
        this.markSeenQipai([q]);
      }
    }
    if (a.randomCommon) {
      const commons = QIPAI_POOL.filter(q => q.rarity === 'common' && !this.run.qipai.some(x => x.id === q.id));
      if (commons.length) {
        const q = commons[Math.floor(Math.random() * commons.length)];
        this.run.qipai.push(q);
        this.markSeenQipai([q]);
      }
    }
    if (a.nextFlushPct) this.run.runFlags.nextFlushPct = (this.run.runFlags.nextFlushPct || 0) + a.nextFlushPct;
    if (a.nextReveal) this.run.runFlags.nextReveal = 1;
    if (a.nextQi) this.run.runFlags.nextQi = (this.run.runFlags.nextQi || 0) + a.nextQi;
    if (a.nextXinmo) this.run.runFlags.nextXinmo = (this.run.runFlags.nextXinmo || 0) + a.nextXinmo;
    if (a.clearXinmo && this.battle) {
      this.battle.xinmo = Math.max(0, (this.battle.xinmo || 0) - a.clearXinmo);
    }

    this.meta.eventCount = (this.meta.eventCount || 0) + 1;
    this.save();
    this.checkMetaAchievements();
    return { ok: true, choice: ch, openQipai: !!a.openQipai };
  }

  /**
   * 刷新连压威能 / 背水一战 / 回合压迫等动态加成
   */
  refreshBattleDynamics() {
    const b = this.battle;
    if (!b || b.status !== 'playing') return;
    // 连压威能：已有连压时，下一手跟牌额外气（自由出牌不享受，避免无脑甩大）
    const chain = b.playerChain || 0;
    if (chain >= 1) {
      b.comboMomentumQi = Math.min(0.75, 0.12 + (chain - 1) * 0.13);
    } else {
      b.comboMomentumQi = 0;
    }
    const pProg = b.playerScore / Math.max(1, b.threshold);
    const eProg = b.enemyScore / Math.max(1, b.enemyThreshold);
    // 背水：敌方进度过高
    b.threatQi = eProg >= 0.72 ? 0.28 : (eProg >= 0.55 ? 0.12 : 0);
    // 逆风：落后敌方进度时额外回气（鼓励翻盘）
    if (eProg - pProg >= 0.22) {
      b.threatQi += 0.18;
      b.comebackActive = true;
    } else {
      b.comebackActive = false;
    }
    // 终局压迫：接近软回合上限时双方都更「赶」
    const softLeft = (b.maxSoftRound || 24) - (b.round || 1);
    if (softLeft <= 5 && softLeft > 0) {
      b.threatQi += 0.1;
    } else if (softLeft <= 0) {
      b.threatQi += 0.15; // 超时中仍给玩家一点抢分空间
    }
  }

  /**
   * 本手额外策略气：牌型首见 / 巧压（用小牌刚好压过）
   */
  getPlaySkillQi(hand, mustBeat) {
    const b = this.battle;
    if (!b || !hand) return { qi: 0, notes: [] };
    let qi = 0;
    const notes = [];
    const mb = this.getMetaBonuses();
    // 牌型首见：鼓励多样出牌
    let tk = hand.type;
    if (tk === 'rocket') tk = 'bomb';
    else if (tk === 'triple_one' || tk === 'triple_two') tk = 'triple';
    const seen = b.typesPlayed instanceof Set ? b.typesPlayed : new Set();
    // typesPlayed 在计分前可能已加入——调用方需在 add 之前取
    if (!seen.has(tk) && !seen.has(hand.type)) {
      const add = 0.18 + (mb.typeQi || 0);
      qi += add;
      notes.push({ label: '牌型首见', value: `气+${add.toFixed(2)}` });
    }
    // 巧压：跟牌时仅高出上家 1～3 阶，且非炸
    if (mustBeat && b.lastHand && hand.type !== 'bomb' && hand.type !== 'rocket') {
      const gap = (hand.maxOrder || 0) - (b.lastHand.maxOrder || 0);
      if (gap >= 1 && gap <= 3 && hand.type === b.lastHand.type) {
        const add = 0.22 + (mb.cleverQi || 0);
        qi += add;
        notes.push({ label: '巧压', value: `气+${add.toFixed(2)}` });
      }
    }
    // 开局起手：自由第一手若用顺/连对/飞机，小奖节奏
    if (!mustBeat && (b.playsThisBattle || 0) === 0) {
      if (hand.type === 'straight' || hand.type === 'consecutive_pairs' || hand.type === 'airplane') {
        qi += 0.15;
        notes.push({ label: '开局连型', value: '气+0.15' });
      }
      if (mb.firstQi) {
        qi += mb.firstQi;
        notes.push({ label: '起手势', value: `气+${mb.firstQi.toFixed(2)}` });
      }
    }
    // 连压种：有连压时追加
    if ((b.playerChain || 0) >= 1 && mb.chainQi) {
      qi += mb.chainQi;
      notes.push({ label: '连压种', value: `气+${mb.chainQi.toFixed(2)}` });
    }
    return { qi, notes };
  }

  /**
   * 当前是否有可出的合法牌
   */
  countLegalPlays() {
    const b = this.battle;
    if (!b || b.status !== 'playing') return 0;
    const free = b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy';
    const last = free ? null : b.lastHand;
    const hand = b.playerHand.filter(c => !c._frozen);
    return enumeratePlays(hand, last, this.getWildOpts()).length;
  }

  /**
   * 距破境还差多少分
   */
  scoreToClear() {
    const b = this.battle;
    if (!b) return 0;
    return Math.max(0, b.threshold - b.playerScore);
  }

  /**
   * 从境界底牌/牌堆摸牌
   * @param {number} n
   * @param {'manual'|'auto'|'empty'} reason
   */
  drawCardsToHand(n = 1, reason = 'manual') {
    const b = this.battle;
    if (!b || b.status !== 'playing') return { ok: false, reason: '无法摸牌' };
    if (b.turn !== 'player' && reason === 'manual') return { ok: false, reason: '不是你的回合' };

    const room = Math.max(0, (b.handLimit || 20) - b.playerHand.length);
    if (room <= 0) return { ok: false, reason: '手牌已满' };
    const want = Math.min(n, room);
    const drawn = [];

    // 优先境界底牌
    while (drawn.length < want && b.reserve && b.reserve.length) {
      drawn.push(b.reserve.pop());
    }
    // 再从牌堆
    if (drawn.length < want && b.deck.length) {
      drawn.push(...drawCards(b.deck, want - drawn.length));
    }
    if (!drawn.length) return { ok: false, reason: '无牌可摸' };

    b.playerHand = sortCards([...b.playerHand, ...drawn]);
    // 仅手动摸牌计入次数上限，自动/空牌补牌不占用
    if (reason === 'manual') {
      b.drawsThisBattle = (b.drawsThisBattle || 0) + 1;
    }
    const src = reason === 'manual' ? '摸牌' : reason === 'empty' ? '补牌' : '气脉补牌';
    this.log(`${src} +${drawn.length}（手牌${b.playerHand.length}，底牌${b.reserve?.length || 0}）`);
    return { ok: true, drawn: drawn.length, cards: drawn };
  }

  /**
   * 切换宗势令蓄势（手动释放）
   */
  toggleZongshi() {
    const b = this.battle;
    if (!b || b.status !== 'playing' || b.turn !== 'player') {
      return { ok: false, reason: '现在不能用宗势令' };
    }
    if (b.zongshiArmed) {
      b.zongshiArmed = false;
      this.log('取消宗势蓄势');
      return { ok: true, armed: false };
    }
    if ((this.run.zongshiTokens || 0) <= 0) {
      return { ok: false, reason: '没有宗势令' };
    }
    b.zongshiArmed = true;
    this.log('宗势令已蓄势：下次出牌 ×1.3');
    return { ok: true, armed: true, tokens: this.run.zongshiTokens };
  }

  /**
   * 玩家主动摸 1 张境界底牌
   */
  manualDraw() {
    const b = this.battle;
    if (!b || b.turn !== 'player' || b.status !== 'playing') {
      return { ok: false, reason: '现在不能摸牌' };
    }
    const drawMax = 6 + (this.getMetaBonuses().drawExtra || 0);
    if ((b.drawsThisBattle || 0) >= drawMax) return { ok: false, reason: `本局摸牌次数已达上限（${drawMax}）` };
    // 手动摸牌略增心魔压力，防止无限摸
    const res = this.drawCardsToHand(1, 'manual');
    if (res.ok && (b.drawsThisBattle % 3 === 0)) {
      b.xinmo = Math.min((b.xinmoCap || 5), b.xinmo + 0); // 不额外惩罚前几次
    }
    // 每第 3、6 次手动/自动合计摸牌时 +0 心魔；改为：手牌>12 时摸牌 +1 心魔
    if (res.ok && b.playerHand.length > 12) {
      b.xinmo++;
      this.log('手牌臃肿，心魔+1');
      this.checkXinmo();
    }
    return res;
  }

  log(msg) {
    if (!this.battle) return;
    this.battle.log.unshift({ t: Date.now(), msg });
    if (this.battle.log.length > 50) this.battle.log.pop();
  }

  getScoreContext() {
    const b = this.battle;
    const r = this.run;
    return {
      qipaiList: r.qipai,
      qipaiCount: r.qipai.length,
      xinfa: r.xinfa,
      tianmingSuit: b.tianmingHidden ? null : b.tianmingSuit,
      tianmingSuits: b.tianmingHidden ? [] : b.tianmingSuits,
      tianmingDouble: b.tianmingDouble,
      lastPlayerMaxOrder: b.lastPlayerMaxOrder,
      playerChain: b.playerChain,
      jiguanUsedCount: b.jiguanUsedCount,
      turnJiguanUsed: b.turnJiguanUsed,
      // skillPlayQi 已含连压种/首见/巧压等；勿再叠加 metaChainQi
      tempQi: b.tempQi + b.nextPlayQi + b.afterBombQi + b.juqiBonus + (b.qiRain || 0)
        + Math.min(0.6, (b.initiativeStreak || 0) * 0.2)
        + (b.comboMomentumQi || 0)
        + (b.threatQi || 0)
        + (b.skillPlayQi || 0),
      tempLi: b.tempLi || 0,
      // 词条同花 + 阅历「同花种」合并（勿重复声明键名覆盖）
      flushExtraPct: (b.flushExtraPct || 0) + (b.metaFlushPct || 0),
      skillNotes: b.skillPlayNotes || [],
      duanweiLi: r.duanweiLi,
      discardLiBonus: b.discardLiBonus,
      pairToTripleBonus: b.pairToTripleBonus,
      bombQiStacks: b.bombQiStacks,
      yingCounterQi: b.yingCounterQi,
      counterLi: b.counterLi,
      character: r.character,
      handCount: b.playerHand.length,
      hasQipai: (id) => this.hasQipai(id),
      firstHandType: b.firstHandType,
      firstHandBoost: b.firstHandBoost,
      boss: b.boss,
      qiCap: b.qiCap,
      // 预览时把「已蓄势宗势」算进去；真正出牌时会写入 pendingZongshi
      pendingZongshi: b.pendingZongshi || (b.zongshiArmed && (this.run.zongshiTokens || 0) > 0 ? 1.3 : null),
      gumingZongshi: b.gumingActive,
      fiveTypesReady: b.fiveTypesReady,
      guiyiZongshi: b.guiyiReady,
      stageType: b.stageType,
      playsThisBattle: b.playsThisBattle,
      typesPlayedCount: (b.typesPlayed instanceof Set) ? b.typesPlayed.size : 0,
      playerScore: b.playerScore,
      enemyScore: b.enemyScore,
      threshold: b.threshold,
      enemyThreshold: b.enemyThreshold,
      mustBeat: !b.freePlay && b.lastPlayer === 'enemy',
      allXinfaBonus: b.allXinfaBonus,
      shunshiBoost: b.shunshiBoost,
      allTianmingHalf: b.allTianmingHalf,
      jieqiZongshi: b.jieqiZongshi,
      everyNZongshi: (b.playsThisBattle > 0 && b.playsThisBattle % 5 === 0 && this.hasQipai('taixu')) ? 1.35 : null,
      softcapRate: b.softcapRate,
      modBombQi: b.modBombQi,
      scoreTax: b.scoreTax,
      cursedBoost: r.character.passive?.type === 'cursed_boost' ? (1 + r.character.passive.amount) : 1,
      weeklyBonus: b.weeklyBonus,
    };
  }

  /** 清理无效选中（手牌里已不存在的 id） */
  pruneSelection() {
    const b = this.battle;
    if (!b) return;
    if (!(b.selectedIds instanceof Set)) b.selectedIds = new Set(b.selectedIds || []);
    const valid = new Set((b.playerHand || []).map(c => c.id));
    const next = new Set();
    for (const id of b.selectedIds) {
      if (valid.has(id)) next.add(id);
    }
    b.selectedIds = next;
  }

  /**
   * 点选手牌
   * - 普通点击：智能成组（点一张自动选中包含它的最佳合法牌型）
   * - 再点同组内牌：在可选方案中轮换
   * - multi=true（Shift）：手动加减单张
   */
  toggleSelect(cardId, opts = {}) {
    const b = this.battle;
    if (b.status !== 'playing' || b.turn !== 'player') return;
    this.pruneSelection();

    const card = b.playerHand.find(c => c.id === cardId);
    if (!card || card._frozen) return;

    // 手动多选：只切换这一张
    if (opts.multi) {
      if (b.selectedIds.has(cardId)) b.selectedIds.delete(cardId);
      else b.selectedIds.add(cardId);
      b._selectCycleKey = null;
      b._selectCycleIdx = 0;
      return;
    }

    // 已在当前选中组内 → 轮换其它含此牌的合法出法；无更多方案则清空
    if (b.selectedIds.has(cardId)) {
      const alts = this.listPlaysIncluding(cardId);
      if (alts.length > 1) {
        const curKey = [...b.selectedIds].sort().join(',');
        let idx = alts.findIndex(p => p.cards.map(c => c.id).sort().join(',') === curKey);
        if (idx < 0) idx = b._selectCycleIdx || 0;
        idx = (idx + 1) % alts.length;
        b._selectCycleIdx = idx;
        b._selectCycleKey = cardId;
        b.selectedIds = new Set(alts[idx].cards.map(c => c.id));
        return;
      }
      // 仅一种方案：点一次取消
      b.selectedIds.clear();
      b._selectCycleKey = null;
      b._selectCycleIdx = 0;
      return;
    }

    // 智能：选中「包含这张牌」的最佳合法出法
    const alts = this.listPlaysIncluding(cardId);
    if (alts.length) {
      b._selectCycleKey = cardId;
      b._selectCycleIdx = 0;
      b.selectedIds = new Set(alts[0].cards.map(c => c.id));
      return;
    }

    // 没有合法组合时，仅选中这一张（便于看提示 / 自由出单）
    b.selectedIds = new Set([cardId]);
    b._selectCycleKey = null;
    b._selectCycleIdx = 0;
  }

  /** 含 cardId 的全部合法出法（已按策略排序） */
  listPlaysIncluding(cardId) {
    const b = this.battle;
    const handCards = b.playerHand.filter(c => !c._frozen);
    const free = b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy';
    const last = free ? null : b.lastHand;
    const opts = this.getWildOpts();

    let plays = enumeratePlays(handCards, last, opts).filter(p => p.cards.some(c => c.id === cardId));
    if (!plays.length && free) {
      const one = handCards.find(c => c.id === cardId);
      if (one) {
        const h = analyzeHand([one], opts);
        if (h) plays = [h];
      }
    }
    return this.rankPlays(plays, free);
  }

  /**
   * 带策略气的完整估分（与真实出牌同一套耦合）
   * mustBeat: 是否跟牌
   */
  scorePlayEstimate(hand, mustBeat) {
    const b = this.battle;
    if (!b || !hand) return 0;
    this.refreshBattleDynamics?.();
    const savedCombo = b.comboMomentumQi;
    const savedSkill = b.skillPlayQi;
    const savedNotes = b.skillPlayNotes;
    if (!mustBeat) b.comboMomentumQi = 0;
    try {
      const skill = this.getPlaySkillQi(hand, !!mustBeat);
      b.skillPlayQi = skill.qi || 0;
      b.skillPlayNotes = skill.notes || [];
      return calculateScore(hand, this.getScoreContext()).score;
    } catch (_) {
      return Math.floor((hand.liSum || 0) * (hand.baseQi || 1));
    } finally {
      b.skillPlayQi = savedSkill || 0;
      b.skillPlayNotes = savedNotes || [];
      b.comboMomentumQi = savedCombo;
    }
  }

  /** 对可出牌型排序：跟牌最小代价；自由高分且少炸；临近破境优先能破 */
  rankPlays(plays, free) {
    if (!plays || !plays.length) return [];
    const need = this.scoreToClear();
    const mustBeat = !free;
    const scored = plays.map(p => {
      const est = this.scorePlayEstimate(p, mustBeat);
      return { p, est };
    });
    scored.sort((a, b2) => {
      const pa = a.p, pb = b2.p;
      const aBomb = pa.type === 'bomb' || pa.type === 'rocket' ? 1 : 0;
      const bBomb = pb.type === 'bomb' || pb.type === 'rocket' ? 1 : 0;
      // 临近破境：能破境的非炸优先
      if (need > 0) {
        const aClear = a.est >= need ? 1 : 0;
        const bClear = b2.est >= need ? 1 : 0;
        if (aClear !== bClear) return bClear - aClear;
        if (aClear && aBomb !== bBomb) return aBomb - bBomb;
      }
      if (free) {
        if (aBomb !== bBomb) return aBomb - bBomb;
        if (b2.est !== a.est) return b2.est - a.est;
        return pa.maxOrder - pb.maxOrder;
      }
      if (aBomb !== bBomb) return aBomb - bBomb;
      if (pa.maxOrder !== pb.maxOrder) return pa.maxOrder - pb.maxOrder;
      return pa.cards.length - pb.cards.length;
    });
    return scored.map(x => x.p);
  }

  /**
   * 找包含 cardId 的最佳可出牌型
   */
  findBestPlayIncluding(cardId) {
    const list = this.listPlaysIncluding(cardId);
    return list[0] || null;
  }

  /** 预估当前选中出牌得分 */
  estimateSelectedScore() {
    const hand = this.getSelectedHand();
    if (!hand || !this.canPlaySelected()) return null;
    const b = this.battle;
    const free = b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy';
    const mustBeat = !free && b.lastHand && b.lastPlayer === 'enemy';
    this.refreshBattleDynamics();
    const savedCombo = b.comboMomentumQi;
    const savedSkill = b.skillPlayQi;
    const savedNotes = b.skillPlayNotes;
    if (!mustBeat) b.comboMomentumQi = 0;
    try {
      const skill = this.getPlaySkillQi(hand, mustBeat);
      b.skillPlayQi = skill.qi || 0;
      b.skillPlayNotes = skill.notes || [];
      const result = calculateScore(hand, this.getScoreContext());
      // 附带 notes 便于 UI
      if (result && skill.notes?.length) {
        result.skillNotes = skill.notes;
      }
      return result;
    } catch (_) {
      return { score: Math.floor(hand.liSum * hand.baseQi), breakdown: [] };
    } finally {
      b.skillPlayQi = savedSkill || 0;
      b.skillPlayNotes = savedNotes || [];
      b.comboMomentumQi = savedCombo;
    }
  }

  /** 局面推荐：带完整计分上下文（含策略气） */
  recommendBestPlay() {
    const b = this.battle;
    if (!b) return null;
    const free = b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy';
    const last = free ? null : b.lastHand;
    const handCards = b.playerHand.filter(c => !c._frozen);
    const mustBeat = !free;
    return recommendPlay(handCards, last, {
      freePlay: free,
      needScore: this.scoreToClear(),
      scoreCtx: this.getScoreContext(),
      preferClear: this.scoreToClear() > 0 && this.scoreToClear() < Math.max(200, b.threshold * 0.25),
      scoreFn: (p) => this.scorePlayEstimate(p, mustBeat),
    });
  }

  getSelectedCards() {
    this.pruneSelection();
    // 按选中顺序不稳定；统一按牌面排序，避免牌型判定错乱
    return sortCards(this.battle.playerHand.filter(c => this.battle.selectedIds.has(c.id)));
  }

  getWildOpts() {
    const b = this.battle;
    const opts = {};
    if (b.baibianActive) opts.wildRank = b.baibianActive;
    else if (b.yirongActive) opts.wildRank = b.yirongActive;
    return opts;
  }

  getSelectedHand() {
    const cards = this.getSelectedCards();
    if (!cards.length) return null;
    return analyzeHand(cards, this.getWildOpts());
  }

  canPlaySelected() {
    const hand = this.getSelectedHand();
    if (!hand) return false;
    // 选中张数必须与牌型张数一致（防止多选杂牌却判成了其中一部分）
    if (hand.cards.length !== this.battle.selectedIds.size) return false;
    const b = this.battle;
    if (b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy') return true;
    return canBeat(hand, b.lastHand);
  }

  playSelected() {
    const b = this.battle;
    if (b.status !== 'playing' || b.turn !== 'player') return { ok: false, reason: '不是你的回合' };

    this.pruneSelection();
    if (!b.selectedIds.size) return { ok: false, reason: '请先选牌' };

    for (const id of b.selectedIds) {
      const c = b.playerHand.find(x => x.id === id);
      if (!c) return { ok: false, reason: '选中的牌已不在手中' };
      if (c._frozen) return { ok: false, reason: '包含冻结牌' };
    }

    const hand = this.getSelectedHand();
    if (!hand) return { ok: false, reason: '不是合法牌型' };

    // 严格：选中集合必须等于牌型用牌集合
    const handIds = new Set(hand.cards.map(c => c.id));
    if (handIds.size !== b.selectedIds.size || [...b.selectedIds].some(id => !handIds.has(id))) {
      return { ok: false, reason: '选牌与牌型不一致，请重选' };
    }

    const mustBeat = !b.freePlay && b.lastHand && b.lastPlayer === 'enemy';
    if (mustBeat && !canBeat(hand, b.lastHand)) return { ok: false, reason: '压不过上一手' };

    // 刷新动态气（连压/背水）供本次计分
    this.refreshBattleDynamics();
    // 自由出牌不吃连压威能（避免起手就叠）
    if (!mustBeat) b.comboMomentumQi = 0;

    // 策略气：须在 typesPlayed 写入前计算「首见」
    const skill = this.getPlaySkillQi(hand, mustBeat);
    b.skillPlayQi = skill.qi || 0;
    b.skillPlayNotes = skill.notes || [];

    // 快照 id，防止过程中 selected 被改
    const ids = new Set(hand.cards.map(c => c.id));
    const stillThere = ids.size === [...ids].filter(id => b.playerHand.some(c => c.id === id)).length;
    if (!stillThere) return { ok: false, reason: '手牌状态异常，请重选' };

    b.playerHand = b.playerHand.filter(c => !ids.has(c.id));
    b.selectedIds.clear();

    if (b.gumingPending && !b.gumingActive) {
      b.gumingActive = true;
      b.gumingPending = false;
    }

    {
      let tk = hand.type;
      if (tk === 'rocket') tk = 'bomb';
      else if (tk === 'triple_one' || tk === 'triple_two') tk = 'triple';
      if (!(b.typesPlayed instanceof Set)) b.typesPlayed = new Set();
      b.typesPlayed.add(tk);
    }
    if (!this.run.stats) this.run.stats = {};
    if (!(this.run.stats.types instanceof Set)) {
      this.run.stats.types = new Set(Array.isArray(this.run.stats.types) ? this.run.stats.types : []);
    }
    this.run.stats.types.add(hand.type);
    const need = ['single', 'pair', 'triple', 'straight', 'bomb'];
    if (this.hasQipai('wuzonghui') && need.every(t => b.typesPlayed.has(t)) && !b.fiveTypesFired) {
      b.fiveTypesReady = true;
      b.fiveTypesFired = true;
      this.log('【五宗会】下一手宗势×1.5');
    }

    if (this.run.character.id === 'lu_gui') {
      if (!(b.guiyiTypes instanceof Set)) b.guiyiTypes = new Set();
      b.guiyiTypes.add(hand.type);
      if (b.guiyiTypes.size >= 5) {
        b.guiyiReady = true;
        this.log('【归一诀】五宗连携！');
      }
    }

    if (!b.firstHandType) b.firstHandType = hand.type;

    if (this.run.character.passive?.type === 'bomb_draw') {
      if (hand.type !== 'bomb' && hand.type !== 'rocket') b.bombQiStacks = (b.bombQiStacks || 0) + 1;
    }

    // 宗势令：仅手动蓄势后消耗
    if (b.zongshiArmed && this.run.zongshiTokens > 0) {
      b.pendingZongshi = 1.3;
      this.run.zongshiTokens--;
      b.zongshiArmed = false;
      this.log('发动宗势令！宗势×1.3');
    }

    const ctx = this.getScoreContext();
    const result = calculateScore(hand, ctx);

    const usedGuming = b.gumingActive;
    b.tempQi = 0;
    b.tempLi = 0;
    b.nextPlayQi = 0;
    b.afterBombQi = 0;
    b.juqiBonus = 0;
    b.discardLiBonus = 0;
    b.pairToTripleBonus = 0;
    b.yingCounterQi = 0;
    b.counterLi = 0;
    b.pendingZongshi = null;
    b.fiveTypesReady = false;
    b.guiyiReady = false;
    b.gumingActive = false;
    b.baibianActive = null;
    b.yirongActive = null;
    b.tianmingDouble = 1;
    b.comboMomentumQi = 0; // 已计入本手
    b.skillPlayQi = 0;
    // 技能分注记并入 breakdown（便于结算展示）
    if (skill.notes && skill.notes.length && result.breakdown) {
      skill.notes.forEach(n => result.breakdown.splice(result.breakdown.length - 1, 0, n));
    }
    b.skillPlayNotes = [];

    // 若此分足以破境，标记高光
    const willClear = b.playerScore + result.score >= b.threshold;
    const overkill = willClear ? (b.playerScore + result.score - b.threshold) : 0;

    b.playerScore += result.score;
    b.lastPlayScore = result.score;
    b.lastScoreBreakdown = result.breakdown;
    b.lastOverkill = overkill;
    b.lastHand = hand;
    b.lastPlayer = 'player';
    b.freePlay = false;
    b.passStreak = 0;
    b.playerChain++;
    b.enemyChain = 0;
    b.lastPlayerMaxOrder = hand.maxOrder;
    b.turnJiguanUsed = 0;
    b.playsThisBattle++;
    if (mustBeat) {
      b.successfulBeats = (b.successfulBeats || 0) + 1;
      b.lastPlayWasBeat = true;
      if (b.metaBeatLi) {
        b.tempLi = (b.tempLi || 0) + b.metaBeatLi;
        this.log(`【压理种】下一手牌理+${b.metaBeatLi}`);
      }
    } else {
      b.lastPlayWasBeat = false;
    }
    b.initiativeStreak = (b.initiativeStreak || 0) + 1;
    this.refreshBattleDynamics();

    // 出牌后自动补牌：手牌偏少时从境界底牌补；近破境时少补，避免冲淡决策
    b.autoDrawCounter = (b.autoDrawCounter || 0) + 1;
    const nearClear = (b.threshold - b.playerScore) <= Math.max(150, b.threshold * 0.12);
    if (
      b.playerHand.length > 0
      && b.playerHand.length <= (nearClear ? 5 : 7)
      && b.autoDrawCounter % 2 === 0
      && !willClear
    ) {
      this.drawCardsToHand(1, 'auto');
    }

    this.run.totalScore += result.score;
    this.run.stats.maxHand = Math.max(this.run.stats.maxHand, result.score);
    this.run.stats.maxChain = Math.max(this.run.stats.maxChain, b.playerChain);
    if (!this.meta.stats) this.meta.stats = {};
    this.meta.stats.maxHandScore = Math.max(this.meta.stats.maxHandScore || 0, result.score);
    this.meta.stats.maxChain = Math.max(this.meta.stats.maxChain || 0, b.playerChain);

    if (hand.type === 'bomb' || hand.type === 'rocket') {
      b.bombCount++;
      this.run.stats.bombs++;
      this.meta.stats.bombs = (this.meta.stats.bombs || 0) + 1;
      if (hand.type === 'rocket') {
        this.meta.stats.rockets = (this.meta.stats.rockets || 0) + 1;
        this.grantAchievement('rocket_once');
      }
    }
    if (result.isFlush) {
      b.flushCount++;
      this.run.stats.flushes++;
      this.meta.stats.flushes = (this.meta.stats.flushes || 0) + 1;
    }

    const left = Math.max(0, b.threshold - b.playerScore);
    this.log(
      willClear
        ? `你打出【${hand.name}】+${result.score} → 破境！`
        : `你打出【${hand.name}】+${result.score}（${b.playerScore}/${b.threshold}，差${left}）`
    );

    if (result.breakdown.some(x => x.label === '天命花色')) {
      b.tianmingTriggerCount++;
      if (b.tianmingTriggerCount === 1 && this.hasQipai('mingdeng')) {
        const jn = JINNANG_POOL[Math.floor(Math.random() * JINNANG_POOL.length)];
        this.run.jinnang.push({ ...jn, uid: uid() });
        this.log(`【明灯】锦囊：${jn.name}`);
      }
    }

    if (result.isFlush) {
      b.flushStreak++;
      if (b.flushStreak >= 2 && this.run.character.id === 'bu') {
        b.tianmingDouble = 2;
        this.log('【天机测】天命翻倍');
        b.flushStreak = 0;
      }
    } else b.flushStreak = 0;

    if (hand.type === 'pair' && this.hasQipai('shuangxiu')) b.pairToTripleBonus = 5;
    if ((hand.type === 'bomb' || hand.type === 'rocket') && this.hasQipai('jieshi')) {
      b.afterBombQi = 1.5;
      this.log('【借势】下次气+1.5');
    }
    if ((hand.type === 'bomb' || hand.type === 'rocket') && this.hasQipai('canhuo') && b.playerScore < b.threshold) {
      b.shield++;
      this.log('【残火】护体+1');
    }
    if (hand.type === 'rocket' && this.hasQipai('tiansha_linmen')) {
      b.xinmo += 2;
      this.log('【天煞临门】心魔+2');
    }
    if (this.hasQipai('xuejie')) {
      b.xinmo += 1;
    }
    if (usedGuming && b.playerScore < b.threshold) {
      b.xinmo += 3;
      this.log('【赌命】未通关 心魔+3');
    }

    if ((hand.type === 'bomb' || hand.type === 'rocket') && this.run.character.passive?.type === 'bomb_draw' && mustBeat) {
      const drawn = drawCards(b.deck, 1);
      b.playerHand = sortCards([...b.playerHand, ...drawn]);
      if (drawn.length) this.log('【镇魂斩】摸1');
      b.bombQiStacks = 0;
    }

    // 成就须在破竹重置连压之前检查
    if (result.score >= 500) this.grantAchievement('big_hand');
    if (result.score >= 1500) this.grantAchievement('big_hand_2');
    if (result.score >= 3000) this.grantAchievement('big_hand_3');
    if (b.playerChain >= 6) this.grantAchievement('combo_chain');
    if (b.playerChain >= 10) this.grantAchievement('combo_chain_10');
    if (b.bombCount >= 5) this.grantAchievement('bomb_king');
    if (b.bombCount >= 10) this.grantAchievement('bomb_legend');
    if (b.flushCount >= 4) this.grantAchievement('flush_master');
    if (b.flushCount >= 8) this.grantAchievement('flush_legend');

    if (this.hasQipai('pozhu') && b.playerChain >= 3) {
      const jg = JIGUAN_POOL[Math.floor(Math.random() * JIGUAN_POOL.length)];
      b.jiguanHand.push({ ...jg, uid: uid() });
      this.log('【破竹】机关：' + jg.name);
      b.playerChain = 0;
    }

    if (b.boss?.overflowShield && hand.type === 'bomb' && b.playerScore > b.threshold) b.shield++;

    if (b.playerScore >= b.threshold) {
      const win = this.onWin();
      return {
        ok: true,
        won: true,
        score: result.score,
        breakdown: result.breakdown,
        hand,
        willClear: true,
        leftToClear: 0,
        reward: win.reward,
        yueliGain: win.yueliGain,
      };
    }

    if (b.playerHand.length === 0) {
      // 打空手牌时多摸几张，保持后期节奏，避免立刻耗尽判负
      const refill = this.drawCardsToHand(8, 'empty');
      if (!refill.ok) {
        const lose = this.onLose('手牌耗尽，未达门槛');
        return {
          ok: true,
          lost: true,
          score: result.score,
          breakdown: result.breakdown,
          hand,
          reason: lose.reason,
          yueli: lose.yueli,
        };
      }
      this.log(`手牌告罄，补牌 ${refill.drawn || 0} 张`);
    }

    this.checkXinmo();
    // 心魔爆发可能抬门槛；再判一次破境
    if (b.playerScore >= b.threshold) {
      const win = this.onWin();
      return {
        ok: true,
        won: true,
        score: result.score,
        breakdown: result.breakdown,
        hand,
        willClear: true,
        leftToClear: 0,
        reward: win.reward,
        yueliGain: win.yueliGain,
      };
    }

    b.turn = 'enemy';
    return {
      ok: true,
      score: result.score,
      breakdown: result.breakdown,
      hand,
      willClear: false,
      leftToClear: Math.max(0, b.threshold - b.playerScore),
    };
  }

  pass() {
    const b = this.battle;
    if (b.status !== 'playing' || b.turn !== 'player') return { ok: false };
    if (b.freePlay || !b.lastHand) return { ok: false, reason: '自由出牌必须出牌' };
    if (b.lastPlayer === 'player') return { ok: false, reason: '请自由出牌' };

    b.passStreak++;
    b.playerChain = 0;
    b.initiativeStreak = 0;
    b.comboMomentumQi = 0;
    b.selectedIds.clear();
    b.passedThisBattle = true;
    this.run.stats.passes++;
    this.refreshBattleDynamics();

    const passMul = b.weeklyBonus?.passQiMul || 1;
    const xipaiMax = b.weeklyBonus?.xipaiMax || 3;
    const metaPass = this.getMetaBonuses().passQi || 0;
    if (this.hasQipai('xipai') && b.passQiUsed < xipaiMax) {
      const add = 0.4 * passMul + metaPass;
      b.nextPlayQi += add;
      b.passQiUsed++;
      this.log(`【惜牌】气+${add.toFixed(2)}`);
    } else {
      const add = 0.2 * passMul + metaPass;
      b.nextPlayQi += add;
      this.log(`过牌 气+${add.toFixed(2)}`);
    }

    if (b.passStreak >= 2) {
      b.xinmo += 1 + (b.passXinmoExtra || 0);
      this.log(`连续过牌 心魔${b.xinmo}/${b.xinmoCap}`);
    } else if (b.passXinmoExtra) {
      b.xinmo += b.passXinmoExtra;
    }

    this.checkXinmo();
    b.freePlay = true;
    b.lastHand = null;
    b.lastPlayer = null;
    b.turn = 'enemy';
    b.turnJiguanUsed = 0;
    return { ok: true };
  }

  checkXinmo() {
    const b = this.battle;
    const cap = b.xinmoCap || 5;
    if (b.xinmo >= cap) {
      b.xinmo = 0;
      if (Math.random() < 0.5 && b.playerHand.length) {
        b.playerHand[Math.floor(Math.random() * b.playerHand.length)]._frozen = true;
        this.log('心魔爆发！冻结1张牌');
      } else {
        b.threshold = Math.floor(b.threshold * 1.08);
        this.log(`心魔爆发！门槛→${b.threshold}`);
      }
    }
  }

  enemyTurn() {
    const b = this.battle;
    if (!b || b.status !== 'playing') return { done: true, status: b?.status };
    if (b.turn !== 'enemy') return { done: true, reason: 'not_enemy_turn' };

    if (b.enemySkip) {
      b.enemySkip = false;
      this.log('守关者被封喉');
      this.afterEnemyPass();
      if (b.status === 'lost') return { action: 'skip', lost: true, reason: '拖回合失败' };
      return { action: 'skip' };
    }

    const usable = b.enemyHand.filter(c => !b.frozenEnemyIds.has(c.id));
    const freePlay = !!(b.freePlay || !b.lastHand || b.lastPlayer === 'enemy');
    const last = freePlay ? null : b.lastHand;

    const diff = this.run.difficulty;
    const aiRate = (0.42 + (this.run.realmIndex || 0) * 0.05) * diff.enemy * (b.enemyBoost || 1);

    // 策略：连压打断 / 玩家危急强攻 / 落后抢分 / 常规
    let strategy = 'normal';
    const pProg = b.playerScore / Math.max(1, b.threshold);
    const eProg = b.enemyScore / Math.max(1, b.enemyThreshold);
    const playerNearClear = (b.threshold - b.playerScore) < Math.max(120, b.threshold * 0.12);
    if (b.playerChain >= 2) strategy = 'block';
    if (pProg >= 0.68 || playerNearClear) strategy = 'aggressive';
    if (eProg + 0.12 < pProg && b.round > 6) strategy = 'aggressive';
    if (diff.id === 'legend' && b.playerChain >= 1) strategy = 'block';
    if (diff.id === 'master' && b.playerChain >= 2) strategy = 'block';
    // 终局回合：守关者全力抢分
    if (b.round > (b.maxSoftRound || 24) * 0.7) strategy = 'aggressive';

    const aiCtx = {
      strategy,
      freePlay,
      playerScore: b.playerScore,
      playerThreshold: b.threshold,
      enemyScore: b.enemyScore,
      enemyThreshold: b.enemyThreshold,
      playerChain: b.playerChain,
      playerHandCount: b.playerHand.length,
      enemyHandCount: b.enemyHand.length,
      round: b.round,
      maxSoftRound: b.maxSoftRound,
      difficulty: diff.id,
      aiRate,
    };

    let play = aiChoosePlay(usable, last, aiCtx);
    // 中后期若选择过牌但其实有牌，再以激进策略重算一次
    if (!play && !freePlay && usable.length) {
      play = aiChoosePlay(usable, last, { ...aiCtx, strategy: 'aggressive' });
    }
    // 自由出牌却空：兜底随便出最小
    if (!play && freePlay && usable.length) {
      play = aiChoosePlay(usable, null, { ...aiCtx, strategy: 'normal', freePlay: true });
    }

    if (!play) {
      this.log('守关者过牌');
      this.afterEnemyPass();
      if (b.status === 'lost') return { action: 'pass', lost: true, reason: '拖回合失败' };
      return { action: 'pass' };
    }

    const ids = new Set(play.cards.map(c => c.id));
    b.enemyHand = b.enemyHand.filter(c => !ids.has(c.id));
    if (!(b.frozenEnemyIds instanceof Set)) b.frozenEnemyIds = new Set();
    b.frozenEnemyIds.clear();

    let aiScore = Math.floor(play.liSum * play.baseQi * aiRate);
    if (b.round > 16) aiScore = Math.floor(aiScore * 1.1);
    if (play.type === 'bomb' || play.type === 'rocket') aiScore = Math.floor(aiScore * 1.25);
    // 连压打断成功时略增压力
    if (b.playerChain >= 2 && strategy === 'block') aiScore = Math.floor(aiScore * 1.08);
    b.enemyScore += aiScore;
    b.lastHand = play;
    b.lastPlayer = 'enemy';
    b.freePlay = false;
    b.enemyChain++;
    b.playerChain = 0;
    b.comboMomentumQi = 0;
    b.passStreak = 0;

    this.log(`守关者【${play.name}】+${aiScore}（${b.enemyScore}/${b.enemyThreshold}）`);
    // 被压制，气脉中断
    b.initiativeStreak = 0;
    this.refreshBattleDynamics();

    if (this.run.character.passive?.type === 'counter_qi') {
      b.yingCounterQi = this.run.character.passive.amount;
    }
    if (this.hasQipai('fanji')) b.counterLi = 10;
    if (b.boss?.enemyCounter) b.enemyScore += b.boss.enemyCounter;

    if (b.enemyScore >= b.enemyThreshold) {
      if (b.shield > 0) {
        b.shield--;
        if (this.hasQipai('huti_tie')) b.playerScore += 80;
        b.enemyScore = Math.floor(b.enemyThreshold * 0.65);
        this.log('护体抵御破境！');
        // 护体回血后若玩家已达门槛，仍算玩家破境
        if (b.playerScore >= b.threshold) {
          const win = this.onWin();
          return { action: 'play', hand: play, score: aiScore, won: true, reward: win.reward, yueliGain: win.yueliGain };
        }
      } else {
        const lose = this.onLose('守关者先破境');
        return { action: 'play', hand: play, score: aiScore, lost: true, reason: lose.reason, yueli: lose.yueli };
      }
    }

    if (b.enemyHand.length === 0) {
      const refill = drawCards(b.deck, Math.min(8, b.deck.length));
      if (refill.length) {
        b.enemyHand = sortCards(refill);
        this.log('守关者重整');
      } else {
        b.enemyScore += 25;
        if (b.enemyScore >= b.enemyThreshold && b.shield <= 0) {
          const lose = this.onLose('守关者破境');
          return { action: 'play', hand: play, score: aiScore, lost: true, reason: lose.reason, yueli: lose.yueli };
        }
      }
    }

    b.turn = 'player';
    b.turnJiguanUsed = 0;
    b.round++;
    this.tickRoundEffects();
    if (b.status === 'lost') {
      return { action: 'play', hand: play, score: aiScore, lost: true, reason: '拖回合失败' };
    }
    if (b.status === 'won') {
      return { action: 'play', hand: play, score: aiScore, won: true };
    }
    return { action: 'play', hand: play, score: aiScore };
  }

  afterEnemyPass() {
    const b = this.battle;
    if (!b || b.status !== 'playing') return;
    if (b.lastPlayer === 'player') {
      b.freePlay = true;
      b.lastHand = null;
      // 掌握出牌权：蓄势（连压越高，气脉越强）
      b.initiativeStreak = (b.initiativeStreak || 0) + 1;
      const chainBonus = Math.min(0.35, (b.playerChain || 0) * 0.05);
      const base = 0.15 + Math.min(0.3, (b.initiativeStreak - 1) * 0.08);
      const gain = base + chainBonus;
      b.nextPlayQi += gain;
      this.log(`一轮结束，你掌握出牌权（气脉+${gain.toFixed(2)}）`);
      // 连压未断：保留 chain 供下轮跟牌威能；自由出牌后会在出牌时处理
    } else {
      b.initiativeStreak = 0;
      b.playerChain = 0;
      b.comboMomentumQi = 0;
      b.freePlay = true;
      b.lastHand = null;
    }
    b.turn = 'player';
    b.turnJiguanUsed = 0;
    b.round++;
    this.tickRoundEffects();
    this.refreshBattleDynamics();
  }

  tickRoundEffects() {
    const b = this.battle;
    if (!b || b.status !== 'playing') return;
    if (this.hasQipai('fengmo')) {
      b.fengmoRounds++;
      if (b.fengmoRounds % 4 === 0) {
        b.handLimit = Math.max(8, b.handLimit - 1);
        this.log('【疯魔】手牌上限-1');
      }
    }
    if (b.boss?.tianmingRotate && b.round % b.boss.tianmingRotate === 0) {
      b.tianmingSuit = randomTianmingSuit();
      b.tianmingSuits = [b.tianmingSuit];
      b.tianmingHidden = false;
      this.log(`天命变为 ${SUITS.find(s => s.id === b.tianmingSuit)?.symbol}`);
    }
    if (b.boss?.thresholdCreep && b.boss.every && b.round % b.boss.every === 0) {
      b.threshold = Math.floor(b.threshold * (1 + b.boss.thresholdCreep));
      this.log(`虚空压迫 门槛→${b.threshold}`);
    }
    if (b.qiRain) b.nextPlayQi += b.qiRain;

    const softLeft = (b.maxSoftRound || 24) - b.round;
    if (softLeft === 5) this.log('论道将入末段，守关者气势将升…');
    if (softLeft === 0) this.log('论道超时压迫开始！');

    if (b.round > b.maxSoftRound) {
      const over = b.round - b.maxSoftRound;
      const gain = 12 + (this.run.realmIndex || 0) * 8 + Math.min(20, over * 3);
      b.enemyScore += gain;
      this.log(`论道过久，守关者气势+${gain}`);
      if (b.enemyScore >= b.enemyThreshold && b.shield <= 0) {
        this.onLose('拖回合失败');
      }
    }
    this.refreshBattleDynamics();
  }

  /** 局面摘要：给 UI 用 */
  getBattleHud() {
    const b = this.battle;
    if (!b) return null;
    const need = this.scoreToClear();
    const pProg = b.playerScore / Math.max(1, b.threshold);
    const eProg = b.enemyScore / Math.max(1, b.enemyThreshold);
    const softLeft = (b.maxSoftRound || 24) - (b.round || 1);
    const nextQi = (b.nextPlayQi || 0) + (b.afterBombQi || 0) + (b.juqiBonus || 0)
      + Math.min(0.6, (b.initiativeStreak || 0) * 0.2)
      + (b.comboMomentumQi || 0) + (b.threatQi || 0);
    return {
      need,
      pProg,
      eProg,
      softLeft,
      nextQi,
      chain: b.playerChain || 0,
      threat: eProg >= 0.72 ? 'high' : eProg >= 0.55 ? 'mid' : 'low',
      nearClear: pProg >= 0.75 || (need > 0 && need <= Math.max(120, b.threshold * 0.12)),
      stageTip: b.stageTip || '',
      comeback: !!b.comebackActive,
      typeCount: b.typesPlayed instanceof Set ? b.typesPlayed.size : 0,
    };
  }

  useJiguan(jiguanUid, extra = {}) {
    const b = this.battle;
    if (b.status !== 'playing' || b.turn !== 'player') return { ok: false, reason: '不是你的回合' };
    const maxJ = b.extraJiguanTurn ? 2 : b.maxJiguanPerTurn;
    if (b.turnJiguanUsed >= maxJ) return { ok: false, reason: '本回合机关已用完' };

    const idx = b.jiguanHand.findIndex(j => j.uid === jiguanUid);
    if (idx < 0) return { ok: false, reason: '没有此机关' };
    const jg = b.jiguanHand[idx];
    let cost = jg.cost || 0;
    if (b.boss?.jiguanCost) cost = Math.max(0, cost + b.boss.jiguanCost);
    if (b.modifiers?.includes('jiguan_cost_up')) cost += 1;
    if (cost > b.jiguanTokens) return { ok: false, reason: '机关令不足' };

    const effect = jg.effect;
    let consumed = true;
    let effectMsg = jg.desc || '';
    let fxKind = 'default';
    let detail = '';

    switch (effect.type) {
      case 'skip_enemy':
        b.enemySkip = true;
        this.log('【封喉】');
        effectMsg = '守关者下一手无法主动出牌';
        detail = '封喉生效 · 敌方跳过';
        fxKind = 'seal';
        break;
      case 'switch_ai': {
        const before = b.enemyScore;
        b.enemyScore = Math.max(0, b.enemyScore - 40);
        const cut = before - b.enemyScore;
        this.log('【逆流】敌进度-40');
        effectMsg = `逆转气机，守关者进度 -${cut}`;
        detail = `敌方 ${before} → ${b.enemyScore}`;
        fxKind = 'strike';
        break;
      }
      case 'wild_rank': {
        if (!extra.cardId || !extra.rankId) return { ok: false, reason: '请选择牌与点数', needBaibian: true, jiguanUid };
        b.baibianActive = { cardId: extra.cardId, rankId: extra.rankId };
        const rk = RANKS.find(r => r.id === extra.rankId);
        this.log(`【百变】→${extra.rankId}`);
        effectMsg = `选定牌临时视为【${rk?.label || extra.rankId}】`;
        detail = '下一次出牌判定生效';
        fxKind = 'morph';
        break;
      }
      case 'freeze_enemy':
        if (b.enemyHand.length) {
          const top = sortCards(b.enemyHand).slice().reverse()[0];
          b.frozenEnemyIds.add(top.id);
          this.log(`【冻牌】${top.label}`);
          effectMsg = `冻结守关者最高牌【${top.label}】`;
          detail = '该牌本轮无法参与出牌';
          fxKind = 'ice';
        } else {
          effectMsg = '守关者无牌可冻';
          detail = '效果落空';
          fxKind = 'default';
        }
        break;
      case 'cancel_score': {
        const before = b.enemyScore;
        b.enemyScore = Math.max(0, b.enemyScore - 80);
        const cut = before - b.enemyScore;
        this.log('【急返】-80');
        effectMsg = `急返反噬，守关者进度 -${cut}`;
        detail = `敌方 ${before} → ${b.enemyScore}`;
        fxKind = 'strike';
        break;
      }
      case 'undo':
        b.selectedIds.clear();
        this.log('【三省】');
        effectMsg = '清空当前选牌，重新思量';
        detail = '选中状态已重置';
        fxKind = 'clear';
        break;
      case 'discard_draw': {
        if (!extra.cardId) return { ok: false, reason: '选择弃牌', needDiscard: true, jiguanUid };
        const ci = b.playerHand.findIndex(c => c.id === extra.cardId);
        if (ci >= 0) {
          const discarded = b.playerHand[ci];
          b.playerHand.splice(ci, 1);
          b.discardCount++;
          const drawn = drawCards(b.deck, 1);
          b.playerHand = sortCards([...b.playerHand, ...drawn]);
          this.log('【换骨】');
          this.applyDiscardBonus();
          effectMsg = `弃【${discarded.suitSymbol || ''}${discarded.label}】，摸入新牌`;
          detail = drawn.length ? `摸到 ${drawn.map(c => (c.suitSymbol || '') + c.label).join(' ')}` : '牌堆已空';
          fxKind = 'draw';
        }
        break;
      }
      case 'draw2_xinmo': {
        const drawn = drawCards(b.deck, 2);
        b.playerHand = sortCards([...b.playerHand, ...drawn]);
        b.xinmo++;
        this.log('【引蛇】摸2 心魔+1');
        effectMsg = `摸 2 张牌，心魔 +1（${b.xinmo}/${b.xinmoCap || 5}）`;
        detail = drawn.length ? drawn.map(c => (c.suitSymbol || '') + c.label).join(' ') : '牌堆不足';
        fxKind = 'draw';
        break;
      }
      case 'steal_card':
        if (b.enemyHand.length) {
          const i = Math.floor(Math.random() * b.enemyHand.length);
          const c = b.enemyHand.splice(i, 1)[0];
          b.playerHand = sortCards([...b.playerHand, c]);
          this.log(`【偷梁】获得 ${c.suitSymbol || ''}${c.label}`);
          effectMsg = `偷得守关者【${c.suitSymbol || ''}${c.label}】`;
          detail = `敌方剩余 ${b.enemyHand.length} 张`;
          fxKind = 'steal';
        } else {
          effectMsg = '守关者无牌可偷';
          detail = '效果落空';
          fxKind = 'default';
        }
        break;
      case 'next_qi': {
        const amt = effect.amount || 1.2;
        b.nextPlayQi += amt;
        this.log('【借火】下次气+');
        effectMsg = `下次出牌气 +${amt}`;
        detail = '气脉已蓄于下一手';
        fxKind = 'buff';
        break;
      }
      case 'clear_xinmo': {
        const amt = effect.amount || 2;
        const before = b.xinmo;
        b.xinmo = Math.max(0, b.xinmo - amt);
        this.log('【清心】');
        effectMsg = `心魔 ${before} → ${b.xinmo}`;
        detail = '心神稍定';
        fxKind = 'heal';
        break;
      }
      case 'shield_xinmo':
        b.shield++;
        b.xinmo++;
        this.log('【爆气】护体+1 心魔+1');
        effectMsg = `护体 +1，心魔 +1（${b.xinmo}/${b.xinmoCap || 5}）`;
        detail = `当前护体 ×${b.shield}`;
        fxKind = 'shield';
        break;
      default:
        effectMsg = jg.desc || '机关发动';
        fxKind = 'default';
        break;
    }

    b.jiguanTokens -= cost;
    b.turnJiguanUsed++;
    b.jiguanUsedCount++;
    b.jiguanUsedTotal++;
    b.extraJiguanTurn = false;

    let passiveNote = '';
    if (this.run.character.passive?.type === 'jiguan_save' && Math.random() < this.run.character.passive.chance) {
      consumed = false;
      b.nextPlayQi += 0.3;
      this.log('【百宝囊】未消耗');
      passiveNote = '百宝囊：机关未消耗，气+0.3';
    }
    if (consumed) {
      b.jiguanHand.splice(idx, 1);
      b.discardedJiguan.push(jg);
    }

    let masterNote = '';
    if (this.run.character.passive?.type === 'jiguan_master') {
      const every = this.run.character.passive.every || 3;
      if (b.jiguanUsedTotal % every === 0) {
        const j = JIGUAN_POOL[Math.floor(Math.random() * JIGUAN_POOL.length)];
        b.jiguanHand.push({ ...j, uid: uid() });
        this.log('【七窍】获得机关 ' + j.name);
        masterNote = `七窍：获得【${j.name}】`;
      }
    }

    if (b.boss?.jiguanXinmo && b.jiguanUsedTotal % b.boss.jiguanXinmo === 0) {
      b.xinmo++;
      this.log('宗主：机关心魔+1');
      if (detail) detail += ' · ';
      detail += '宗主压迫：心魔+1';
    }
    this.checkXinmo();
    return {
      ok: true,
      jiguan: jg,
      effectMsg,
      detail,
      fxKind,
      cost,
      consumed,
      passiveNote,
      masterNote,
      tokensLeft: b.jiguanTokens,
    };
  }

  applyDiscardBonus() {
    const b = this.battle;
    for (const qp of this.run.qipai) {
      if (qp.effect.type === 'discard_li') {
        if (b.discardCount % qp.effect.per === 0) {
          b.discardLiBonus = (b.discardLiBonus || 0) + qp.effect.amount;
          this.log(`【${qp.name}】下次牌理+${qp.effect.amount}`);
        }
      }
    }
  }

  useJinnang(uid, extra = {}) {
    const b = this.battle;
    const idx = this.run.jinnang.findIndex(j => j.uid === uid);
    if (idx < 0) return { ok: false };
    const jn = this.run.jinnang[idx];
    let effectMsg = jn.desc || '';
    let detail = '';
    let fxKind = 'buff';

    switch (jn.id) {
      case 'juqi':
        b.juqiBonus = 2.5;
        this.log('【聚气丹】');
        effectMsg = '下次出牌气 +2.5';
        detail = '聚气已成，蓄于下一手';
        fxKind = 'buff';
        break;
      case 'qingxin': {
        const before = b.xinmo;
        b.xinmo = Math.max(0, b.xinmo - 2);
        this.log('【清心散】');
        effectMsg = `心魔 ${before} → ${b.xinmo}`;
        detail = '清心散生效';
        fxKind = 'heal';
        break;
      }
      case 'jiehuo':
        b.extraJiguanTurn = true;
        this.log('【借火令】');
        effectMsg = '本回合可额外使用 1 次机关';
        detail = '机关额度 +1';
        fxKind = 'buff';
        break;
      case 'kuitian':
        if (b.enemyHand.length) {
          const c = b.enemyHand[Math.floor(Math.random() * b.enemyHand.length)];
          this.log(`【窥天镜】${c.suitSymbol}${c.label}`);
          effectMsg = `窥见守关者【${c.suitSymbol}${c.label}】`;
          detail = '仅知其一，不知其余';
          fxKind = 'steal';
        } else {
          effectMsg = '守关者无牌可窥';
          fxKind = 'default';
        }
        break;
      case 'huichun':
        if (b.discardedJiguan.length) {
          const j = b.discardedJiguan.pop();
          b.jiguanHand.push({ ...j, uid: uid() });
          this.log(`【回春丹】${j.name}`);
          effectMsg = `取回机关【${j.name}】`;
          detail = '弃置的机关重回手中';
          fxKind = 'heal';
        } else {
          effectMsg = '没有可取回的机关';
          detail = '效果落空';
          fxKind = 'default';
        }
        break;
      case 'yirong': {
        if (!extra.cardId || !extra.rankId) return { ok: false, reason: '选择牌与点数', needYirong: true, uid };
        b.yirongActive = { cardId: extra.cardId, rankId: extra.rankId };
        const rk = RANKS.find(r => r.id === extra.rankId);
        this.log(`【易容符】→${extra.rankId}`);
        effectMsg = `选定牌改为【${rk?.label || extra.rankId}】`;
        detail = '下一次出牌判定生效';
        fxKind = 'morph';
        break;
      }
      case 'liepai': {
        const g = groupByRank(b.playerHand);
        const pr = Object.keys(g).find(r => g[r].length >= 2 && !g[r][0].joker);
        if (pr) {
          g[pr][0].li *= 2;
          this.log('【裂牌咒】');
          effectMsg = `一对中的一张牌理翻倍（${pr}）`;
          detail = '裂牌已成';
          fxKind = 'strike';
        } else {
          effectMsg = '手中没有对子可裂';
          detail = '效果落空';
          fxKind = 'default';
        }
        break;
      }
      case 'dunjia': {
        const drawn = drawCards(b.deck, 2);
        b.playerHand = sortCards([...b.playerHand, ...drawn]);
        this.log('【遁甲符】摸2');
        effectMsg = '遁甲成行，摸 2 张牌';
        detail = drawn.length ? drawn.map(c => (c.suitSymbol || '') + c.label).join(' ') : '牌堆不足';
        fxKind = 'draw';
        break;
      }
      case 'pojun': {
        const before = b.enemyScore;
        b.enemyScore = Math.max(0, b.enemyScore - 100);
        this.log('【破军符】-100');
        effectMsg = `破军一击，敌进度 -${before - b.enemyScore}`;
        detail = `敌方 ${before} → ${b.enemyScore}`;
        fxKind = 'strike';
        break;
      }
      case 'zongshi_dan':
        this.run.zongshiTokens++;
        this.log('【宗势丹】+1令');
        effectMsg = '获得 1 枚宗势令';
        detail = `当前宗势令 ×${this.run.zongshiTokens}`;
        fxKind = 'buff';
        break;
      default:
        effectMsg = jn.desc || '锦囊发动';
        fxKind = 'buff';
        break;
    }
    this.run.jinnang.splice(idx, 1);
    return {
      ok: true,
      jinnang: jn,
      effectMsg,
      detail,
      fxKind,
      kind: 'jinnang',
    };
  }

  peekTopSuits() {
    if (this.run.character.passive?.type !== 'peek_suits') return null;
    const top = this.battle.deck.slice(-3);
    const suits = top.map(c => c.suitSymbol || '?');
    this.log(`【天机测】${suits.join(' ')}`);
    return suits;
  }

  onWin() {
    const b = this.battle;
    if (!b || !this.run) return { ok: false };
    // 防止重复结算
    if (b.status === 'won' && b._settledWin) {
      return { ok: true, won: true, reward: b._winReward || 0, yueliGain: b._winYueli || 0 };
    }
    b.status = 'won';
    b._settledWin = true;
    const diff = this.run.difficulty;
    let reward = 30 + (this.run.realmIndex || 0) * 18 + (this.run.stageIndex || 0) * 10;
    if (b.endlessFloor) reward = 40 + b.endlessFloor * 8;
    if (this.hasQipai('duo_chou')) reward += 15;
    if (b.boss?.clearBonus) reward += b.boss.clearBonus;
    if (b.scoreTax === 0.9) reward = Math.floor(reward * 1.5);
    const mb = this.getMetaBonuses();
    // 干净破境：溢出不多 + 回合未超时
    let cleanBonus = 0;
    const over = b.lastOverkill || 0;
    if (over >= 0 && over <= Math.max(40, b.threshold * 0.08) && b.round <= (b.maxSoftRound || 24)) {
      cleanBonus = 8 + Math.min(12, Math.floor((b.successfulBeats || 0) / 2)) + (mb.cleanBonus || 0);
      reward += cleanBonus;
      this.log(`干净破境！顿悟+${cleanBonus}`);
    }
    // 牌型多样：用过 ≥4 种基础型
    const typeN = b.typesPlayed instanceof Set ? b.typesPlayed.size : 0;
    if (typeN >= 4) {
      const divBonus = 4 + (typeN - 4) * 2 + (mb.diverseBonus || 0);
      reward += divBonus;
      this.log(`牌路周全（${typeN}型）顿悟+${divBonus}`);
    }
    // 速破：回合越少奖励越高（有上限）
    if (b.round > 0 && b.round <= 12) {
      const speed = Math.min(15, (13 - b.round) * 2) + (mb.speedBonus || 0);
      reward += speed;
      this.log(`速破论道 顿悟+${speed}`);
    }
    reward = Math.floor(reward * diff.reward);
    if (this.run.weekly?.challenge?.rewardMul) reward = Math.floor(reward * this.run.weekly.challenge.rewardMul);
    const interest = 1 + (mb.interest || 0);
    reward = Math.floor(reward * interest);

    this.run.dunwu += reward;
    let yueliGain = Math.floor(reward * 0.45 * diff.reward);
    if (mb.yueliPct) yueliGain = Math.floor(yueliGain * (1 + mb.yueliPct));
    yueliGain += mb.yueliFlat || 0;
    if (this.run.isDaily && mb.dailyYueli) yueliGain = Math.floor(yueliGain * (1 + mb.dailyYueli));
    if (this.run.isWeekly && mb.weeklyYueli) yueliGain = Math.floor(yueliGain * (1 + mb.weeklyYueli));
    this.run.yueli += yueliGain;
    this.meta.totalYueli += yueliGain;
    // 无尽里程碑
    if (this.run.isEndless || b.endlessFloor) {
      this.claimEndlessMilestones();
    }
    this.run.stagesCleared++;
    this.meta.stats.totalStages = (this.meta.stats.totalStages || 0) + 1;
    this.meta.stats.totalScore = (this.meta.stats.totalScore || 0) + b.playerScore;
    if (b.playerScore > this.meta.bestScore) this.meta.bestScore = b.playerScore;

    const cid = this.run.character.id;
    this.meta.charMastery[cid] = (this.meta.charMastery[cid] || 0) + 1;
    this.meta.charWins[cid] = (this.meta.charWins[cid] || 0) + 1;

    this.markSeenQipai(this.run.qipai);
    this.grantAchievement('first_win');
    if (!b.passedThisBattle) this.grantAchievement('no_pass');
    if ((b.playerHand || []).length >= 8) this.grantAchievement('perfect_clear');
    if (this.run.qipai.length >= 3) this.grantAchievement('qipai3');
    if (this.run.qipai.length >= 5) this.grantAchievement('qipai5');
    if (this.run.qipai.length >= 8) this.grantAchievement('qipai8');
    if (this.run.qipai.length >= 12) this.grantAchievement('qipai12');
    Object.values(this.run.xinfa).forEach(lv => { if (lv >= 5) this.grantAchievement('xinfa_max'); });
    {
      const highXinfa = Object.values(this.run.xinfa).filter(lv => lv >= 3).length;
      if (highXinfa >= 2) this.grantAchievement('xinfa_dual');
    }
    if (this.run.qipai.some(q => q.rarity === 'cursed')) this.grantAchievement('cursed_win');

    if (b.endlessFloor) {
      this.meta.bestEndless = Math.max(this.meta.bestEndless || 0, b.endlessFloor);
    }

    // 周常进度
    if (this.run.isWeekly) {
      const w = this.meta.weekly || {};
      w.bestStages = Math.max(w.bestStages || 0, this.run.stagesCleared);
      this.meta.weekly = w;
      if (this.run.stagesCleared >= 6 && !w.completed) {
        w.completed = true;
        this.meta.weeklyDoneCount = (this.meta.weeklyDoneCount || 0) + 1;
        let bonus = this.run.weekly.challenge.rewardYueli || 40;
        // 周常种：额外阅历%
        if (mb.weeklyYueli) bonus = Math.floor(bonus * (1 + mb.weeklyYueli));
        this.meta.totalYueli += bonus;
        this.run.yueli += bonus;
        yueliGain += bonus;
        this.log(`周常达成！额外阅历+${bonus}`);
        this.grantAchievement('weekly1');
      }
    }

    this.updateLeaderboard(true);
    this.save();
    this.checkMetaAchievements();
    this.log(`破境！顿悟+${reward}`);
    b._winReward = reward;
    b._winYueli = yueliGain;
    return { ok: true, won: true, reward, yueliGain };
  }

  onLose(reason) {
    const b = this.battle;
    if (!b || !this.run) return { ok: false, lost: true, reason };
    if (b.stageType === 'zong' && this.hasQipai('zongzhu_sheling') && !b.reviveUsed) {
      b.reviveUsed = true;
      b.threshold = Math.floor(b.threshold * 1.2);
      b.playerScore = Math.floor(b.threshold * 0.5);
      b.enemyScore = Math.floor(b.enemyScore * 0.5);
      this.log('【宗主赦令】续命！');
      b.status = 'playing';
      b.turn = 'player';
      b.freePlay = true;
      b.lastHand = null;
      b.lastPlayer = null;
      return { ok: true, revived: true };
    }

    if (b.status === 'lost' && b._settledLose) {
      return { ok: true, lost: true, reason: b._loseReason || reason, yueli: b._loseYueli || 0 };
    }
    b.status = 'lost';
    b._settledLose = true;
    b._loseReason = reason;
    const yueli = Math.floor((12 + this.run.stagesCleared * 6) * this.run.difficulty.reward);
    this.run.yueli += yueli;
    this.meta.totalYueli += yueli;
    b._loseYueli = yueli;
    this.markSeenQipai(this.run.qipai);
    this.pushRunHistory(false);
    this.save();
    this.log(`失败：${reason} 阅历+${yueli}`);
    return { ok: true, lost: true, reason, yueli };
  }

  pushRunHistory(won) {
    const h = {
      t: Date.now(),
      char: this.run.character.name,
      charId: this.run.character.id,
      diff: this.run.difficulty.name,
      diffId: this.run.difficulty.id,
      mode: this.run.mode,
      stages: this.run.stagesCleared,
      score: this.run.totalScore,
      endless: this.run.endlessFloor || 0,
      maxHand: this.run.stats.maxHand || 0,
      won,
      qipai: this.run.qipai.map(q => q.name),
      share: typeof BuildShare !== 'undefined' ? BuildShare.encode(this.run) : '',
    };
    this.meta.runHistory = [h, ...(this.meta.runHistory || [])].slice(0, 40);
    this.updateLeaderboard(won);
  }

  updateLeaderboard(won) {
    if (!this.run) return;
    const lb = this.meta.leaderboard || {};
    const snap = {
      t: Date.now(),
      char: this.run.character.name,
      diff: this.run.difficulty.name,
      mode: this.run.mode,
      stages: this.run.stagesCleared,
      score: this.run.totalScore,
      endless: this.run.endlessFloor || 0,
      maxHand: this.run.stats.maxHand || 0,
      qipai: this.run.qipai.map(q => q.name).slice(0, 8),
      share: typeof BuildShare !== 'undefined' ? BuildShare.encode(this.run) : '',
    };
    if (!lb.bestStageRun || snap.stages > lb.bestStageRun.stages ||
      (snap.stages === lb.bestStageRun.stages && snap.score > lb.bestStageRun.score)) {
      lb.bestStageRun = snap;
    }
    if (snap.endless && (!lb.bestEndless || snap.endless > lb.bestEndless.endless)) {
      lb.bestEndless = snap;
    }
    if (snap.maxHand && (!lb.bestHand || snap.maxHand > lb.bestHand.maxHand)) {
      lb.bestHand = snap;
    }
    if (this.run.isWeekly) {
      if (!lb.weeklyBest || lb.weeklyBest.key !== this.run.weekly.key ||
        snap.stages > (lb.weeklyBest.stages || 0)) {
        lb.weeklyBest = { ...snap, key: this.run.weekly.key, name: this.run.weekly.challenge.name };
      }
    }
    this.meta.leaderboard = lb;
  }

  exportShareCode() {
    if (typeof BuildShare === 'undefined' || !this.run) return '';
    return BuildShare.encode(this.run);
  }

  pickQipaiForRun(count, preferCursed = false) {
    const owned = this.run.qipai.map(q => q.id);
    const ban = this.getWeeklyBanSet();
    const max = this.getUnlockedPoolMax();
    let pool = QIPAI_POOL.filter(q => (q.unlock || 0) <= max && !ban.has(q.id));
    if (pool.length < count) pool = QIPAI_POOL.filter(q => !ban.has(q.id));
    return pickQipaiChoicesFromPool(pool.length ? pool : QIPAI_POOL, owned, count, preferCursed);
  }

  advanceAfterWin() {
    // 成就：境
    const ri = this.run.realmIndex;
    if (!this.run.isEndless) {
      if (this.run.stageIndex === 2) {
        // 刚打完宗主局
        this.run.realmsCleared = ri + 1;
        if (ri >= 0) this.grantAchievement('realm1');
        if (ri >= 2) this.grantAchievement('realm3');
        if (ri >= 4) this.grantAchievement('realm5');
        if (ri >= 7) this.grantAchievement('realm8');

        const diff = this.run.difficulty.id;
        const best = this.meta.realmBest[diff] || 0;
        this.meta.realmBest[diff] = Math.max(best, ri + 1);
        if (diff === 'hard' && ri >= 0) this.grantAchievement('hard_realm1');
        if (diff === 'hard' && ri >= 2) this.grantAchievement('hard_clear');
        if (diff === 'master' && ri >= 4) this.grantAchievement('master_clear');
        if (diff === 'legend' && ri >= 7) this.grantAchievement('legend_clear');
      }

      this.run.stageIndex++;
      const realm = REALM_THRESHOLDS[this.run.realmIndex];
      if (this.run.stageIndex >= realm.stages.length) {
        this.run.stageIndex = 0;
        this.run.realmIndex++;
      }

      if (this.run.realmIndex >= REALM_THRESHOLDS.length) {
        // 进入无尽
        this.run.isEndless = true;
        this.run.endlessFloor = 1;
        this.pushRunHistory(true);
        this.save();
        return { completed: false, enterEndless: true, next: this.getCurrentStage() };
      }
      this.save();
      return { completed: false, next: this.getCurrentStage() };
    }

    // 无尽下一层
    this.run.endlessFloor = (this.run.endlessFloor || 1) + 1;
    this.meta.bestEndless = Math.max(this.meta.bestEndless || 0, this.run.endlessFloor);
    const miles = this.claimEndlessMilestones();
    this.save();
    this.checkMetaAchievements();
    return { completed: false, endless: true, next: this.getCurrentStage(), milestones: miles };
  }

  shopBuyQipai(qipaiId) {
    let cost = this.metaShopCost(25);
    if (this.run.dunwu < cost) return { ok: false, reason: '顿悟不足' };
    if (this.run.qipai.some(q => q.id === qipaiId)) return { ok: false, reason: '已拥有' };
    const qp = QIPAI_POOL.find(q => q.id === qipaiId);
    if (!qp) return { ok: false };
    if (!this.isQipaiAllowed(qp)) return { ok: false, reason: '本周禁宗禁用' };
    this.run.dunwu -= cost;
    this.run.qipai.push(qp);
    if (qp.id === 'duanwei') this.run.duanweiLi = 12;
    this.markSeenQipai([qp]);
    this.save();
    return { ok: true, cost };
  }

  shopUpgradeXinfa(type) {
    let cost = 15 + (this.run.xinfa[type] || 0) * 10;
    if (this.hasQipai('jing_yan')) cost = Math.max(5, cost - 5);
    cost = this.metaShopCost(cost);
    if (this.run.dunwu < cost) return { ok: false, reason: '顿悟不足' };
    const def = XINFA[type];
    if (!def || (this.run.xinfa[type] || 0) >= def.max) return { ok: false, reason: '已满级' };
    this.run.dunwu -= cost;
    this.run.xinfa[type] = (this.run.xinfa[type] || 0) + 1;
    return { ok: true, level: this.run.xinfa[type], cost };
  }

  shopBuyJinnang() {
    const cost = this.metaShopCost(20);
    if (this.run.dunwu < cost) return { ok: false, reason: '顿悟不足' };
    this.run.dunwu -= cost;
    const jn = JINNANG_POOL[Math.floor(Math.random() * JINNANG_POOL.length)];
    this.run.jinnang.push({ ...jn, uid: uid() });
    return { ok: true, jinnang: jn, cost };
  }

  shopDeleteQipai(qipaiId) {
    const cost = this.metaShopCost(10);
    if (this.run.dunwu < cost) return { ok: false, reason: '顿悟不足' };
    const i = this.run.qipai.findIndex(q => q.id === qipaiId);
    if (i < 0) return { ok: false };
    this.run.dunwu -= cost;
    this.run.qipai.splice(i, 1);
    return { ok: true, cost };
  }

  sacrificeQipai(qipaiId) {
    if (this.run.character.id !== 'liu') return { ok: false };
    const i = this.run.qipai.findIndex(q => q.id === qipaiId);
    if (i < 0) return { ok: false };
    this.run.qipai.splice(i, 1);
    this.run.zongshiTokens++;
    return { ok: true };
  }

  getQipaiChoiceCount() {
    let n = 3;
    if (this.run?.character?.passive?.type === 'extra_qipai_choice') {
      n = this.run.character.passive.choices;
    }
    n += this.getMetaBonuses().shopChoice || 0;
    return Math.min(6, n);
  }

  /** 藏经阁价格减免后实付 */
  metaShopCost(base) {
    const d = this.getMetaBonuses().shopDiscount || 0;
    if (!d) return base;
    return Math.max(1, Math.ceil(base * (1 - d)));
  }

  completeDaily() {
    const key = this.todayKey();
    if (this.meta.daily.date === key && this.meta.daily.completed) return;
    if (this.meta.daily.date !== key) {
      // 断签
      if (this.meta.daily.date) {
        const prev = new Date(this.meta.daily.date);
        const cur = new Date(key);
        const gap = (cur - prev) / 86400000;
        this.meta.daily.streak = gap <= 1.5 ? (this.meta.daily.streak || 0) + 1 : 1;
      } else this.meta.daily.streak = 1;
    } else {
      this.meta.daily.streak = (this.meta.daily.streak || 0) + 1;
    }
    this.meta.daily.date = key;
    this.meta.daily.completed = true;
    this.meta.daily.total = (this.meta.daily.total || 0) + 1;
    let bonus = 25 + Math.min(20, (this.meta.daily.streak || 0) * 2);
    // 日课种：完成日额外阅历%
    const dailyPct = this.getMetaBonuses('daily').dailyYueli || 0;
    if (dailyPct) bonus = Math.floor(bonus * (1 + dailyPct));
    this.meta.totalYueli += bonus;
    this.save();
    this.checkMetaAchievements();
    return { ok: true, yueli: bonus };
  }
}

const game = new PaiZongGame();
// 载入后按既有进度补发成就（静默，不弹层）
try {
  game._deferAchieveUi = true;
  game.checkMetaAchievements();
  game.drainAchieveQueue();
  game._deferAchieveUi = false;
} catch (_) {
  game._deferAchieveUi = false;
}
