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

/**
 * AI 评估一手牌的「结构价值」：越大越该留着
 */
function aiCardControlValue(hand) {
  if (!hand) return 0;
  let v = hand.maxOrder * 1.2 + hand.cards.length * 0.5;
  if (hand.type === 'bomb') v += 40 + hand.maxOrder;
  if (hand.type === 'rocket') v += 80;
  if (hand.type === 'airplane') v += 12;
  if (hand.type === 'consecutive_pairs') v += 8;
  if (hand.type === 'straight') v += 6 + Math.max(0, hand.length - 5) * 1.5;
  if (hand.type === 'triple') v += 4;
  return v;
}

/**
 * 估算出牌后对「破境进度」的贡献（与游戏内 AI 计分同向）
 */
function aiEstimateScore(hand, ctx = {}) {
  if (!hand) return 0;
  const rate = ctx.aiRate != null ? ctx.aiRate : 0.5;
  let s = hand.liSum * hand.baseQi * rate;
  if (hand.type === 'bomb' || hand.type === 'rocket') s *= 1.25;
  return s;
}

/**
 * 出完这手后，剩余手牌是否仍有结构（粗算）
 */
function aiRemainingStructure(handCards, play) {
  const used = new Set(play.cards.map(c => c.id));
  const left = handCards.filter(c => !used.has(c.id));
  if (!left.length) return 0;
  const freePlays = enumeratePlays(left, null);
  if (!freePlays.length) return -5;
  // 剩余可出牌型种类 + 炸弹库存
  let bombs = 0;
  let best = 0;
  const types = new Set();
  for (const p of freePlays) {
    types.add(p.type);
    if (p.type === 'bomb' || p.type === 'rocket') bombs++;
    best = Math.max(best, p.baseQi * p.liSum);
  }
  return types.size * 2 + bombs * 8 + Math.min(20, best / 20) - (left.length > 14 ? 3 : 0);
}

/**
 * 守关者 AI：根据局面打分选牌
 * ctx: {
 *   strategy: normal|block|aggressive|defend,
 *   freePlay: boolean,
 *   playerScore, playerThreshold, enemyScore, enemyThreshold,
 *   playerChain, playerHandCount, enemyHandCount,
 *   round, maxSoftRound, difficulty, aiRate
 * }
 */
