'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const context = {
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
  const out = [];
  for (const c of ['H3', 'S10', 'DJ', 'CA', 'BJ', 'RJ', 'H2']) {
    if (!createCardFromCode(c)) out.push('FAIL parse ' + c);
  }
  const g = new PaiZongGame();
  for (const p of PUZZLE_POOL) {
    const res = g.startPuzzle(p.id);
    if (!res.ok) {
      out.push('start fail ' + p.id + ': ' + res.reason);
      continue;
    }
    const b = g.battle;
    const plays = enumeratePlays(
      b.playerHand.filter(c => !c._frozen),
      b.freePlay ? null : b.lastHand
    );
    let best = 0;
    let bestName = '-';
    for (const play of plays) {
      const sc = calculateScore(play, g.getScoreContext());
      if (sc.score > best) {
        best = sc.score;
        bestName = play.name;
      }
    }
    out.push(
      p.id
      + ' thr=' + b.threshold
      + ' best=' + best + '(' + bestName + ')'
      + ' legal=' + plays.length
      + ' oneShot=' + (best >= b.threshold)
      + ' last=' + (b.lastHand && b.lastHand.name)
    );
    b.playerScore = b.threshold;
    const w = g.onWin();
    if (!w.won || !w.isPuzzle) out.push('win fail ' + p.id);
    g.abandonRun();
  }
  out.push('clearedCount=' + g.puzzleClearedCount());
  out.push('threeStar=' + g.puzzleThreeStarCount());
  return out;
})()
`, context);

console.log(result.join('\n'));
