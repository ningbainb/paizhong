/**
 * 《牌宗》核心引擎：发牌、牌型判定、压牌比较、计分
 */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (rank.joker) continue;
      deck.push({
        id: uid(),
        rank: rank.id,
        label: rank.label,
        order: rank.order,
        li: rank.li,
        suit: suit.id,
        suitSymbol: suit.symbol,
        color: suit.color,
        joker: false,
      });
    }
  }
  deck.push({
    id: uid(), rank: 'BJ', label: '小王', order: 16, li: 25,
    suit: 'joker', suitSymbol: '🃏', color: 'black', joker: true, jokerType: 'black',
  });
  deck.push({
    id: uid(), rank: 'RJ', label: '大王', order: 17, li: 30,
    suit: 'joker', suitSymbol: '🃏', color: 'red', joker: true, jokerType: 'red',
  });
  return shuffle(deck);
}

function sortCards(cards) {
  return cards.slice().sort((a, b) => a.order - b.order || a.suit.localeCompare(b.suit));
}

function groupByRank(cards) {
  const map = {};
  for (const c of cards) {
    if (!map[c.rank]) map[c.rank] = [];
    map[c.rank].push(c);
  }
  return map;
}

/**
 * 分析选中的牌，返回合法牌型列表（一张出牌可能只有一种，炸弹/顺子等）
 */
function analyzeHand(cards, options = {}) {
  if (!cards || cards.length === 0) return null;
  const sorted = sortCards(cards);
  const n = sorted.length;
  const wildRank = options.wildRank; // 百变：某张牌视为某点数 { cardId, rankId }

  // 应用百变
  let effective = sorted.map(c => {
    if (wildRank && c.id === wildRank.cardId) {
      const r = RANKS.find(x => x.id === wildRank.rankId);
      return { ...c, rank: r.id, label: r.label, order: r.order, li: r.li, _wild: true };
    }
    return { ...c };
  });
  effective = sortCards(effective);

  // 火箭
  if (n === 2 && effective.every(c => c.joker)) {
    return {
      type: 'rocket',
      name: HAND_TYPES.rocket.name,
      cards: sorted,
      maxOrder: 17,
      length: 2,
      baseQi: HAND_TYPES.rocket.qi,
      liSum: effective.reduce((s, c) => s + c.li, 0) + 20, // 火箭额外+20
    };
  }

  // 炸弹
  if (n === 4) {
    const ranks = effective.map(c => c.rank);
    if (ranks.every(r => r === ranks[0]) && !effective[0].joker) {
      return {
        type: 'bomb',
        name: HAND_TYPES.bomb.name,
        cards: sorted,
        maxOrder: effective[0].order,
        length: 4,
        baseQi: HAND_TYPES.bomb.qi,
        liSum: effective.reduce((s, c) => s + c.li, 0),
      };
    }
  }

  // 单张
  if (n === 1) {
    return {
      type: 'single',
      name: HAND_TYPES.single.name,
      cards: sorted,
      maxOrder: effective[0].order,
      length: 1,
      baseQi: HAND_TYPES.single.qi,
      liSum: effective[0].li,
    };
  }

  // 对子
  if (n === 2 && !effective[0].joker && effective[0].rank === effective[1].rank) {
    return {
      type: 'pair',
      name: HAND_TYPES.pair.name,
      cards: sorted,
      maxOrder: effective[0].order,
      length: 2,
      baseQi: HAND_TYPES.pair.qi,
      liSum: effective.reduce((s, c) => s + c.li, 0),
    };
  }

  // 三张
  if (n === 3 && !effective[0].joker && effective.every(c => c.rank === effective[0].rank)) {
    return {
      type: 'triple',
      name: HAND_TYPES.triple.name,
      cards: sorted,
      maxOrder: effective[0].order,
      length: 3,
      baseQi: HAND_TYPES.triple.qi,
      liSum: effective.reduce((s, c) => s + c.li, 0),
    };
  }

  // 三带一：三张 + 任意单张（不能与三张同点，王可带）
  if (n === 4) {
    const g = groupByRank(effective);
    const ranks = Object.keys(g);
    const tripleRank = ranks.find(r => g[r].length === 3 && !g[r][0].joker);
    const singleRank = ranks.find(r => g[r].length === 1);
    if (tripleRank && singleRank && ranks.length === 2) {
      return {
        type: 'triple_one',
        name: HAND_TYPES.triple_one.name,
        cards: sorted,
        maxOrder: g[tripleRank][0].order,
        length: 4,
        baseQi: HAND_TYPES.triple_one.qi,
        liSum: effective.reduce((s, c) => s + c.li, 0),
        coreRank: tripleRank,
      };
    }
  }

  // 三带二：三张 + 一对（对子不能与三张同点，不能是王炸）
  if (n === 5) {
    const g = groupByRank(effective);
    const ranks = Object.keys(g);
    const tripleRank = ranks.find(r => g[r].length === 3 && !g[r][0].joker);
    const pairRank = ranks.find(r => g[r].length === 2 && !g[r][0].joker);
    if (tripleRank && pairRank && ranks.length === 2) {
      return {
        type: 'triple_two',
        name: HAND_TYPES.triple_two.name,
        cards: sorted,
        maxOrder: g[tripleRank][0].order,
        length: 5,
        baseQi: HAND_TYPES.triple_two.qi,
        liSum: effective.reduce((s, c) => s + c.li, 0),
        coreRank: tripleRank,
      };
    }
  }

  // 顺子：5+ 连续，不含2和王，A可作为14
  if (n >= 5) {
    const orders = effective.map(c => c.order);
    if (effective.every(c => !c.joker && c.rank !== '2') && isConsecutive(orders)) {
      return {
        type: 'straight',
        name: HAND_TYPES.straight.name,
        cards: sorted,
        maxOrder: Math.max(...orders),
        length: n,
        baseQi: HAND_TYPES.straight.qi,
        liSum: effective.reduce((s, c) => s + c.li, 0),
      };
    }
  }

  // 连对：至少3对连续
  if (n >= 6 && n % 2 === 0) {
    const g = groupByRank(effective);
    const ranks = Object.keys(g);
    if (ranks.every(r => g[r].length === 2 && !g[r][0].joker && r !== '2')) {
      const orders = ranks.map(r => g[r][0].order).sort((a, b) => a - b);
      if (orders.length >= 3 && isConsecutive(orders)) {
        return {
          type: 'consecutive_pairs',
          name: HAND_TYPES.consecutive_pairs.name,
          cards: sorted,
          maxOrder: Math.max(...orders),
          length: n,
          baseQi: HAND_TYPES.consecutive_pairs.qi,
          liSum: effective.reduce((s, c) => s + c.li, 0),
        };
      }
    }
  }

  // 飞机：至少2个连续三张
  if (n >= 6 && n % 3 === 0) {
    const g = groupByRank(effective);
    const ranks = Object.keys(g);
    if (ranks.every(r => g[r].length === 3 && !g[r][0].joker && r !== '2')) {
      const orders = ranks.map(r => g[r][0].order).sort((a, b) => a - b);
      if (orders.length >= 2 && isConsecutive(orders)) {
        return {
          type: 'airplane',
          name: HAND_TYPES.airplane.name,
          cards: sorted,
          maxOrder: Math.max(...orders),
          length: n,
          baseQi: HAND_TYPES.airplane.qi,
          liSum: effective.reduce((s, c) => s + c.li, 0),
        };
      }
    }
  }

  return null;
}

function isConsecutive(orders) {
  const s = orders.slice().sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1] + 1) return false;
  }
  return true;
}

/**
 * 判断 hand 能否压过 lastHand
 * 规则：同型比最大牌；炸弹可压非火箭；火箭最大
 */
function canBeat(hand, lastHand) {
  if (!hand) return false;
  if (!lastHand) return true; // 自由出牌

  if (hand.type === 'rocket') return true;
  if (lastHand.type === 'rocket') return false;

  if (hand.type === 'bomb') {
    if (lastHand.type !== 'bomb') return true;
    return hand.maxOrder > lastHand.maxOrder;
  }
  if (lastHand.type === 'bomb') return false;

  if (hand.type !== lastHand.type) return false;
  if (hand.length !== lastHand.length) return false;
  return hand.maxOrder > lastHand.maxOrder;
}

/**
 * 枚举手牌中所有可出牌型（用于提示与 AI）
 */