function aiChoosePlay(handCards, lastHand, strategyOrCtx = 'normal') {
  // 兼容旧调用：aiChoosePlay(hand, last, 'aggressive')
  let ctx = {};
  if (typeof strategyOrCtx === 'string') {
    ctx = { strategy: strategyOrCtx };
  } else if (strategyOrCtx && typeof strategyOrCtx === 'object') {
    ctx = strategyOrCtx;
  }
  const strategy = ctx.strategy || 'normal';
  const freePlay = !!(ctx.freePlay || !lastHand);
  const plays = enumeratePlays(handCards, freePlay ? null : lastHand);
  if (!plays.length) return null;

  const pScore = ctx.playerScore || 0;
  const pTh = Math.max(1, ctx.playerThreshold || 1000);
  const eScore = ctx.enemyScore || 0;
  const eTh = Math.max(1, ctx.enemyThreshold || 1000);
  const pProg = pScore / pTh;
  const eProg = eScore / eTh;
  const playerDanger = pProg >= 0.75 || (pTh - pScore) < 200;
  const playerNear = pProg >= 0.55;
  const enemyBehind = eProg + 0.12 < pProg;
  const enemyNearWin = eProg >= 0.7;
  const chain = ctx.playerChain || 0;
  const round = ctx.round || 1;
  const lateGame = round > (ctx.maxSoftRound || 24) * 0.55;
  const handCount = handCards.length;
  const diff = ctx.difficulty || 'normal';

  // 难度影响：更敢炸、更压连
  const bombBias = diff === 'legend' ? 18 : diff === 'master' ? 10 : diff === 'hard' ? 4 : 0;
  const blockBias = strategy === 'block' || chain >= 2 ? 15 + chain * 6 : 0;

  let best = null;
  let bestScore = -1e9;

  for (const play of plays) {
    const isBomb = play.type === 'bomb' || play.type === 'rocket';
    const control = aiCardControlValue(play);
    const gain = aiEstimateScore(play, ctx);
    const remain = aiRemainingStructure(handCards, play);

    let score = 0;

    if (freePlay) {
      // 自由出牌：优先「中高收益组合」，保留炸弹与最大单牌控制
      score += gain * 1.4;
      score += play.baseQi * 8;
      score += Math.min(play.cards.length, 8) * 1.5;

      // 长顺/连对/飞机在自由时很有价值（得分高）
      if (play.type === 'straight') score += 12 + (play.length - 5) * 3;
      if (play.type === 'consecutive_pairs') score += 14;
      if (play.type === 'airplane') score += 16;
      if (play.type === 'triple') score += 6;
      if (play.type === 'pair') score += 3;

      // 自由时尽量不出炸弹，除非落后或终局抢分
      if (isBomb) {
        score -= 55 - bombBias;
        if (enemyBehind || enemyNearWin || lateGame) score += 30 + bombBias;
        if (playerDanger) score += 20;
      }

      // 避免一上来就甩最大单/对，留作压制
      if ((play.type === 'single' || play.type === 'pair') && play.maxOrder >= 14) {
        score -= 10;
      }
      // 牌少时积极清牌拿分
      if (handCount <= 6) score += gain * 0.5 + 8;
      // 剩余结构
      score += remain * 0.8;
    } else {
      // 跟牌：默认最小代价压制
      const overpay = control; // 用大牌压小牌代价高
      score += 40 - overpay * 0.9;
      score += gain * 0.35;

      // 刚好能压的小牌加分（巧压）
      if (!isBomb && lastHand) {
        const gap = play.maxOrder - (lastHand.maxOrder || 0);
        score += (20 - play.maxOrder) * 0.8;
        score += (8 - Math.min(play.cards.length, 8));
        // 刚压过 1～3 阶更优，浪费大牌扣分
        if (gap >= 1 && gap <= 3) score += 12;
        else if (gap >= 6) score -= 8;
      } else if (!isBomb) {
        score += (20 - play.maxOrder) * 0.8;
        score += (8 - Math.min(play.cards.length, 8));
      }

      // 打断玩家连压
      if (chain >= 2 && !isBomb) {
        score += blockBias;
        // 用稍大的牌打断，不必最小
        if (play.maxOrder >= 10) score += 6;
      }
      if (chain >= 3) score += 12;
      if (chain >= 5) score += 10; // 玩家长连必须打断

      // 炸弹：仅在必要时
      if (isBomb) {
        score -= 70 - bombBias;
        // 没有非炸手段时 enumerate 里若只有炸，自然会选
        const hasNonBomb = plays.some(p => p.type !== 'bomb' && p.type !== 'rocket');
        if (!hasNonBomb) score += 100;
        // 玩家要破境 / AI 需要抢进度 / 策略 aggressive
        if (playerDanger) score += 45 + bombBias;
        else if (playerNear && enemyBehind) score += 25;
        if (strategy === 'aggressive') score += 20 + bombBias;
        if (lateGame && enemyBehind) score += 18;
        // 火箭更珍贵
        if (play.type === 'rocket') score -= 12;
      }

      // 跟牌后剩余结构
      score += remain * 0.6;

      // 玩家手牌很少时，加大压制力度
      if ((ctx.playerHandCount || 10) <= 5 && !isBomb) score += 8;
    }

    // 难度：宗师/传说更偏向高收益与阻断
    if (diff === 'master' || diff === 'legend') {
      if (!freePlay && chain >= 1) score += 5;
      if (freePlay && play.baseQi >= 2.2) score += 6;
    }

    // 轻微随机，避免完全可预测（幅度随难度减小）
    const jitter = diff === 'legend' ? 2 : diff === 'master' ? 4 : 7;
    score += (Math.random() - 0.5) * jitter;

    if (score > bestScore) {
      bestScore = score;
      best = play;
    }
  }

  // 极端：可选过牌（仅跟牌且压代价过大、且玩家不危险时）
  // 由上层决定是否允许 pass；这里若全是高代价炸弹且玩家不危险，可返回 null 让上层过牌
  if (!freePlay && best) {
    const isBomb = best.type === 'bomb' || best.type === 'rocket';
    const hasNonBomb = plays.some(p => p.type !== 'bomb' && p.type !== 'rocket');
    if (isBomb && !hasNonBomb && !playerDanger && !playerNear && !lateGame && strategy !== 'aggressive') {
      // 30% 硬扛不炸，给玩家过一轮（增加博弈）
      if (Math.random() < (diff === 'normal' ? 0.35 : 0.15)) return null;
    }
  }

  return best;
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
