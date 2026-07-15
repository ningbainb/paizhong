'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const context = {
  assert,
  console,
  Date,
  JSON,
  Math,
  Set,
  Map,
  Array,
  Object,
  Number,
  String,
  Boolean,
  RegExp,
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  },
};

vm.createContext(context);
for (const file of ['js/data.js', 'js/engine.js', 'js/game.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const result = vm.runInContext(`
(() => {
  const checks = [];
  const expect = (name, fn) => {
    fn();
    checks.push(name);
  };

  const deckFor = (seed) => {
    const g = new PaiZongGame();
    g.run = { isDaily: true, dailySeed: seed, dailyRngState: seed };
    return createDeck(g.random.bind(g)).map(c => [c.rank, c.suit]);
  };

  expect('puzzle cards parse and open', () => {
    assert.ok(createCardFromCode('H3'));
    assert.ok(createCardFromCode('S10'));
    assert.ok(createCardFromCode('BJ'));
    assert.ok(Array.isArray(PUZZLE_POOL) && PUZZLE_POOL.length >= 5);
    const g = new PaiZongGame();
    const first = PUZZLE_POOL[0];
    const res = g.startPuzzle(first.id);
    assert.equal(res.ok, true);
    assert.equal(g.run.isPuzzle, true);
    assert.ok(g.battle.playerHand.length > 0);
    g.battle.playerScore = g.battle.threshold;
    const win = g.onWin();
    assert.equal(win.won, true);
    assert.equal(win.isPuzzle, true);
    assert.ok(win.stars >= 1 && win.stars <= 3);
    assert.ok((g.meta.puzzles[first.id]?.stars || 0) >= 1);
    g.abandonRun();
  });

  expect('daily deck is deterministic', () => {
    assert.deepEqual(deckFor(123456), deckFor(123456));
    assert.notDeepEqual(deckFor(123456), deckFor(654321));
  });

  expect('daily rng state survives run serialization', () => {
    const g = new PaiZongGame();
    g.run = { isDaily: true, dailySeed: 123, dailyRngState: 123 };
    g.random();
    const saved = g.serializeRun();
    const restored = g.deserializeRun(saved);
    assert.equal(saved.dailyRngState, g.run.dailyRngState);
    assert.equal(restored.dailyRngState, saved.dailyRngState);
  });

  expect('legal play enumeration is cached per battle state', () => {
    const g = new PaiZongGame();
    g.battle = {
      status: 'playing',
      turn: 'player',
      freePlay: true,
      lastHand: null,
      lastPlayer: null,
      baibianActive: null,
      yirongActive: null,
      playerHand: createDeck(() => 0.25).slice(0, 7),
    };
    const first = g.getLegalPlays();
    assert.strictEqual(g.getLegalPlays(), first);
    g.battle.playerHand[0]._frozen = true;
    assert.notStrictEqual(g.getLegalPlays(), first);
    const afterFreeze = g.getLegalPlays();
    g.battle.baibianActive = { cardId: g.battle.playerHand[1].id, rankId: 'A' };
    const afterWild = g.getLegalPlays();
    assert.notStrictEqual(afterWild, afterFreeze);
    g.battle.baibianActive.rankId = 'K';
    assert.notStrictEqual(g.getLegalPlays(), afterWild);
  });

  expect('宗主赦令 returns a revival result', () => {
    const g = new PaiZongGame();
    g.run = {
      character: CHARACTERS.find(c => c.id === 'shen'),
      qipai: [{ ...QIPAI_POOL.find(q => q.id === 'zongzhu_sheling') }],
      stagesCleared: 0,
      difficulty: DIFFICULTIES[0],
      yueli: 0,
    };
    g.battle = {
      stageType: 'zong',
      reviveUsed: false,
      threshold: 100,
      playerScore: 10,
      enemyScore: 90,
      status: 'playing',
      log: [],
    };
    const revived = g.onLose('test');
    assert.equal(revived.revived, true);
    assert.equal(revived.lost, undefined);
    assert.equal(g.battle.status, 'playing');
  });

  expect('借火令 grants two mechanism uses this turn', () => {
    const g = new PaiZongGame();
    g.run = {
      character: CHARACTERS.find(c => c.id === 'shen'),
      qipai: [],
      jinnang: [{ ...JINNANG_POOL.find(j => j.id === 'jiehuo'), uid: 'jn-1' }],
    };
    g.battle = {
      status: 'playing',
      turn: 'player',
      jiguanTurnLimit: 1,
      maxJiguanPerTurn: 1,
      turnJiguanUsed: 0,
      jiguanTokens: 2,
      jiguanHand: [
        { ...JIGUAN_POOL.find(j => j.id === 'qingxin_jg'), uid: 'jg-1' },
        { ...JIGUAN_POOL.find(j => j.id === 'jiehuo_jg'), uid: 'jg-2' },
      ],
      discardedJiguan: [],
      selectedIds: new Set(),
      xinmo: 0,
      xinmoCap: 5,
      playerHand: [],
      enemyHand: [],
      deck: [],
      nextPlayQi: 0,
      discardCount: 0,
      log: [],
    };
    assert.equal(g.useJinnang('jn-1').ok, true);
    assert.equal(g.battle.jiguanTurnLimit, 2);
    assert.equal(g.useJiguan('jg-1').ok, true);
    assert.equal(g.useJiguan('jg-2').ok, true);
  });

  return checks;
})()
`, context);

console.log(`Passed ${result.length} game regression checks.`);