function enumeratePlays(handCards, lastHand, options = {}) {
  const plays = [];
  const cards = sortCards(handCards);
  const n = cards.length;
  if (n === 0) return plays;

  // 单张
  for (const c of cards) {
    const h = analyzeHand([c], options);
    if (h && canBeat(h, lastHand)) plays.push(h);
  }

  // 对子
  const byRank = groupByRank(cards);
  for (const rank of Object.keys(byRank)) {
    if (byRank[rank].length >= 2 && !byRank[rank][0].joker) {
      const h = analyzeHand(byRank[rank].slice(0, 2), options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
    if (byRank[rank].length >= 3 && !byRank[rank][0].joker) {
      const h = analyzeHand(byRank[rank].slice(0, 3), options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
    if (byRank[rank].length >= 4 && !byRank[rank][0].joker) {
      const h = analyzeHand(byRank[rank].slice(0, 4), options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
  }

  // 三带一 / 三带二
  const tripleKeys = Object.keys(byRank).filter(r => byRank[r].length >= 3 && !byRank[r][0].joker);
  for (const tr of tripleKeys) {
    const body = byRank[tr].slice(0, 3);
    // 带单（任意非本体张，含王）
    for (const c of cards) {
      if (c.rank === tr) continue;
      const h = analyzeHand([...body, c], options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
    // 带对
    for (const pr of Object.keys(byRank)) {
      if (pr === tr) continue;
      if (byRank[pr].length < 2 || byRank[pr][0].joker) continue;
      const h = analyzeHand([...body, ...byRank[pr].slice(0, 2)], options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
  }

  // 火箭
  const jokers = cards.filter(c => c.joker);
  if (jokers.length === 2) {
    const h = analyzeHand(jokers, options);
    if (h && canBeat(h, lastHand)) plays.push(h);
  }

  // 顺子
  const nonSpecial = cards.filter(c => !c.joker && c.rank !== '2');
  const uniqueOrders = {};
  for (const c of nonSpecial) {
    if (!uniqueOrders[c.order]) uniqueOrders[c.order] = c;
  }
  const orderList = Object.keys(uniqueOrders).map(Number).sort((a, b) => a - b);
  for (let len = 5; len <= orderList.length; len++) {
    for (let i = 0; i <= orderList.length - len; i++) {
      const slice = orderList.slice(i, i + len);
      if (!isConsecutive(slice)) continue;
      const handCardsSel = slice.map(o => uniqueOrders[o]);
      const h = analyzeHand(handCardsSel, options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
  }

  // 连对
  const pairRanks = Object.keys(byRank)
    .filter(r => byRank[r].length >= 2 && !byRank[r][0].joker && r !== '2')
    .map(r => byRank[r][0].order)
    .sort((a, b) => a - b);
  for (let len = 3; len <= pairRanks.length; len++) {
    for (let i = 0; i <= pairRanks.length - len; i++) {
      const slice = pairRanks.slice(i, i + len);
      if (!isConsecutive(slice)) continue;
      const sel = [];
      for (const o of slice) {
        const rank = Object.keys(byRank).find(r => byRank[r][0].order === o);
        sel.push(...byRank[rank].slice(0, 2));
      }
      const h = analyzeHand(sel, options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
  }

  // 飞机
  const tripleRanks = Object.keys(byRank)
    .filter(r => byRank[r].length >= 3 && !byRank[r][0].joker && r !== '2')
    .map(r => byRank[r][0].order)
    .sort((a, b) => a - b);
  for (let len = 2; len <= tripleRanks.length; len++) {
    for (let i = 0; i <= tripleRanks.length - len; i++) {
      const slice = tripleRanks.slice(i, i + len);
      if (!isConsecutive(slice)) continue;
      const sel = [];
      for (const o of slice) {
        const rank = Object.keys(byRank).find(r => byRank[r][0].order === o);
        sel.push(...byRank[rank].slice(0, 3));
      }
      const h = analyzeHand(sel, options);
      if (h && canBeat(h, lastHand)) plays.push(h);
    }
  }

  // 去重（按牌 id 组合）
  const seen = new Set();
  return plays.filter(p => {
    const key = p.cards.map(c => c.id).sort().join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 是否同花
 */
function isFlush(cards) {
  if (!cards.length || cards.some(c => c.joker)) return false;
  const s = cards[0].suit;
  return cards.every(c => c.suit === s);
}

/**
 * 计算本次出牌得分（完整奇牌/角色/词条）
 */
function calculateScore(hand, ctx) {
  let li = hand.liSum;
  let qi = hand.baseQi;
  let zongshi = 1.0;
  let scoreMult = 1.0;
  const breakdown = [];
  const cursedMul = ctx.cursedBoost || 1;

  breakdown.push({ label: `基础牌理`, value: `+${hand.liSum}` });
  const handName = hand.name || hand.type || '牌型';
  breakdown.push({ label: `${handName}基础气`, value: `×${Number(hand.baseQi || 1).toFixed(1)}` });

  const xf = ctx.xinfa || {};
  // 三带一/二 享受三才诀
  // 注意：陆归一等「心法+1」已在 startRun 写入 xinfa，此处勿再叠一层
  const xfKey = (hand.type === 'triple_one' || hand.type === 'triple_two') ? 'triple' : hand.type;
  let xfLevel = xf[xfKey] || 0;
  if (ctx.allXinfaBonus) xfLevel += ctx.allXinfaBonus;
  if (ctx.firstHandType && ctx.firstHandBoost && hand.type === ctx.firstHandType) xfLevel += 2;

  const xfDef = XINFA[xfKey];
  if (xfDef && xfLevel > 0) {
    const lv = Math.min(xfLevel, xfDef.max);
    if (xfDef.perLevel.li) {
      const add = xfDef.perLevel.li * lv;
      li += add;
      breakdown.push({ label: `${xfDef.name}×${lv}`, value: `牌理+${add}` });
    }
    if (xfDef.perLevel.qi) {
      const add = xfDef.perLevel.qi * lv;
      qi += add;
      breakdown.push({ label: `${xfDef.name}气`, value: `+${add.toFixed(2)}` });
    }
    if (xfDef.perLevel.flushQi && isFlush(hand.cards)) {
      const add = xfDef.perLevel.flushQi * lv;
      qi += add;
      breakdown.push({ label: '同花顺气', value: `+${add.toFixed(2)}` });
    }
  }

  // 天命（可双天命）
  const tmSuits = ctx.tianmingSuits || (ctx.tianmingSuit ? [ctx.tianmingSuit] : []);
  if (tmSuits.length) {
    let tmAdd = 0;
    for (const s of tmSuits) {
      tmAdd += hand.cards.filter(c => c.suit === s).length * 2 * (ctx.tianmingDouble || 1);
    }
    if (tmAdd) {
      li += tmAdd;
      breakdown.push({ label: '天命花色', value: `牌理+${tmAdd}` });
    }
  }
  if (ctx.allTianmingHalf) {
    const add = hand.cards.filter(c => !c.joker).length;
    li += add;
    breakdown.push({ label: '万象', value: `牌理+${add}` });
  }

  const flush = isFlush(hand.cards);
  if (flush) {
    let pct = 0.2 + (ctx.flushExtraPct || 0);
    const add = Math.floor(li * pct);
    li += add;
    breakdown.push({ label: '同花', value: `牌理+${add}` });
    if (ctx.hasQipai?.('tianming_huixiang')) {
      const e2 = Math.floor(hand.liSum * 0.25);
      li += e2;
      breakdown.push({ label: '天命回响', value: `牌理+${e2}` });
    }
    if (ctx.character?.passive?.type === 'flush_master') {
      li += ctx.character.passive.li;
      qi += ctx.character.passive.qi;
      breakdown.push({ label: '岚色', value: `牌理+${ctx.character.passive.li} 气+${ctx.character.passive.qi}` });
    }
  }

  // 顺势
  let shunshi = 0.4;
  if (ctx.shunshiBoost) shunshi = ctx.shunshiBoost;
  if (ctx.lastPlayerMaxOrder != null && hand.maxOrder > ctx.lastPlayerMaxOrder) {
    qi += shunshi;
    breakdown.push({ label: '顺势', value: `气+${shunshi}` });
  }

  // 角色连压
  if (ctx.character?.passive?.type === 'chain_qi_scale') {
    const n = ctx.playerChain || 0;
    const scales = ctx.character.passive.scales || [];
    const add = scales[Math.min(n, scales.length - 1)] || 0;
    if (add > 0) {
      qi += add;
      breakdown.push({ label: '梅开二度', value: `气+${add}` });
    }
  }

  for (const qp of (ctx.qipaiList || [])) {
    const e = qp.effect;
    const cm = qp.rarity === 'cursed' ? cursedMul : 1;
    if (e.type === 'hand_qi' && e.hand === hand.type) {
      qi += e.amount * cm;
      breakdown.push({ label: qp.name, value: `气+${(e.amount * cm).toFixed(2)}` });
    }
    if (e.type === 'hand_li' && e.hand === hand.type) {
      li += Math.floor(e.amount * cm);
      breakdown.push({ label: qp.name, value: `牌理+${Math.floor(e.amount * cm)}` });
    }
    if (e.type === 'single_li_pct' && hand.type === 'single') {
      const add = Math.floor(hand.liSum * e.amount * cm);
      li += add;
      breakdown.push({ label: qp.name, value: `牌理+${add}` });
    }
    if (e.type === 'chain_qi' && (ctx.playerChain || 0) >= 1) {
      qi += e.amount * cm;
      breakdown.push({ label: qp.name, value: `气+${(e.amount * cm).toFixed(2)}` });
    }
    if (e.type === 'jiguan_qi') {
      const stacks = Math.min((ctx.jiguanUsedCount || 0) * e.per, e.max) * cm;
      if (stacks > 0) { qi += stacks; breakdown.push({ label: qp.name, value: `气+${stacks.toFixed(1)}` }); }
    }
    if (e.type === 'gucheng') {
      const hc = ctx.handCount || 0;
      if (hc < e.low) { qi += e.lowQi * cm; breakdown.push({ label: qp.name, value: `气+${e.lowQi * cm}` }); }
      else if (hc > e.high) { qi += e.highQi; breakdown.push({ label: qp.name, value: `气${e.highQi}` }); }
    }
    if (e.type === 'fengmo') { qi += e.qi * cm; breakdown.push({ label: qp.name, value: `气+${e.qi * cm}` }); }
    if (e.type === 'flush_qi' && flush) { qi += e.amount * cm; breakdown.push({ label: qp.name, value: `气+${e.amount}` }); }
    if (e.type === 'qipai_count_qi') {
      const stacks = Math.min((ctx.qipaiCount || 0) * e.per, e.max);
      if (stacks) { qi += stacks; breakdown.push({ label: qp.name, value: `气+${stacks.toFixed(2)}` }); }
    }
    if (e.type === 'single_beat_qi' && hand.type === 'single' && ctx.mustBeat) {
      qi += e.amount; breakdown.push({ label: qp.name, value: `气+${e.amount}` });
    }
    if (e.type === 'low_score_qi') {
      // applied after rough estimate — use base
      const rough = hand.liSum * hand.baseQi;
      if (rough < e.threshold) { qi += e.amount; breakdown.push({ label: qp.name, value: `气+${e.amount}` }); }
    }
    if (e.type === 'handcount_li' && (ctx.handCount || 0) >= e.min) {
      li += e.amount; breakdown.push({ label: qp.name, value: `牌理+${e.amount}` });
    }
    if (e.type === 'handcount_qi' && (ctx.handCount || 0) <= e.max) {
      qi += e.amount; breakdown.push({ label: qp.name, value: `气+${e.amount}` });
    }
    if (e.type === 'first_play_qi' && (ctx.playsThisBattle || 0) === 0) {
      qi += e.amount; breakdown.push({ label: qp.name, value: `气+${e.amount}` });
    }
    if (e.type === 'straight_len_qi' && hand.type === 'straight') {
      const extra = Math.max(0, hand.length - 5) * e.per;
      if (extra) { qi += extra; breakdown.push({ label: qp.name, value: `气+${extra.toFixed(2)}` }); }
    }
    if (e.type === 'jiguan_then_play' && ctx.turnJiguanUsed > 0) {
      qi += e.amount; breakdown.push({ label: qp.name, value: `气+${e.amount}` });
    }
    if (e.type === 'all_hand_qi') {
      qi += e.amount; breakdown.push({ label: qp.name, value: `气+${e.amount}` });
    }
    if (e.type === 'type_diversity_qi') {
      const n = (ctx.typesPlayedCount || 0) * e.per;
      if (n) { qi += n; breakdown.push({ label: qp.name, value: `气+${n.toFixed(2)}` }); }
    }
    if (e.type === 'empty_city') {
      qi += e.qi * cm; breakdown.push({ label: qp.name, value: `气+${(e.qi * cm).toFixed(2)}` });
    }
    if (e.type === 'underdog') {
      const behind = (ctx.playerScore || 0) / Math.max(1, ctx.threshold || 1) < (ctx.enemyScore || 0) / Math.max(1, ctx.enemyThreshold || 1);
      const add = behind ? e.behind * cm : e.ahead;
      qi += add; breakdown.push({ label: qp.name, value: `气${add > 0 ? '+' : ''}${add}` });
    }
    if (e.type === 'burn_body') {
      if (hand.type === 'bomb' || hand.type === 'rocket') {
        qi += e.bombQi * cm; breakdown.push({ label: qp.name, value: `气+${e.bombQi * cm}` });
      } else {
        qi += e.other; breakdown.push({ label: qp.name, value: `气${e.other}` });
      }
    }
    if (e.type === 'blind_tianming') {
      li += Math.floor(e.li * cm); breakdown.push({ label: qp.name, value: `牌理+${Math.floor(e.li * cm)}` });
    }
    if (e.type === 'blood_pact') {
      scoreMult *= (1 + (e.mult - 1) * cm);
      breakdown.push({ label: qp.name, value: `得分×${(1 + (e.mult - 1) * cm).toFixed(2)}` });
    }
    if (e.type === 'only_big') {
      if (!e.types.includes(hand.type)) {
        scoreMult *= e.mult;
        breakdown.push({ label: qp.name, value: `非核心×${e.mult}` });
      }
    }
    if (e.type === 'boss_score' && ctx.stageType === 'zong') {
      scoreMult *= e.amount;
      breakdown.push({ label: qp.name, value: `宗主×${e.amount}` });
    }
    if (e.type === 'reveal_and_flush' && flush) {
      const add = Math.floor(li * e.pct);
      li += add; breakdown.push({ label: qp.name, value: `牌理+${add}` });
    }
  }

  // 周常加成
  const wb = ctx.weeklyBonus;
  if (wb) {
    if (wb.straightQi && hand.type === 'straight') {
      qi += wb.straightQi;
      breakdown.push({ label: '周常·顺', value: `气+${wb.straightQi}` });
    }
    if (wb.pairQi && hand.type === 'pair') {
      qi += wb.pairQi;
      breakdown.push({ label: '周常·对', value: `气+${wb.pairQi}` });
    }
    if (wb.lowHandQi && (ctx.handCount || 0) <= 8) {
      qi += wb.lowHandQi;
      breakdown.push({ label: '周常·薄牌', value: `气+${wb.lowHandQi}` });
    }
    if (wb.diversity && (ctx.typesPlayedCount || 0) > 0) {
      const add = (ctx.typesPlayedCount || 0) * wb.diversity;
      qi += add;
      breakdown.push({ label: '周常·全能', value: `气+${add.toFixed(2)}` });
    }
    if (wb.jiguanQi && (ctx.jiguanUsedCount || 0) > 0) {
      const add = (ctx.jiguanUsedCount || 0) * wb.jiguanQi;
      qi += add;
      breakdown.push({ label: '周常·千机', value: `气+${add.toFixed(2)}` });
    }
  }

  if (ctx.tempQi) {
    // 拆开 skillNotes 展示（若有）
    const notes = ctx.skillNotes || [];
    if (notes.length) {
      let rest = ctx.tempQi;
      notes.forEach(n => {
        const m = String(n.value || '').match(/([0-9.]+)/);
        const v = m ? parseFloat(m[1]) : 0;
        rest -= v;
        breakdown.push({ label: n.label, value: n.value });
      });
      if (rest > 0.04) breakdown.push({ label: '气脉/威能', value: `+${rest.toFixed(2)}` });
      qi += ctx.tempQi;
    } else {
      qi += ctx.tempQi;
      breakdown.push({ label: '临时气', value: `+${Number(ctx.tempQi).toFixed(2)}` });
    }
  }
  if (ctx.tempLi) { li += ctx.tempLi; breakdown.push({ label: '临时牌理', value: `+${ctx.tempLi}` }); }
  if (ctx.duanweiLi) { li += ctx.duanweiLi; breakdown.push({ label: '断尾', value: `牌理+${ctx.duanweiLi}` }); }
  if (ctx.discardLiBonus) { li += ctx.discardLiBonus; breakdown.push({ label: '弃牌加成', value: `牌理+${ctx.discardLiBonus}` }); }
  if (ctx.pairToTripleBonus && hand.type === 'triple') {
    li += ctx.pairToTripleBonus; breakdown.push({ label: '双修', value: `牌理+${ctx.pairToTripleBonus}` });
  }
  if (ctx.character?.passive?.type === 'bomb_draw' && hand.type === 'bomb') {
    const stack = (ctx.bombQiStacks || 0) * 0.2;
    if (stack > 0) { qi += stack; breakdown.push({ label: '镇魂蓄力', value: `气+${stack.toFixed(1)}` }); }
  }
  if (ctx.yingCounterQi) { qi += ctx.yingCounterQi; breakdown.push({ label: '反击', value: `气+${ctx.yingCounterQi}` }); }
  if (ctx.counterLi) { li += ctx.counterLi; breakdown.push({ label: '反制印', value: `牌理+${ctx.counterLi}` }); }

  if (ctx.boss?.bombQi && (hand.type === 'bomb' || hand.type === 'rocket')) {
    qi += ctx.boss.bombQi;
    breakdown.push({ label: '宗主压制', value: `气${ctx.boss.bombQi}` });
  }
  if (ctx.modBombQi && (hand.type === 'bomb' || hand.type === 'rocket')) {
    const lab = ctx.modBombQi < 0 ? '词条·禁炸' : '雷火种';
    qi += ctx.modBombQi;
    breakdown.push({ label: lab, value: `气${ctx.modBombQi > 0 ? '+' : ''}${Number(ctx.modBombQi).toFixed(2)}` });
  }

  // 宗势
  if (ctx.pendingZongshi) { zongshi = Math.max(zongshi, ctx.pendingZongshi); breakdown.push({ label: '宗势', value: `×${ctx.pendingZongshi}` }); }
  if (hand.type === 'rocket' && ctx.hasQipai?.('tiansha_linmen')) { zongshi = Math.max(zongshi, 1.3); breakdown.push({ label: '天煞临门', value: '×1.3' }); }
  if (ctx.gumingZongshi) { zongshi = Math.max(zongshi, 1.6); breakdown.push({ label: '赌命', value: '×1.6' }); }
  if (ctx.fiveTypesReady) { zongshi = Math.max(zongshi, 1.5); breakdown.push({ label: '五宗会', value: '×1.5' }); }
  if (ctx.guiyiZongshi) { zongshi = Math.max(zongshi, 1.25); breakdown.push({ label: '归一诀', value: '×1.25' }); }
  if (ctx.jieqiZongshi) { zongshi = Math.max(zongshi, ctx.jieqiZongshi); breakdown.push({ label: '劫气', value: `×${ctx.jieqiZongshi}` }); }
  if (ctx.everyNZongshi) { zongshi = Math.max(zongshi, ctx.everyNZongshi); breakdown.push({ label: '太虚', value: `×${ctx.everyNZongshi}` }); }

  if (ctx.boss?.needTypes && (ctx.typesPlayedCount || 0) < ctx.boss.needTypes) {
    scoreMult *= 0.85;
    breakdown.push({ label: '合道不全', value: '×0.85' });
  }
  if (ctx.scoreTax && ctx.scoreTax !== 1) {
    scoreMult *= ctx.scoreTax;
    breakdown.push({ label: '重压', value: `×${ctx.scoreTax}` });
  }

  // 气软上限
  let cap = ctx.qiCap || 8;
  const softRate = ctx.softcapRate != null ? ctx.softcapRate : 0.4;
  let finalQi = qi;
  if (qi > cap) {
    finalQi = cap + (qi - cap) * softRate;
    breakdown.push({ label: '气软上限', value: `${qi.toFixed(1)}→${finalQi.toFixed(2)}` });
  }

  let score = Math.floor(li * finalQi * zongshi * scoreMult);
  breakdown.push({ label: '本次得分', value: `${li}×${finalQi.toFixed(2)}×${zongshi.toFixed(2)}${scoreMult !== 1 ? '×' + scoreMult.toFixed(2) : ''}=${score}` });

  return { score, li, qi: finalQi, rawQi: qi, zongshi, breakdown, isFlush: flush };
}

function pickQipaiChoicesFromPool(pool, ownedIds, count, preferCursed = false) {
  let avail = pool.filter(q => !ownedIds.includes(q.id));
  if (avail.length < count) avail = pool.slice();
  const weighted = [];
  for (const q of avail) {
    let w = q.rarity === 'common' ? 5 : q.rarity === 'rare' ? 3 : q.rarity === 'legend' ? 1 : (preferCursed ? 4 : 1);
    for (let i = 0; i < w; i++) weighted.push(q);
  }
  const result = [];
  const used = new Set();
  let guard = 0;
  while (result.length < count && weighted.length && guard++ < 500) {
    const q = weighted[Math.floor(Math.random() * weighted.length)];
    if (!used.has(q.id)) { used.add(q.id); result.push(q); }
  }
  return result;
}

﻿/**
 * ========== 多算法守关者 AI ==========
 * 算法：rush 破境狂 | control 锁喉 | economize 算子 | tempo 牌势 | hybrid 均衡
 * 调度：按难度/策略/关卡选择主算法，高难可 ensemble 投票
 */

function aiCardControlValue(hand) {
  if (!hand) return 0;
  let v = hand.maxOrder * 1.35 + hand.cards.length * 0.55;
  if (hand.type === 'bomb') v += 42 + hand.maxOrder;
  if (hand.type === 'rocket') v += 85;
  if (hand.type === 'airplane') v += 14;
  if (hand.type === 'consecutive_pairs') v += 10;
  if (hand.type === 'straight') v += 7 + Math.max(0, hand.length - 5) * 1.8;
  if (hand.type === 'triple' || hand.type === 'triple_one' || hand.type === 'triple_two') v += 5;
  return v;
}

function aiEstimateScore(hand, ctx = {}) {
  if (!hand) return 0;
  const rate = ctx.aiRate != null ? ctx.aiRate : 0.55;
  let s = (hand.liSum || 0) * (hand.baseQi || 1) * rate;
  if (hand.cards && hand.cards.length >= 2) {
    const s0 = hand.cards[0].suit;
    if (s0 && hand.cards.every(c => c.suit === s0 || c.joker)) s *= 1.12;
  }
  if (hand.type === 'bomb' || hand.type === 'rocket') s *= 1.32;
  if (hand.type === 'straight' || hand.type === 'consecutive_pairs' || hand.type === 'airplane') s *= 1.08;
  return s;
}

function aiRemainingStructure(handCards, play) {
  const used = new Set(play.cards.map(c => c.id));
  const left = handCards.filter(c => !used.has(c.id));
  if (!left.length) return 4;
  const freePlays = enumeratePlays(left, null);
  if (!freePlays.length) return -8;
  let bombs = 0, best = 0, maxCtrl = 0;
  const types = new Set();
  for (const p of freePlays) {
    types.add(p.type);
    if (p.type === 'bomb' || p.type === 'rocket') bombs++;
    best = Math.max(best, p.baseQi * p.liSum);
    maxCtrl = Math.max(maxCtrl, p.maxOrder || 0);
  }
  return types.size * 2.2 + bombs * 10 + Math.min(24, best / 18) + maxCtrl * 0.15
    - (left.length > 14 ? 4 : 0)
    - (left.length <= 3 && bombs === 0 ? 3 : 0);
}

function aiPlayKey(play) {
  if (!play || !play.cards) return '';
  return play.cards.map(c => c.id).sort().join(',');
}

function aiIsBomb(play) {
  return play && (play.type === 'bomb' || play.type === 'rocket');
}

/**
 * 三带/飞机带牌优先消耗低牌，避免为了即时牌理把 2、A 等压制资源当翅膀打掉。
 * 仅影响 AI 的选牌偏好，不改变牌型合法性或结算得分。
 */
function aiAttachmentConservationCost(handCards, play) {
  if (!play || !['triple_one', 'triple_two'].includes(play.type) || !play.cards?.length) return 0;
  const byOrder = new Map();
  play.cards.forEach(c => byOrder.set(c.order, (byOrder.get(c.order) || 0) + 1));
  const tripleOrder = [...byOrder.entries()].find(([, count]) => count >= 3)?.[0];
  if (tripleOrder == null) return 0;

  const wings = play.cards.filter(c => c.order !== tripleOrder);
  return wings.reduce((cost, c) => {
    // 带牌从低阶起递增付出机会成本，让同一组三张优先带最小可用单/对。
    const rankCost = Math.max(0, (c.order || 0) - 3) * 2.5;
    const highRankCost = Math.max(0, (c.order || 0) - 10) * 4;
    const twoPenalty = (c.order || 0) >= 15 ? 16 : 0;
    return cost + rankCost + highRankCost + twoPenalty;
  }, 0);
}

function aiBuildBoard(ctx, freePlay, lastHand) {
  const pScore = ctx.playerScore || 0;
  const pTh = Math.max(1, ctx.playerThreshold || 1000);
  const eScore = ctx.enemyScore || 0;
  const eTh = Math.max(1, ctx.enemyThreshold || 1000);
  const pProg = pScore / pTh;
  const eProg = eScore / eTh;
  const needEnemy = Math.max(0, eTh - eScore);
  const needPlayer = Math.max(0, pTh - pScore);
  const round = ctx.round || 1;
  const maxR = ctx.maxSoftRound || 24;
  return {
    freePlay,
    lastHand,
    strategy: ctx.strategy || 'normal',
    pProg, eProg, needEnemy, needPlayer,
    playerDanger: pProg >= 0.72 || needPlayer < Math.max(100, pTh * 0.1),
    playerNear: pProg >= 0.52,
    enemyBehind: eProg + 0.1 < pProg,
    enemyNearWin: eProg >= 0.68 || needEnemy < Math.max(140, eTh * 0.12),
    chain: ctx.playerChain || 0,
    round, maxR,
    lateGame: round > maxR * 0.5,
    endGame: round > maxR * 0.72,
    handCount: ctx.enemyHandCount || 0,
    playerHandCount: ctx.playerHandCount || 10,
    diff: ctx.difficulty || 'normal',
    isBoss: ctx.stageType === 'zong' || ctx.stageType === 'an',
    bombBias: ctx.difficulty === 'legend' ? 28 : ctx.difficulty === 'master' ? 18 : ctx.difficulty === 'hard' ? 10 : 3,
  };
}

/** 能破境则优先非炸收官 */
function aiPickFinish(plays, ctx, board) {
  let best = null;
  let bestGain = -1;
  for (const play of plays) {
    const g = aiEstimateScore(play, ctx);
    if (g < board.needEnemy * 0.92) continue;
    const bomb = aiIsBomb(play);
    if (!best) { best = play; bestGain = g; continue; }
    const wasBomb = aiIsBomb(best);
    if (wasBomb && !bomb) { best = play; bestGain = g; }
    else if (wasBomb === bomb && g > bestGain) { best = play; bestGain = g; }
    else if (!wasBomb && !bomb && g < bestGain && g >= board.needEnemy) { best = play; bestGain = g; }
  }
  return best;
}

function aiArgMax(plays, scoreFn) {
  let best = null, bestS = -1e18;
  for (const p of plays) {
    const s = scoreFn(p);
    if (s > bestS) { bestS = s; best = p; }
  }
  return best;
}

/**
 * 算法① 破境狂 rush：最大化即时得分与破境概率
 */
function aiAlgoRush(plays, handCards, ctx, board) {
  const fin = aiPickFinish(plays, ctx, board);
  if (fin && (board.enemyNearWin || board.endGame || board.strategy === 'finish' || board.strategy === 'aggressive')) {
    return fin;
  }
  return aiArgMax(plays, (play) => {
    const gain = aiEstimateScore(play, ctx);
    const bomb = aiIsBomb(play);
    let s = gain * 2.4 + play.baseQi * 12 + play.cards.length * 2;
    if (play.type === 'straight') s += 20 + (play.length - 5) * 5;
    if (play.type === 'consecutive_pairs') s += 22;
    if (play.type === 'airplane') s += 24;
    if (bomb) {
      s += board.enemyNearWin || board.enemyBehind || board.playerDanger ? 40 : -30;
    }
    if (gain >= board.needEnemy * 0.5) s += 30;
    if (gain >= board.needEnemy * 0.8) s += 50;
    s += (Math.random() - 0.5) * 3;
    return s - aiAttachmentConservationCost(handCards, play);
  });
}

/**
 * 算法② 锁喉 control：打断连压、抬高压制线、限制玩家
 */
function aiAlgoControl(plays, handCards, ctx, board) {
  if (board.freePlay) {
    // 自由时出中等控制+留大牌
    return aiArgMax(plays, (play) => {
      const bomb = aiIsBomb(play);
      let s = play.maxOrder * 2 + play.baseQi * 5;
      if (bomb) s -= 50 - board.bombBias;
      if (play.type === 'single' && play.maxOrder >= 13) s -= 15; // 留着压
      if (play.type === 'pair' && play.maxOrder >= 12) s -= 8;
      if (play.type === 'straight' || play.type === 'airplane') s += 10;
      s += aiRemainingStructure(handCards, play) * 1.2;
      if (board.playerDanger && !bomb) s += play.maxOrder * 1.5;
      return s - aiAttachmentConservationCost(handCards, play) + (Math.random() - 0.5) * 2;
    });
  }
  // 跟牌：优先打断；巧压；必要时炸
  return aiArgMax(plays, (play) => {
    const bomb = aiIsBomb(play);
    const gap = board.lastHand ? play.maxOrder - (board.lastHand.maxOrder || 0) : 0;
    let s = 60 - aiCardControlValue(play) * 0.7;
    if (gap >= 1 && gap <= 3) s += 22;
    if (gap >= 6) s -= 15;
    s += board.chain * 12;
    if (board.chain >= 2) s += 25;
    if (board.chain >= 3 && bomb) s += 45 + board.bombBias;
    if (bomb) {
      const nonBomb = plays.some(p => !aiIsBomb(p));
      s += nonBomb ? (-40 + board.bombBias) : 100;
      if (board.playerDanger) s += 50;
    }
    // 压完后仍有大牌更好
    s += aiRemainingStructure(handCards, play) * 0.9;
    s += play.maxOrder * 0.8; // 抬高压制线
    return s - aiAttachmentConservationCost(handCards, play) + (Math.random() - 0.5) * 2;
  });
}

/**
 * 算法③ 算子 economize：最小代价过牌压制，惜炸
 */
function aiAlgoEconomize(plays, handCards, ctx, board) {
  if (board.freePlay) {
    return aiArgMax(plays, (play) => {
      const bomb = aiIsBomb(play);
      const gain = aiEstimateScore(play, ctx);
      // 性价比：得分/张数
      let s = gain / Math.max(1, play.cards.length) * 3 + gain * 0.5;
      if (bomb) s -= 70 - board.bombBias * 0.5;
      if (play.maxOrder >= 14 && (play.type === 'single' || play.type === 'pair')) s -= 12;
      s += aiRemainingStructure(handCards, play) * 1.4;
      // 仍要推进
      if (board.enemyNearWin) s += gain * 1.2;
      return s - aiAttachmentConservationCost(handCards, play) + (Math.random() - 0.5) * 2;
    });
  }
  // 最小阶差合法压
  return aiArgMax(plays, (play) => {
    const bomb = aiIsBomb(play);
    const gap = board.lastHand ? play.maxOrder - (board.lastHand.maxOrder || 0) : 99;
    let s = 100 - gap * 8 - play.cards.length * 2 - play.maxOrder * 0.5;
    if (bomb) {
      const nonBomb = plays.some(p => !aiIsBomb(p));
      s = nonBomb ? -80 : 50;
      if (board.playerDanger || board.chain >= 3) s += 60 + board.bombBias;
    }
    if (gap >= 1 && gap <= 2) s += 15;
    if (board.chain >= 2 && !bomb) s += 10;
    return s - aiAttachmentConservationCost(handCards, play) + (Math.random() - 0.5) * 1.5;
  });
}

/**
 * 算法④ 牌势 tempo：长组合、连型、牌权与结构
 */
function aiAlgoTempo(plays, handCards, ctx, board) {
  return aiArgMax(plays, (play) => {
    const bomb = aiIsBomb(play);
    const gain = aiEstimateScore(play, ctx);
    let s = gain * 1.1 + aiRemainingStructure(handCards, play) * 1.6;
    if (play.type === 'straight') s += 28 + (play.length - 5) * 6;
    if (play.type === 'consecutive_pairs') s += 30;
    if (play.type === 'airplane') s += 32;
    if (play.type === 'triple_two' || play.type === 'triple_one') s += 14;
    if (play.type === 'triple') s += 10;
    if (bomb) s -= board.freePlay ? (45 - board.bombBias) : (30 - board.bombBias);
    if (!board.freePlay) {
      const gap = board.lastHand ? play.maxOrder - (board.lastHand.maxOrder || 0) : 0;
      if (gap >= 1 && gap <= 4) s += 12;
      s += board.chain * 6;
    }
    if (board.handCount <= 8) s += 15;
    if (board.enemyNearWin) s += gain * 0.8;
    return s - aiAttachmentConservationCost(handCards, play) + (Math.random() - 0.5) * 2.5;
  });
}

/**
 * 算法⑤ 均衡 hybrid：综合抢分+控制+留牌（原加强版）
 */
function aiAlgoHybrid(plays, handCards, ctx, board) {
  const fin = aiPickFinish(plays, ctx, board);
  if (fin && (board.enemyNearWin || board.strategy === 'finish' || board.endGame || board.diff !== 'normal')) {
    return fin;
  }
  if (fin && fin && aiEstimateScore(fin, ctx) >= board.needEnemy) return fin;

  return aiArgMax(plays, (play) => {
    const bomb = aiIsBomb(play);
    const gain = aiEstimateScore(play, ctx);
    const remain = aiRemainingStructure(handCards, play);
    const gap = (!board.freePlay && board.lastHand) ? play.maxOrder - (board.lastHand.maxOrder || 0) : 0;
    const skillBias = board.diff === 'legend' ? 1.25 : board.diff === 'master' ? 1.15 : board.diff === 'hard' ? 1.08 : 1;
    let s = 0;
    if (board.freePlay) {
      s += gain * 1.7 * skillBias + play.baseQi * 10 + Math.min(play.cards.length, 10) * 1.8;
      if (play.type === 'straight') s += 16 + (play.length - 5) * 4;
      if (play.type === 'consecutive_pairs') s += 18;
      if (play.type === 'airplane') s += 20;
      if (bomb) {
        s -= 48 - board.bombBias;
        if (board.enemyBehind || board.enemyNearWin || board.lateGame) s += 38 + board.bombBias;
        if (board.playerDanger) s += 32;
      }
      s += remain * 1.0;
    } else {
      s += 48 - aiCardControlValue(play) * 0.85 + gain * 0.55;
      if (gap >= 1 && gap <= 3) s += 16;
      else if (gap >= 7) s -= 12;
      s += board.chain * 8;
      if (board.chain >= 3 && bomb) s += 35 + board.bombBias;
      if (bomb) {
        const nonBomb = plays.some(p => !aiIsBomb(p));
        s += nonBomb ? (-55 + board.bombBias) : 110;
        if (board.playerDanger) s += 50;
      }
      s += remain * 0.75;
    }
    if (board.strategy === 'aggressive') s += gain * 0.2 + 6;
    if (board.strategy === 'finish') s += gain * 0.5 + 18;
    if (board.strategy === 'block' && !board.freePlay) s += 14;
    s += (Math.random() - 0.5) * (board.diff === 'legend' ? 1.5 : 4);
    return s - aiAttachmentConservationCost(handCards, play);
  });
}

const AI_ALGORITHMS = {
  rush: { id: 'rush', name: '破境狂', fn: aiAlgoRush },
  control: { id: 'control', name: '锁喉', fn: aiAlgoControl },
  economize: { id: 'economize', name: '算子', fn: aiAlgoEconomize },
  tempo: { id: 'tempo', name: '牌势', fn: aiAlgoTempo },
  hybrid: { id: 'hybrid', name: '均衡', fn: aiAlgoHybrid },
};

/**
 * 根据局面选择 1～N 个算法（高难可投票）
 */
function aiSelectAlgorithms(ctx, board) {
  const diff = board.diff;
  const primary = [];
  // 局面主风格
  if (board.strategy === 'finish' || board.enemyNearWin) primary.push('rush');
  else if (board.strategy === 'block' || board.chain >= 2) primary.push('control');
  else if (board.strategy === 'defend') primary.push('economize');
  else if (board.strategy === 'aggressive') primary.push('rush', 'tempo');
  else primary.push('hybrid');

  // 关卡个性
  if (board.isBoss) primary.push('control');
  if (ctx.stageType === 'zong') primary.push('rush');
  if (ctx.bossId === 'ying') primary.push('control');
  if (ctx.bossId === 'void' || ctx.bossId === 'paizong') primary.push('rush', 'hybrid');
  if (ctx.bossId === 'gui') primary.push('tempo');

  // 难度：多算法 ensemble
  let pool = [...new Set(primary)];
  if (diff === 'hard') {
    pool.push('hybrid');
  } else if (diff === 'master') {
    pool.push('rush', 'control', 'hybrid');
  } else if (diff === 'legend') {
    pool = ['rush', 'control', 'economize', 'tempo', 'hybrid'];
  } else {
    // 常道：主算法 + 20% 换一套增加变化
    if (Math.random() < 0.22) {
      const all = Object.keys(AI_ALGORITHMS);
      pool = [all[Math.floor(Math.random() * all.length)]];
    } else {
      pool = [pool[0] || 'hybrid'];
    }
  }
  return [...new Set(pool)].filter(id => AI_ALGORITHMS[id]);
}

/**
 * 集成：多算法投票；平票时用 rush/hybrid 破境优先
 */
function aiEnsembleVote(algoIds, plays, handCards, ctx, board) {
  const votes = new Map();
  const weights = {
    rush: board.enemyNearWin || board.strategy === 'finish' ? 1.4 : 1.1,
    control: board.chain >= 2 || board.playerDanger ? 1.35 : 1.0,
    economize: board.strategy === 'defend' ? 1.2 : 0.9,
    tempo: 1.0,
    hybrid: 1.15,
  };
  for (const id of algoIds) {
    const def = AI_ALGORITHMS[id];
    if (!def) continue;
    let pick = null;
    try { pick = def.fn(plays, handCards, ctx, board); } catch (_) { pick = null; }
    if (!pick) continue;
    const key = aiPlayKey(pick);
    const w = weights[id] || 1;
    const cur = votes.get(key) || { play: pick, w: 0, names: [] };
    cur.w += w;
    cur.names.push(def.name);
    votes.set(key, cur);
  }
  if (!votes.size) return null;
  let best = null;
  for (const v of votes.values()) {
    if (!best || v.w > best.w) best = v;
    else if (v.w === best.w) {
      const g1 = aiEstimateScore(v.play, ctx);
      const g0 = aiEstimateScore(best.play, ctx);
      if (g1 >= board.needEnemy && g0 < board.needEnemy) best = v;
      else if (aiIsBomb(best.play) && !aiIsBomb(v.play) && g1 >= g0 * 0.9) best = v;
      else if (g1 > g0 + 15) best = v;
    }
  }
  if (best && ctx._aiDebug) {
    ctx._aiDebug.algo = best.names.join('+');
    ctx._aiDebug.votes = best.w;
  }
  return best ? best.play : null;
}

/**
 * 出牌后局面估值（越高对守关者越有利）
 * 考虑：得分、破境、剩余结构、对玩家的压制难度
 */
function aiEvalAfterPlay(handCards, play, ctx, board) {
  const gain = aiEstimateScore(play, ctx);
  const remain = aiRemainingStructure(handCards, play);
  const eScore2 = (ctx.enemyScore || 0) + gain;
  const eTh = Math.max(1, ctx.enemyThreshold || 1000);
  const pScore = ctx.playerScore || 0;
  const pTh = Math.max(1, ctx.playerThreshold || 1000);
  let v = 0;

  // 直接破境
  if (eScore2 >= eTh) return 1e6 + gain - (aiIsBomb(play) ? 30 : 0);

  const eProg = eScore2 / eTh;
  const pProg = pScore / pTh;
  v += gain * 2.2;
  v += eProg * 120;
  v -= pProg * 40;
  v += remain * 2.5;
  v -= aiAttachmentConservationCost(handCards, play);

  // 跟牌后：压制线越高，玩家越难压
  if (!board.freePlay) {
    v += (play.maxOrder || 0) * 1.8;
    const gap = board.lastHand ? (play.maxOrder - (board.lastHand.maxOrder || 0)) : 0;
    if (gap >= 1 && gap <= 3) v += 14; // 巧压
    if (gap >= 7 && !aiIsBomb(play)) v -= 10;
    // 打断连压价值
    v += (board.chain || 0) * 15;
  } else {
    // 自由：中高收益组合更好
    if (play.type === 'straight' || play.type === 'airplane' || play.type === 'consecutive_pairs') v += 18;
    if (aiIsBomb(play) && eProg < 0.65 && !board.playerDanger) v -= 25;
  }

  // 玩家手牌少 → 必须持续压制
  if ((board.playerHandCount || 10) <= 5) v += (play.maxOrder || 0) * 1.2 + 10;
  // 我方手牌少 → 积极清牌得分
  if ((board.handCount || 10) <= 6) v += gain * 0.4;

  return v;
}

/**
 * 粗估：玩家跟得上我们这手的概率（手牌数 + 压制阶）
 * 无法知道玩家牌面，用启发式
 */
function aiPlayerBeatProb(play, board) {
  if (board.freePlay) {
    // 自由出牌后玩家需跟：牌少更难跟大牌
    const ph = board.playerHandCount || 10;
    const order = play.maxOrder || 8;
    let prob = 0.55;
    if (order >= 14) prob -= 0.22;
    else if (order >= 12) prob -= 0.12;
    else if (order <= 8) prob += 0.1;
    if (aiIsBomb(play)) prob = Math.min(0.35, prob - 0.15);
    if (ph <= 4) prob -= 0.18;
    if (ph >= 12) prob += 0.12;
    if (play.cards && play.cards.length >= 5) prob -= 0.08; // 长牌型更难跟
    return Math.max(0.08, Math.min(0.92, prob));
  }
  // 我们是跟牌：打完后玩家可能过牌拿回主动权
  // 我们压得越大，玩家越可能过
  const gap = board.lastHand ? (play.maxOrder - (board.lastHand.maxOrder || 0)) : 3;
  let passP = 0.25 + Math.min(0.45, gap * 0.06);
  if (aiIsBomb(play)) passP += 0.2;
  if ((board.playerHandCount || 10) <= 5) passP -= 0.1;
  return Math.max(0.1, Math.min(0.9, passP)); // 此处返回「玩家过牌/交权」概率
}

/**
 * 1 步前瞻价值：即时估值 + 期望后续
 */
function aiLookaheadValue(handCards, play, ctx, board) {
  const base = aiEvalAfterPlay(handCards, play, ctx, board);
  const gain = aiEstimateScore(play, ctx);
  if ((ctx.enemyScore || 0) + gain >= (ctx.enemyThreshold || 1e9)) {
    return base + 5000; // 破境
  }

  let future = 0;
  const used = new Set(play.cards.map(c => c.id));
  const left = handCards.filter(c => !used.has(c.id));

  if (board.freePlay) {
    // 自由出手后玩家要跟：若玩家跟不上，我们再自由一手
    const beatP = aiPlayerBeatProb(play, board);
    const missP = 1 - beatP;
    // 玩家跟不上 → 我们再出最优自由分
    if (left.length && missP > 0.05) {
      const nextPlays = enumeratePlays(left, null);
      if (nextPlays.length) {
        let bestNext = 0;
        // 只扫前 12 个高收益，控制开销
        const sorted = nextPlays.slice().sort((a, b) => aiEstimateScore(b, ctx) - aiEstimateScore(a, ctx)).slice(0, 12);
        for (const np of sorted) {
          bestNext = Math.max(bestNext, aiEstimateScore(np, ctx));
        }
        future += missP * (bestNext * 1.3 + 20);
        // 若再一手能破
        if ((ctx.enemyScore || 0) + gain + bestNext >= (ctx.enemyThreshold || 1e9)) {
          future += missP * 800;
        }
      }
    }
    // 玩家能跟 → 我方面临被反压，保留控制更重要
    future -= beatP * (aiIsBomb(play) ? 8 : 15);
    // 压得太低：玩家轻松压过并连压
    if ((play.maxOrder || 0) <= 9 && !aiIsBomb(play)) future -= beatP * 12;
  } else {
    // 跟牌：玩家过牌概率 → 我们拿回主动
    const passP = aiPlayerBeatProb(play, board);
    future += passP * 25;
    future += (board.chain || 0) * 8; // 打断成功
    // 2 步：若玩家过，我们下一手自由收益
    if (left.length && passP > 0.2) {
      const nextPlays = enumeratePlays(left, null);
      if (nextPlays.length) {
        const top = nextPlays.slice().sort((a, b) => aiEstimateScore(b, ctx) - aiEstimateScore(a, ctx))[0];
        future += passP * aiEstimateScore(top, ctx) * 0.85;
      }
    }
  }

  // 难度：高难更信前瞻
  const depthW = board.diff === 'legend' ? 1.35 : board.diff === 'master' ? 1.2 : board.diff === 'hard' ? 1.1 : 0.95;
  return base + future * depthW;
}

/**
 * 从多算法 + 收益榜收集候选，用前瞻重排（搜索层）
 */
function aiSearchBest(plays, handCards, ctx, board, algoIds) {
  const candMap = new Map();
  const add = (play, tag) => {
    if (!play) return;
    const k = aiPlayKey(play);
    if (!candMap.has(k)) candMap.set(k, { play, tags: [tag] });
    else candMap.get(k).tags.push(tag);
  };

  // 各算法建议
  for (const id of algoIds) {
    const def = AI_ALGORITHMS[id];
    if (!def) continue;
    try { add(def.fn(plays, handCards, ctx, board), def.name); } catch (_) {}
  }
  // 收益 Top
  const byGain = plays.slice().sort((a, b) => aiEstimateScore(b, ctx) - aiEstimateScore(a, ctx));
  byGain.slice(0, 6).forEach((p, i) => add(p, '收益' + (i + 1)));
  // 跟牌：最小/次小阶差
  if (!board.freePlay && board.lastHand) {
    const nonBomb = plays.filter(p => !aiIsBomb(p))
      .sort((a, b) => (a.maxOrder - b.maxOrder) || (a.cards.length - b.cards.length));
    nonBomb.slice(0, 3).forEach((p, i) => add(p, '巧压' + (i + 1)));
    const bombs = plays.filter(p => aiIsBomb(p));
    bombs.slice(0, 2).forEach(p => add(p, '炸'));
  }
  // 收官候选
  const fin = aiPickFinish(plays, ctx, board);
  if (fin) add(fin, '收官');

  let best = null;
  let bestV = -1e18;
  const report = [];
  for (const { play, tags } of candMap.values()) {
    let v = aiLookaheadValue(handCards, play, ctx, board);
    // 投票加成：多算法同时看中
    v += Math.min(40, (tags.length - 1) * 12);
    // 策略对齐
    if (board.strategy === 'block' && !board.freePlay) v += (play.maxOrder || 0) * 0.5;
    if (board.strategy === 'finish') v += aiEstimateScore(play, ctx) * 0.35;
    report.push({ name: play.name, v, tags: tags.join('+') });
    if (v > bestV) {
      bestV = v;
      best = play;
      if (ctx._aiDebug) {
        ctx._aiDebug.algo = '推演·' + tags.slice(0, 3).join('+');
        ctx._aiDebug.searchV = Math.round(v);
      }
    }
  }
  return best;
}

/**
 * 微型蒙特卡洛：对候选自由牌，随机模拟玩家「能否压住」多次
 * 只在高难 + 自由出牌时启用
 */
function aiMonteCarloRefine(candidates, handCards, ctx, board, samples) {
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestE = -1e18;
  for (const play of candidates) {
    let sum = 0;
    const gain = aiEstimateScore(play, ctx);
    const used = new Set(play.cards.map(c => c.id));
    const left = handCards.filter(c => !used.has(c.id));
    for (let i = 0; i < samples; i++) {
      let e = gain;
      // 随机玩家跟牌能力
      const beat = Math.random() < aiPlayerBeatProb(play, board);
      if (!beat && left.length) {
        // 再自由一手期望
        const np = enumeratePlays(left, null);
        if (np.length) {
          const top = np[Math.floor(Math.random() * Math.min(5, np.length))];
          // 偏高收益采样
          const sorted = np.slice().sort((a, b) => aiEstimateScore(b, ctx) - aiEstimateScore(a, ctx));
          const pick = sorted[Math.floor(Math.random() * Math.min(4, sorted.length))];
          e += aiEstimateScore(pick, ctx) * 0.9;
        }
        e += 15;
      } else if (beat) {
        e -= 12 + (play.maxOrder < 10 ? 8 : 0);
      }
      if ((ctx.enemyScore || 0) + e >= (ctx.enemyThreshold || 1e9)) e += 400;
      sum += e;
    }
    const exp = sum / samples + aiRemainingStructure(handCards, play) * 2;
    if (exp > bestE) {
      bestE = exp;
      best = play;
    }
  }
  if (ctx._aiDebug) ctx._aiDebug.algo = (ctx._aiDebug.algo || '') + '+MC';
  return best;
}

/**
 * 对外入口：多算法 + 投票 + 浅层推演 + 可选 MC
 */
function aiChoosePlay(handCards, lastHand, strategyOrCtx = 'normal') {
  let ctx = {};
  if (typeof strategyOrCtx === 'string') ctx = { strategy: strategyOrCtx };
  else if (strategyOrCtx && typeof strategyOrCtx === 'object') ctx = strategyOrCtx;

  const freePlay = !!(ctx.freePlay || !lastHand);
  const plays = enumeratePlays(handCards, freePlay ? null : lastHand);
  if (!plays.length) return null;

  const board = aiBuildBoard(ctx, freePlay, lastHand);
  board.handCount = handCards.length;

  // 确定性收官
  const finish = aiPickFinish(plays, ctx, board);
  if (finish && aiEstimateScore(finish, ctx) >= board.needEnemy) {
    if (board.diff !== 'normal' || board.enemyNearWin || board.strategy === 'finish' || Math.random() < 0.85) {
      if (ctx._aiDebug) ctx._aiDebug.algo = '收官';
      return finish;
    }
  }

  const algos = aiSelectAlgorithms(ctx, board);

  // 搜索层：候选池 + 前瞻（险途以上默认开；常道在关键局面开）
  const useSearch = board.diff !== 'normal'
    || board.playerDanger
    || board.enemyNearWin
    || board.chain >= 2
    || board.strategy === 'finish'
    || board.strategy === 'aggressive'
    || board.endGame;

  let play = null;
  if (useSearch) {
    play = aiSearchBest(plays, handCards, ctx, board, algos.length ? algos : ['hybrid', 'rush', 'control']);
  } else if (algos.length === 1) {
    play = AI_ALGORITHMS[algos[0]].fn(plays, handCards, ctx, board);
    if (ctx._aiDebug) ctx._aiDebug.algo = AI_ALGORITHMS[algos[0]].name;
  } else {
    play = aiEnsembleVote(algos, plays, handCards, ctx, board);
  }

  // 高难自由出牌：MC 在 top 候选中精修
  if (play && board.freePlay && (board.diff === 'master' || board.diff === 'legend' || board.enemyNearWin)) {
    const pool = plays.slice().sort((a, b) => aiLookaheadValue(handCards, b, ctx, board) - aiLookaheadValue(handCards, a, ctx, board)).slice(0, 5);
    if (!pool.some(p => aiPlayKey(p) === aiPlayKey(play))) pool.unshift(play);
    const samples = board.diff === 'legend' ? 14 : 8;
    const mc = aiMonteCarloRefine(pool, handCards, ctx, board, samples);
    if (mc) play = mc;
  }

  // 跟牌只剩炸：高难少过
  if (!freePlay && play && aiIsBomb(play)) {
    const hasNonBomb = plays.some(p => !aiIsBomb(p));
    if (!hasNonBomb && !board.playerDanger && !board.playerNear && !board.lateGame
      && board.strategy !== 'aggressive' && board.strategy !== 'finish') {
      const passChance = board.diff === 'legend' ? 0.02 : board.diff === 'master' ? 0.05 : board.diff === 'hard' ? 0.1 : 0.18;
      if (Math.random() < passChance) return null;
    }
  }

  if (!play && freePlay && plays.length) {
    play = aiSearchBest(plays, handCards, ctx, board, ['hybrid', 'rush', 'tempo'])
      || aiAlgoHybrid(plays, handCards, ctx, board)
      || plays[0];
    if (ctx._aiDebug && !ctx._aiDebug.algo) ctx._aiDebug.algo = '兜底推演';
  }
  return play;
}
/**
 * 推荐出牌
 * ctx: { needScore, freePlay, scoreCtx, preferClear, scoreFn }
 * scoreFn(play) 优先：可带 skill 气的完整估算
 */
function recommendPlay(handCards, lastHand, ctx = {}) {
  const plays = enumeratePlays(handCards, lastHand);
  if (!plays.length) return null;

  const free = !lastHand || ctx.freePlay;
  const need = ctx.needScore || 0;
  const scoreCtx = ctx.scoreCtx || null;

  const estimate = (p) => {
    if (typeof ctx.scoreFn === 'function') {
      try {
        const v = ctx.scoreFn(p);
        if (v != null && !Number.isNaN(v)) return v;
      } catch (_) {}
    }
    if (scoreCtx && typeof calculateScore === 'function') {
      try { return calculateScore(p, scoreCtx).score; } catch (_) {}
    }
    return Math.floor(p.liSum * p.baseQi);
  };

  const scored = plays.map(p => ({ p, est: estimate(p) }));

  // 能破境：优先非炸可破，其次任何可破
  if (need > 0) {
    const clearers = scored
      .filter(x => x.est >= need * 0.92)
      .sort((a, b) => {
        const ab = a.p.type === 'bomb' || a.p.type === 'rocket' ? 1 : 0;
        const bb = b.p.type === 'bomb' || b.p.type === 'rocket' ? 1 : 0;
        if (ab !== bb) return ab - bb;
        // 破境后余量小者优先（更省牌）
        if (a.est !== b.est) return a.est - b.est;
        return a.p.cards.length - b.p.cards.length;
      });
    if (clearers.length) return clearers[0].p;
  }

  // 临近破境：尽量选高分组合推进
  if (ctx.preferClear && free) {
    scored.sort((a, b) => {
      const ab = a.p.type === 'bomb' || a.p.type === 'rocket' ? 1 : 0;
      const bb = b.p.type === 'bomb' || b.p.type === 'rocket' ? 1 : 0;
      if (ab !== bb) return ab - bb;
      if (b.est !== a.est) return b.est - a.est;
      return a.p.maxOrder - b.p.maxOrder;
    });
    return scored[0].p;
  }

  // 自由出牌：中等收益优先，保留炸与大单；略偏好连型
  scored.sort((a, b) => {
    const pa = a.p, pb = b.p;
    const aBomb = pa.type === 'bomb' || pa.type === 'rocket' ? 1 : 0;
    const bBomb = pb.type === 'bomb' || pb.type === 'rocket' ? 1 : 0;
    if (aBomb !== bBomb) return aBomb - bBomb;
    if (free) {
      // 跟牌以外：顺/连对/飞机略优先（节奏与分）
      const aCombo = (pa.type === 'straight' || pa.type === 'consecutive_pairs' || pa.type === 'airplane') ? 1 : 0;
      const bCombo = (pb.type === 'straight' || pb.type === 'consecutive_pairs' || pb.type === 'airplane') ? 1 : 0;
      if (aCombo !== bCombo && Math.abs(b.est - a.est) < 40) return bCombo - aCombo;
      if (Math.abs(b.est - a.est) > 8) return b.est - a.est;
      // 同收益留大牌控制
      return pa.maxOrder - pb.maxOrder;
    }
    // 跟牌：最小够压（巧压）
    if (pa.maxOrder !== pb.maxOrder) return pa.maxOrder - pb.maxOrder;
    return pa.cards.length - pb.cards.length;
  });
  return scored[0].p;
}

function drawCards(deck, n) {
  const drawn = [];
  for (let i = 0; i < n && deck.length; i++) {
    drawn.push(deck.pop());
  }
  return drawn;
}

function randomTianmingSuit() {
  return SUITS[Math.floor(Math.random() * SUITS.length)].id;
}

function pickQipaiChoices(ownedIds, count, preferCursed = false, unlockedMax = 9999) {
  const pool = QIPAI_POOL.filter(q => (q.unlock || 0) <= unlockedMax);
  return pickQipaiChoicesFromPool(pool.length ? pool : QIPAI_POOL, ownedIds, count, preferCursed);
}
