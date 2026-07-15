/**
 * 《牌宗》UI 渲染与交互
 */

const UI = {
  screen: 'title',
  pendingQipaiChoices: [],
  selectedCharId: null,
  selectedQipaiId: null,
  shopQipaiChoices: [],
  aiThinking: false,
  modalCallback: null,
  selectedMode: 'normal', // normal | endless | daily
  selectedDifficulty: 'normal',
  animating: false,
  _lastClickCard: null,
  _lastClickTime: 0,
  /** 移动端「微调」模式：点牌等价于桌面 Shift 加减单张 */
  multiSelectMode: false,
  _coarsePointer: null,

  $(id) {
    return document.getElementById(id);
  },

  /** 触控 / 窄屏：用移动端文案与手势 */
  isTouchUI() {
    if (this._coarsePointer == null) {
      try {
        this._coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches
          || ('ontouchstart' in window && window.matchMedia('(max-width: 900px)').matches);
      } catch (_) {
        this._coarsePointer = 'ontouchstart' in window;
      }
      // 视口变化时重算
      try {
        const mq = window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 780px)');
        const reset = () => { this._coarsePointer = null; };
        if (mq.addEventListener) mq.addEventListener('change', reset);
        else if (mq.addListener) mq.addListener(reset);
      } catch (_) { /* ignore */ }
    }
    if (this._coarsePointer) return true;
    try {
      return window.innerWidth <= 780;
    } catch (_) {
      return false;
    }
  },

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('active', 'screen-enter');
    });
    const el = this.$(`screen-${name}`);
    if (el) {
      el.classList.add('active', 'screen-enter');
      this.screen = name;
      // 战斗屏时顶栏收一点氛围
      const header = this.$('app-header');
      if (header) header.classList.toggle('battle-mode', name === 'battle');
      // 先让本屏完成绘制，再预取本屏后续会用到的资源；避免标题页抢加载全素材。
      clearTimeout(this._screenAssetPreloadTimer);
      this._screenAssetPreloadTimer = setTimeout(() => {
        if (typeof preloadAssetsForScreen === 'function') preloadAssetsForScreen(name);
      }, 0);
    }
  },

  toast(msg, ms = 1800) {
    const t = this.$('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  },

  /** 出牌得分闪报 */
  flashScore(main, sub = '', big = false) {
    let el = this.$('score-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'score-flash';
      el.className = 'score-flash';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="score-flash-main">${main}</div>${sub ? `<div class="score-flash-sub">${sub}</div>` : ''}`;
    el.classList.toggle('big', !!big);
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._scoreFlashTimer);
    this._scoreFlashTimer = setTimeout(() => el.classList.remove('show'), big ? 1400 : 1000);

    // 桌面附近再飘一次分，增强出牌反馈
    this.floatScoreNearTable(main, big);
  },

  floatScoreNearTable(text, big = false) {
    const anchor = this.$('last-play-info') || this.$('table-area') || this.$('last-play');
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-score' + (big ? ' big' : '');
    el.textContent = text;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height * 0.2}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  },

  /** 元素短暂 class（反馈用） */
  pulseClass(el, cls, ms = 380) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el._pulseTimer);
    el._pulseTimer = setTimeout(() => el.classList.remove(cls), ms);
  },

  shake(el) {
    this.pulseClass(el || this.$('hand-area') || this.$('action-bar'), 'shake', 360);
  },

  bumpScore(side = 'player') {
    const bar = this.$(side === 'enemy' ? 'bar-enemy' : 'bar-player');
    const num = this.$(side === 'enemy' ? 'score-enemy' : 'score-player');
    this.pulseClass(bar, 'bump', 360);
    if (num) this.pulseClass(num, side === 'enemy' ? 'bump-enemy' : 'bump', 340);
  },

  /** 成就解锁队列弹层 */
  onAchievementUnlock(a) {
    if (!a) return;
    if (!this._achievePopQueue) this._achievePopQueue = [];
    this._achievePopQueue.push(a);
    if (!this._achievePopShowing) this._flushAchievePopup();
  },

  _flushAchievePopup() {
    const q = this._achievePopQueue || [];
    if (!q.length) {
      this._achievePopShowing = false;
      return;
    }
    this._achievePopShowing = true;
    const a = q.shift();
    const el = this.$('achieve-popup');
    if (!el) {
      this.toast(`成就【${a.name}】+${a.yueli || 0} 阅历`, 2600);
      this._achievePopShowing = false;
      setTimeout(() => this._flushAchievePopup(), 100);
      return;
    }
    const badge = this.$('achieve-popup-badge');
    const url = (typeof ASSETS !== 'undefined') ? ASSETS.achieveBadge(a, true) : '';
    if (badge) {
      badge.style.backgroundImage = url ? `url('${url}')` : '';
      badge.className = 'achieve-popup-badge tier-' + ((a.tier) || 'bronze');
    }
    const nm = this.$('achieve-popup-name');
    const ds = this.$('achieve-popup-desc');
    const rw = this.$('achieve-popup-reward');
    if (nm) nm.textContent = a.name;
    if (ds) ds.textContent = a.desc || '';
    if (rw) rw.textContent = `阅历 +${a.yueli || 0}`;
    el.classList.add('show');
    this.sfx && this.sfx('win');
    clearTimeout(this._achievePopTimer);
    this._achievePopTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => this._flushAchievePopup(), 320);
    }, 2600);
  },

  playFx(title, sub = '', kind = 'win') {
    const el = this.$('fx-overlay');
    if (!el) return;
    this.$('fx-title').textContent = title;
    this.$('fx-sub').textContent = sub;
    el.classList.toggle('fx-lose', kind === 'lose');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
      el.classList.remove('fx-lose');
    }, 1800);
  },

  sfx(name) {
    if (typeof SFX !== 'undefined') SFX.play(name);
  },

  updateSfxButton() {
    const btn = this.$('btn-sfx-toggle');
    if (!btn || typeof SFX === 'undefined') return;
    const on = SFX.enabled;
    const icon = (typeof ASSETS !== 'undefined')
      ? (on ? ASSETS.icons.sfxOn : ASSETS.icons.sfxOff)
      : '';
    btn.classList.add('nav-sfx');
    btn.innerHTML = icon
      ? `<span class="nav-sfx-icon" style="background-image:url('${icon}')"></span><span>${on ? '音效开' : '音效关'}</span>`
      : (on ? '音效开' : '音效关');
  },

  copyText(text) {
    if (!text) return Promise.reject();
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  },

  showModal(title, bodyHtml, options = []) {
    return new Promise(resolve => {
      const overlay = this.$('modal-overlay');
      this.$('modal-title').textContent = title;
      this.$('modal-body').innerHTML = bodyHtml;
      const opts = this.$('modal-options');
      opts.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'modal-opt';
        btn.textContent = opt.label;
        btn.onclick = () => {
          overlay.classList.remove('show');
          resolve(opt.value);
        };
        opts.appendChild(btn);
      });
      const cancel = this.$('modal-cancel');
      cancel.onclick = () => {
        overlay.classList.remove('show');
        resolve(null);
      };
      overlay.classList.add('show');
    });
  },

  // ===== 局内断点 =====
  /** 收集 UI 侧临时状态并写入 localStorage */
  persistRun(phase) {
    if (!game.run || typeof game.saveRun !== 'function') return;
    const p = phase || this.screen || 'map';
    // 仅保存论道相关界面
    const allow = ['battle', 'map', 'shop', 'result', 'qipai'];
    if (!allow.includes(p)) return;
    const ui = {
      shopQipaiIds: (this.shopQipaiChoices || []).map(q => q.id).filter(Boolean),
      shopAfterWin: !!this._shopAfterWin,
      stageQipaiKey: this._stageQipaiKey || null,
      qipaiNext: this._qipaiNext || null,
      pendingQipaiIds: (this.pendingQipaiChoices || []).map(q => q.id).filter(Boolean),
      qipaiIsOpening: !!this._qipaiIsOpening,
      resultWon: p === 'result' ? (game.battle?.status === 'won') : null,
    };
    game.saveRun(p, ui);
  },

  /** 放弃未完成论道 */
  abandonCurrentRun(confirmMsg) {
    const msg = confirmMsg || '确定退出本次论道？局内进度将丢失（已结算的阅历保留）。';
    if (!confirm(msg)) return false;
    this.aiThinking = false;
    this.animating = false;
    this._battleGen = (this._battleGen || 0) + 1;
    this.shopQipaiChoices = [];
    this.pendingQipaiChoices = [];
    this._stageQipaiKey = null;
    if (typeof game.abandonRun === 'function') game.abandonRun();
    else {
      game.run = null;
      game.battle = null;
      if (game.clearRunSave) game.clearRunSave();
    }
    return true;
  },

  /** 从断点恢复并进入对应界面 */
  resumeFromSave() {
    if (!game.hasRunSave || !game.hasRunSave()) {
      this.toast('没有可继续的论道');
      return false;
    }
    const r = game.applyRunSave();
    if (!r.ok) {
      this.toast(r.reason || '断点恢复失败');
      if (game.clearRunSave) game.clearRunSave();
      return false;
    }
    const ui = r.ui || {};
    this._stageQipaiKey = ui.stageQipaiKey || null;
    this._shopAfterWin = !!ui.shopAfterWin;
    this._qipaiNext = ui.qipaiNext || 'battle';
    this._qipaiIsOpening = !!ui.qipaiIsOpening;
    this.shopQipaiChoices = (ui.shopQipaiIds || [])
      .map(id => QIPAI_POOL.find(q => q.id === id))
      .filter(Boolean);
    this.pendingQipaiChoices = (ui.pendingQipaiIds || [])
      .map(id => QIPAI_POOL.find(q => q.id === id))
      .filter(Boolean);
    this.selectedQipaiId = null;
    this.aiThinking = false;
    this.animating = false;
    this._battleGen = (this._battleGen || 0) + 1;
    this._hintCardIds = null;

    const phase = r.phase || 'map';
    this.sfx('click');
    this.toast('已恢复未竟论道');

    if (phase === 'battle' && game.battle) {
      if (game.battle.status === 'won') {
        this.showResult(true, {
          reward: game.battle._winReward || 0,
          yueliGain: game.battle._winYueli || 0,
        });
      } else if (game.battle.status === 'lost') {
        this.showResult(false, {
          reason: game.battle._loseReason || '论道未成',
          yueli: game.battle._loseYueli || 0,
        });
      } else {
        this.renderBattle();
        this.showScreen('battle');
        if (game.battle.turn === 'enemy' && game.battle.status === 'playing') {
          setTimeout(() => this.runEnemyTurn(), 400);
        }
      }
      return true;
    }
    if (phase === 'result' && game.battle) {
      const won = ui.resultWon != null ? ui.resultWon : game.battle.status === 'won';
      if (won) {
        this.showResult(true, {
          reward: game.battle._winReward || 0,
          yueliGain: game.battle._winYueli || 0,
        });
      } else {
        this.showResult(false, {
          reason: game.battle._loseReason || '论道未成',
          yueli: game.battle._loseYueli || 0,
        });
      }
      return true;
    }
    if (phase === 'shop' && game.run) {
      this.renderShop(!!this._shopAfterWin);
      return true;
    }
    if (phase === 'qipai' && game.run) {
      this.restoreQipaiSelect();
      return true;
    }
    // map 或兜底
    if (game.run) {
      this.renderMap();
      return true;
    }
    this.toast('断点数据不完整');
    if (game.clearRunSave) game.clearRunSave();
    return false;
  },

  /** 恢复奇牌三选一界面 */
  restoreQipaiSelect() {
    if (!game.run) {
      this.renderTitle();
      return;
    }
    const next = this._qipaiNext || 'battle';
    // 无存档选项则重新抽
    if (!this.pendingQipaiChoices.length) {
      this.startQipaiSelect(next);
      return;
    }
    const firstPick = (game.run.stagesCleared || 0) === 0 && (game.run.qipai || []).length === 0;
    const mustPick = firstPick && next === 'battle';
    this._qipaiIsOpening = mustPick;
    this.selectedQipaiId = null;

    this.$('qipai-title').textContent = firstPick
      ? '开局奇牌 · 选择流派'
      : (next === 'battle' ? '破境奇缘 · 选一张强化' : '藏经阁奇缘 · 选一张');
    this.$('qipai-desc').textContent = firstPick
      ? '奇牌不进入手牌，作为本局被动规则。选好后开始论道。'
      : (next === 'battle'
        ? '选一张加入构筑后进入下一关，也可跳过。'
        : '选择一张奇牌加入构筑，或跳过。');

    const list = this.$('qipai-list');
    list.innerHTML = '';
    this.pendingQipaiChoices.forEach(q => {
      const div = document.createElement('div');
      div.className = 'qipai-card rarity-' + (q.rarity || 'common');
      div.style.borderLeftColor = RARITY_COLOR[q.rarity] || '#a0aec0';
      const frame = (typeof ASSETS !== 'undefined' && ASSETS.frameForRarity) ? ASSETS.frameForRarity(q.rarity) : '';
      const icon = (typeof ASSETS !== 'undefined' && ASSETS.qipaiIcon) ? ASSETS.qipaiIcon(q, true) : '';
      if (frame) div.style.backgroundImage = `linear-gradient(180deg,rgba(8,10,14,0.72),rgba(8,10,14,0.88)),url('${frame}')`;
      div.innerHTML = `
        ${icon ? `<span class="qipai-pick-icon" style="background-image:url('${icon}')"></span>` : ''}
        <span class="rarity" style="background:${RARITY_COLOR[q.rarity]}33;color:${RARITY_COLOR[q.rarity]}">${RARITY_LABEL[q.rarity]}</span>
        <div class="name" style="color:${q.rarity === 'legend' || q.rarity === 'cursed' ? RARITY_COLOR[q.rarity] : 'inherit'}">${q.name}</div>
        <div class="desc">${q.desc}</div>
      `;
      div.onclick = () => {
        list.querySelectorAll('.qipai-card').forEach(x => x.classList.remove('selected'));
        div.classList.add('selected');
        this.selectedQipaiId = q.id;
      };
      list.appendChild(div);
    });
    this.$('btn-skip-qipai').style.display = mustPick ? 'none' : 'inline-flex';
    this.showScreen('qipai');
    this.persistRun('qipai');
  },

  // ===== 标题 =====
  renderTitle() {
    game.refreshCharUnlocks();
    const setTxt = (id, v) => {
      const el = this.$(id);
      if (el) el.textContent = v;
    };
    setTxt('stat-games', game.meta.gamesPlayed || 0);
    setTxt('stat-yueli', game.availableYueli());
    setTxt('stat-best', game.meta.bestScore || 0);
    setTxt('stat-endless', game.meta.bestEndless || 0);

    const seen = (game.meta.seenQipai || []).length;
    const tip = this.$('title-progress-tip');
    if (tip) {
      const miles = Object.keys(game.meta.endlessMilestones || {}).length;
      const totalM = (typeof ENDLESS_MILESTONES !== 'undefined') ? ENDLESS_MILESTONES.length : 0;
      const ach = Object.keys(game.meta.achievements || {}).length;
      const achTotal = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS.length : 0;
      const games = game.meta.gamesPlayed || 0;
      if (games === 0) {
        tip.textContent = '初次论道建议：常道难度 · 沈惊寒。也可先点「新手引导」快速上手。';
      } else {
        tip.innerHTML = `
          <div>图鉴 ${seen}/${QIPAI_POOL.length} · 成就 ${ach}/${achTotal}</div>
          <div style="margin-top:4px">无尽里程碑 ${miles}/${totalM} · 奇遇 ${game.meta.eventCount || 0}</div>
        `;
      }
    }

    // 断点续玩入口
    const contBtn = this.$('btn-continue-run');
    if (contBtn && game.runSaveSummary) {
      const sum = game.runSaveSummary();
      if (sum) {
        contBtn.style.display = 'inline-flex';
        contBtn.textContent = sum.stage && String(sum.stage).startsWith('残局')
          ? `继续残局 · ${sum.stage} · ${sum.phaseLabel}`
          : `继续论道 · ${sum.charName} · ${sum.stage} · ${sum.phaseLabel}`;
      } else {
        contBtn.style.display = 'none';
      }
    }

    // 最近一局快捷再开
    const lastBtn = this.$('btn-retry-last');
    const setup = game.meta.lastRunSetup;
    if (lastBtn) {
      if (setup && setup.characterId) {
        const char = CHARACTERS.find(c => c.id === setup.characterId);
        const diff = DIFFICULTIES.find(d => d.id === setup.difficulty);
        lastBtn.style.display = 'inline-flex';
        lastBtn.textContent = `再开 · ${char?.name || '牌客'} / ${diff?.name || '常道'}`;
      } else {
        lastBtn.style.display = 'none';
      }
    }
    this.showScreen('title');
    // 首次进入：自动弹出欢迎引导
    if (game.isTutorialActive && game.isTutorialActive() && (game.meta.tutorialIndex || 0) === 0 && !this._guideWelcomed) {
      this._guideWelcomed = true;
      setTimeout(() => this.startTutorial(true), 500);
    } else if (game.isTutorialActive && game.isTutorialActive() && this._guideActive) {
      setTimeout(() => this.guideShowForScreen('title'), 280);
    }
  },

  retryLastSetup() {
    const setup = game.meta.lastRunSetup;
    if (!setup) {
      this.toast('还没有论道记录');
      return;
    }
    this.selectedMode = setup.mode || 'normal';
    this.selectedDifficulty = setup.difficulty || 'normal';
    this.selectedCharId = setup.characterId;
    this.sfx('click');
    game.startRun(setup.characterId, {
      mode: setup.mode || 'normal',
      difficulty: setup.difficulty || 'normal',
      retryBonus: true,
    });
    if (setup.mode === 'endless') {
      game.run.isEndless = true;
      game.run.endlessFloor = 1;
      game.run.realmIndex = 8;
    }
    this._stageQipaiKey = null;
    this.shopQipaiChoices = [];
    this.renderMap();
  },

  // ===== 残局论道 =====
  renderPuzzleSelect() {
    const grid = this.$('puzzle-grid');
    const summary = this.$('puzzle-summary');
    const desc = this.$('puzzle-desc');
    const pool = typeof PUZZLE_POOL !== 'undefined' ? PUZZLE_POOL : [];
    const cleared = game.puzzleClearedCount();
    const three = game.puzzleThreeStarCount();
    if (desc) desc.textContent = `已破 ${cleared}/${pool.length} · 三星 ${three} · 固定牌局短局解谜`;
    if (summary) {
      summary.innerHTML = `
        <div class="puzzle-sum-card"><span>已破</span><strong>${cleared}/${pool.length}</strong></div>
        <div class="puzzle-sum-card"><span>三星</span><strong>${three}</strong></div>
        <div class="puzzle-sum-card"><span>规则</span><strong>破境即胜</strong></div>
      `;
    }
    if (!grid) return;
    grid.innerHTML = '';
    pool.forEach((p, idx) => {
      const rec = game.getPuzzleRecord(p.id);
      const stars = rec?.stars || 0;
      const starStr = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
      const diffStars = '◆'.repeat(p.star || 1) + '◇'.repeat(Math.max(0, 3 - (p.star || 1)));
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'puzzle-card' + (stars > 0 ? ' is-cleared' : '') + (stars >= 3 ? ' is-perfect' : '');
      card.innerHTML = `
        <div class="puzzle-card-top">
          <span class="puzzle-idx">${String(idx + 1).padStart(2, '0')}</span>
          <span class="puzzle-diff" title="难度">${diffStars}</span>
        </div>
        <h4>${p.name}</h4>
        <p>${p.desc}</p>
        <div class="puzzle-card-foot">
          <span class="puzzle-stars" title="最佳评价">${starStr}</span>
          <span class="puzzle-meta">${stars
            ? `最佳 ${rec.bestRounds || '—'} 回 · 通关 ${rec.clears || 1} 次`
            : `首通阅历 +${p.yueliFirst || 20}`}</span>
        </div>
      `;
      card.onclick = () => this.startPuzzle(p.id);
      grid.appendChild(card);
    });
    this.showScreen('puzzle');
  },

  startPuzzle(puzzleId) {
    // 残局会覆盖当前断点：有正传/无尽进行中时先确认
    if (game.run && !game.run.isPuzzle) {
      const ok = confirm('开始残局将覆盖当前论道断点（可先从标题继续论道）。是否继续？');
      if (!ok) return;
    }
    if (typeof game.abandonRun === 'function') game.abandonRun();
    const res = game.startPuzzle(puzzleId);
    if (!res?.ok) {
      this.toast(res?.reason || '无法开始残局');
      return;
    }
    this.sfx('click');
    this._battleGen = (this._battleGen || 0) + 1;
    this.aiThinking = false;
    this.animating = false;
    this.showScreen('battle');
    this.renderBattle();
    this.toast(`残局·${res.puzzle.name}`, 1400);
  },

  // ===== 模式难度 =====
  renderModeSelect(mode = 'normal') {
    this.selectedMode = mode;
    this.selectedDifficulty = this.selectedDifficulty || 'normal';
    this._importBuild = null;
    const desc = this.$('mode-desc');
    if (mode === 'endless') desc.textContent = '无尽论道：直接进入叠层挑战，冲最高层数';
    else if (mode === 'daily') desc.textContent = '每日挑战：完成后额外阅历（一天一次加成）';
    else if (mode === 'weekly') {
      const w = getWeeklyChallenge();
      desc.textContent = `本周禁宗【${w.challenge.name}】：${w.challenge.desc}`;
    } else desc.textContent = '正传论道：八境 × 明/暗/宗主，通关后进入无尽';

    // 每日横幅
    const shell = document.querySelector('#screen-mode .content-shell');
    if (shell && typeof ASSETS !== 'undefined') {
      let banner = shell.querySelector('.mode-extra-banner');
      if (mode === 'daily') {
        if (!banner) {
          banner = document.createElement('div');
          banner.className = 'mode-extra-banner weekly-banner';
          shell.insertBefore(banner, shell.querySelector('.mode-grid'));
        }
        banner.style.display = 'block';
        banner.style.backgroundImage = `url('${ASSETS.ui.dailyBanner}')`;
      } else if (banner) {
        banner.style.display = 'none';
      }
    }

    const grid = this.$('mode-grid');
    grid.innerHTML = '';
    DIFFICULTIES.forEach(d => {
      const locked = game.meta.totalYueli < d.unlockYueli;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'mode-card' + (locked ? ' locked' : '') + (this.selectedDifficulty === d.id ? ' selected' : '');
      const icon = (typeof ASSETS !== 'undefined' && ASSETS.diffIcon)
        ? ASSETS.diffIcon(mode === 'endless' ? 'endless' : d.id)
        : '';
      card.innerHTML = `
        <div class="mode-card-head">
          ${icon ? `<span class="mode-diff-icon" style="background-image:url('${icon}')"></span>` : ''}
          <h4>${d.name}</h4>
        </div>
        <p>${d.desc}</p>
        <span class="tag">${locked ? `需累计阅历 ${d.unlockYueli}` : `门槛×${d.mult} · 奖励×${d.reward}`}</span>
      `;
      if (!locked) {
        card.onclick = () => {
          this.selectedDifficulty = d.id;
          this.renderModeSelect(mode);
        };
      }
      grid.appendChild(card);
    });
    this.showScreen('mode');
  },

  // ===== 角色 =====
  renderCharSelect() {
    game.refreshCharUnlocks();
    const grid = this.$('char-grid');
    grid.innerHTML = '';
    this.selectedCharId = null;

    CHARACTERS.forEach(c => {
      const unlocked = game.isCharUnlocked(c.id);
      const mastery = game.meta.charMastery[c.id] || 0;
      const div = document.createElement('div');
      div.className = 'char-card' + (unlocked ? '' : ' locked');
      div.style.setProperty('--char-color', c.color);
      const portrait = (typeof ASSETS !== 'undefined' && ASSETS.charPortrait)
        ? ASSETS.charPortrait(c.id)
        : '';
      const sectIcon = (typeof ASSETS !== 'undefined' && ASSETS.sectIcon)
        ? ASSETS.sectIcon(c.sect)
        : '';
      div.innerHTML = `
        <div class="char-portrait" style="background-image:url('${portrait}')">
          ${sectIcon ? `<span class="char-sect-badge" style="background-image:url('${sectIcon}')" title="${c.sect}"></span>` : ''}
        </div>
        <div class="char-body">
          <div class="char-name">${c.name}${unlocked ? '' : ' 🔒'}</div>
          <div class="char-sect">${c.sect} · ${c.role}${mastery ? ` · 精通${mastery}` : ''}</div>
          <div class="char-skill"><b>${c.skill}</b>：${unlocked ? c.skillDesc : `累计阅历 ${c.unlockYueli || 0} 解锁`}</div>
        </div>
      `;
      if (unlocked) {
        div.onclick = () => {
          grid.querySelectorAll('.char-card').forEach(x => x.classList.remove('selected'));
          div.classList.add('selected');
          this.selectedCharId = c.id;
        };
      }
      grid.appendChild(div);
    });

    const first = CHARACTERS.find(c => game.isCharUnlocked(c.id));
    if (first) {
      this.selectedCharId = first.id;
      const cards = grid.querySelectorAll('.char-card:not(.locked)');
      if (cards[0]) cards[0].classList.add('selected');
    }
    this.showScreen('char');
  },

  confirmChar() {
    if (!this.selectedCharId) {
      this.toast('请选择牌客');
      return;
    }
    this.sfx('click');
    game.startRun(this.selectedCharId, {
      mode: this.selectedMode || 'normal',
      difficulty: this.selectedDifficulty || 'normal',
      importBuild: this._importBuild || null,
    });
    if (this.selectedMode === 'endless') {
      game.run.isEndless = true;
      game.run.endlessFloor = 1;
      game.run.realmIndex = 8;
    }
    if (this._importBuild) {
      this.toast('已载入分享构筑');
      this._importBuild = null;
    }
    this.renderMap();
  },

  // ===== 论道地图 =====
  renderMap() {
    const path = this.$('map-path');
    path.innerHTML = '';
    const run = game.run;
    const diff = run.difficulty;

    this.$('map-char').textContent = `${run.character.name} · ${diff.name} · 顿悟 ${run.dunwu}` +
      (run.isEndless ? ` · 无尽${run.endlessFloor || 1}层` : '');
    this.$('map-qipai').textContent = run.qipai.length
      ? '奇牌：' + run.qipai.map(q => q.name).join('、')
      : '奇牌：无';

    if (run.isEndless) {
      const info = game.getCurrentStage();
      const st = info.stage;
      const div = document.createElement('div');
      div.className = 'map-realm current';
      div.innerHTML = `
        <h3>无尽论道 · 第 ${run.endlessFloor || 1} 层</h3>
        <div class="map-stages">
          <div class="map-stage current">${st.name}<br><small>门槛 ${st.threshold}</small></div>
          <div class="map-stage">词条<br><small>${(st.modifierNames || []).join('、') || '无'}</small></div>
          <div class="map-stage">纪录<br><small>历史最高 ${game.meta.bestEndless || 0} 层</small></div>
        </div>`;
      path.appendChild(div);
    } else {
      REALM_THRESHOLDS.forEach((realm, ri) => {
        const div = document.createElement('div');
        let cls = 'map-realm';
        if (ri < run.realmIndex) cls += ' done';
        else if (ri === run.realmIndex) cls += ' current';
        div.className = cls;

        const stagesHtml = realm.stages.map((st, si) => {
          let sc = 'map-stage';
          let tag = '';
          if (ri < run.realmIndex || (ri === run.realmIndex && si < run.stageIndex)) {
            sc += ' done';
            tag = '<em class="stage-tag">已破</em>';
          } else if (ri === run.realmIndex && si === run.stageIndex) {
            sc += ' current';
            tag = '<em class="stage-tag now">当前</em>';
          } else {
            tag = '<em class="stage-tag">未至</em>';
          }
          const th = Math.floor(st.threshold * diff.mult);
          const typeLabel = st.type === 'zong' ? '宗主' : st.type === 'an' ? '暗局' : '明局';
          return `<div class="${sc}"><div class="stage-row"><span>${st.name}</span>${tag}</div><small>${typeLabel} · 门槛 ${th}</small></div>`;
        }).join('');

        div.innerHTML = `<h3>${realm.name}</h3><div class="map-stages">${stagesHtml}</div>`;
        path.appendChild(div);
      });
    }

    this.showScreen('map');
    this.persistRun('map');
  },

  // ===== 奇牌三选一 =====
  /**
   * @param {boolean|string} nextOrOpening true=开战 / false=回商店 / 'battle'|'shop'|'map'
   */
  startQipaiSelect(nextOrOpening = true) {
    if (!game.run) {
      this.renderTitle();
      return;
    }
    let next = 'battle';
    if (nextOrOpening === false) next = 'shop';
    else if (nextOrOpening === true) next = 'battle';
    else if (typeof nextOrOpening === 'string') next = nextOrOpening;
    this._qipaiNext = next;

    const count = game.getQipaiChoiceCount();
    const preferCursed = !!(game.run.character?.passive?.type === 'cursed_boost')
      || !!game.battle?.boss?.cursedBoost;
    this.pendingQipaiChoices = game.pickQipaiForRun(count, preferCursed);
    this.selectedQipaiId = null;

    const firstPick = (game.run.stagesCleared || 0) === 0 && (game.run.qipai || []).length === 0;
    const mustPick = firstPick && next === 'battle';
    this._qipaiIsOpening = mustPick;

    this.$('qipai-title').textContent = firstPick
      ? '开局奇牌 · 选择流派'
      : (next === 'battle' ? '破境奇缘 · 选一张强化' : '藏经阁奇缘 · 选一张');
    this.$('qipai-desc').textContent = firstPick
      ? '奇牌不进入手牌，作为本局被动规则。选好后开始论道。'
      : (next === 'battle'
        ? '选一张加入构筑后进入下一关，也可跳过。'
        : '选择一张奇牌加入构筑，或跳过。');

    const list = this.$('qipai-list');
    list.innerHTML = '';
    this.pendingQipaiChoices.forEach(q => {
      const div = document.createElement('div');
      div.className = 'qipai-card rarity-' + (q.rarity || 'common');
      div.style.borderLeftColor = RARITY_COLOR[q.rarity] || '#a0aec0';
      const frame = (typeof ASSETS !== 'undefined' && ASSETS.frameForRarity) ? ASSETS.frameForRarity(q.rarity) : '';
      const icon = (typeof ASSETS !== 'undefined' && ASSETS.qipaiIcon) ? ASSETS.qipaiIcon(q, true) : '';
      if (frame) div.style.backgroundImage = `linear-gradient(180deg,rgba(8,10,14,0.72),rgba(8,10,14,0.88)),url('${frame}')`;
      div.innerHTML = `
        ${icon ? `<span class="qipai-pick-icon" style="background-image:url('${icon}')"></span>` : ''}
        <span class="rarity" style="background:${RARITY_COLOR[q.rarity]}33;color:${RARITY_COLOR[q.rarity]}">${RARITY_LABEL[q.rarity]}</span>
        <div class="name" style="color:${q.rarity === 'legend' || q.rarity === 'cursed' ? RARITY_COLOR[q.rarity] : 'inherit'}">${q.name}</div>
        <div class="desc">${q.desc}</div>
      `;
      div.onclick = () => {
        list.querySelectorAll('.qipai-card').forEach(x => x.classList.remove('selected'));
        div.classList.add('selected');
        this.selectedQipaiId = q.id;
      };
      list.appendChild(div);
    });

    this.$('btn-skip-qipai').style.display = mustPick ? 'none' : 'inline-flex';
    this.showScreen('qipai');
    this.persistRun('qipai');
  },

  routeAfterQipai() {
    const next = this._qipaiNext || 'battle';
    this.selectedQipaiId = null;
    if (next === 'shop') this.renderShop(!!this._shopAfterWin);
    else if (next === 'map') this.renderMap();
    else this.enterBattle();
  },

  confirmQipai() {
    if (!this.selectedQipaiId) {
      this.toast('请选择一张奇牌');
      return;
    }
    if (!game.run) {
      this.toast('论道未开始');
      return;
    }
    const q = QIPAI_POOL.find(x => x.id === this.selectedQipaiId);
    if (q && !game.run.qipai.some(x => x.id === q.id)) {
      game.run.qipai.push(q);
      if (q.id === 'duanwei') game.run.duanweiLi = 12;
      game.markSeenQipai([q]);
      game.save();
      this.toast(`获得奇牌【${q.name}】`);
    }
    this.routeAfterQipai();
  },

  skipQipai() {
    if (this._qipaiIsOpening) {
      this.toast('开局请先选择一张奇牌');
      return;
    }
    this.routeAfterQipai();
  },

  // ===== 进入战斗 =====
  enterBattle() {
    // 作废进行中的 AI 回合定时器，防止退出/重开后串局
    this._battleGen = (this._battleGen || 0) + 1;
    this.aiThinking = false;
    this.animating = false;
    this._hintCardIds = null;
    this._lastPlayerScore = null;
    this._lastEnemyScore = null;
    this._lastEnemyHandCount = null;
    game.startBattle();
    if (!game.battle) {
      this.toast('无法进入论道');
      this.renderTitle();
      return;
    }
    if (game.meta.tutorialStep < 6) {
      game.meta.tutorialStep = Math.min(6, game.meta.tutorialStep + 1);
      game.save();
    }
    this.renderBattle();
    this.showScreen('battle');
    this.persistRun('battle');
    // 开局手牌轻入场（只动透明度，避免干扰扇形 transform）
    requestAnimationFrame(() => {
      document.querySelectorAll('.hand-cards .card').forEach((node, i) => {
        node.style.opacity = '0';
        setTimeout(() => {
          node.style.transition = 'opacity 0.2s ease';
          node.style.opacity = '1';
          setTimeout(() => {
            node.style.transition = '';
            node.style.opacity = '';
          }, 220);
        }, 16 + i * 16);
      });
    });
    // 新手轻提示（仅前几局）
    this.showCoachTip();
  },

  showCoachTip() {
    // 由完整引导替代；未完成引导时进入战斗自动推进到 battle 步骤
    if (game.isTutorialActive && game.isTutorialActive()) {
      setTimeout(() => this.guideShowForScreen('battle'), 380);
      return;
    }
    const games = game.meta.gamesPlayed || 0;
    if (games > 3) return;
    const b = game.battle;
    if (!b || this._coachShownFor === b) return;
    this._coachShownFor = b;
    setTimeout(() => this.toast('点牌成组 → 出牌冲分达到门槛即破境', 2800), 400);
  },

  // ========== 新手引导 ==========
  startTutorial(fromStart = true) {
    if (typeof TUTORIAL_STEPS === 'undefined' || !TUTORIAL_STEPS.length) {
      this.toast('暂无引导内容');
      return;
    }
    // 已完成过 / 玩过几局：纸面速览（不必再开一局）
    const wasDone = !!game.meta.tutorialDone;
    const played = game.meta.gamesPlayed || 0;
    this._guidePaperMode = wasDone || played >= 1;
    game.resetTutorial();
    this._guideActive = true;
    this._guideWait = null;
    this._guideDidPlay = false;
    this._guidePaused = false;
    if (this.screen !== 'title' && fromStart) {
      this.renderTitle();
    }
    this.guideShowStep(0);
  },

  guideHide(keepActive = false) {
    const ov = this.$('guide-overlay');
    if (ov) ov.classList.remove('show');
    if (!keepActive) this._guideActive = false;
    this._guideWait = null;
    document.querySelectorAll('.guide-target').forEach(el => el.classList.remove('guide-target'));
    const hole = this.$('guide-hole');
    if (hole) hole.style.display = 'none';
  },

  guideSkip() {
    game.completeTutorial();
    this._guidePaused = false;
    this._guidePaperMode = false;
    this.guideHide(false);
    this.toast('已跳过教学，可随时点「新手引导」重看');
  },

  /** 是否可用真实高亮（当前屏匹配且 DOM 存在） */
  guideCanSpotlight(step) {
    if (!step || !step.highlight) return false;
    if (step.when && step.when !== 'any' && step.when !== this.screen) return false;
    const el = document.querySelector(step.highlight);
    if (!el) return false;
    const r = el.getClientRects();
    return r.length > 0 && r[0].width > 1 && r[0].height > 1;
  },

  guideShowStep(index) {
    const steps = typeof TUTORIAL_STEPS !== 'undefined' ? TUTORIAL_STEPS : [];
    if (!steps.length) return;
    if (index >= steps.length) {
      game.completeTutorial();
      this.guideHide(false);
      this.toast('入门完成！开始你的论道吧');
      return;
    }
    const step = steps[index];
    game.setTutorialIndex(index);
    this._guideActive = true;
    this._guidePaused = false;
    const paper = !!this._guidePaperMode;
    // 纸面模式不强制互动练习
    this._guideWait = (!paper && step.waitAction) ? step.waitAction : null;
    if (step.waitAction === 'play') this._guideDidPlay = false;

    // 仅在目标界面已就绪时跳转；否则走纸面说明（重看）或等待续播
    if (step.when && step.when !== this.screen && step.when !== 'any') {
      if (step.when === 'title') {
        // 避免 renderTitle 递归再弹引导
        this.showScreen('title');
      } else if (step.when === 'battle' && game.battle) {
        this.showScreen('battle');
        this.renderBattle();
      } else if (step.when === 'shop' && game.run && this.screen !== 'shop') {
        // 不在战斗中途强开商店；仅当已在 shop 流程由 renderShop 触发
      } else if (step.when === 'map' && game.run) {
        this.renderMap();
      }
    }

    const ov = this.$('guide-overlay');
    const card = this.$('guide-card');
    const title = this.$('guide-title');
    const body = this.$('guide-body');
    const prog = this.$('guide-progress');
    const hint = this.$('guide-hint');
    const hintText = this.$('guide-hint-text');
    const nextBtn = this.$('guide-next');
    const iconEl = this.$('guide-icon');
    const badgeEl = this.$('guide-badge');
    if (!ov || !card) return;

    if (title) title.textContent = step.title || '';
    if (body) body.innerHTML = step.body || '';
    if (prog) prog.textContent = `第 ${index + 1} 步 · 共 ${steps.length} 步`;
    if (badgeEl) badgeEl.textContent = step.badge || '指引';

    // 步骤图标
    if (iconEl) {
      let src = '';
      if (typeof ASSETS !== 'undefined' && ASSETS.ui) {
        if (step.icon === 'guideSeal') src = ASSETS.ui.guideSeal;
        else if (step.icon && ASSETS.ui[step.icon]) src = ASSETS.ui[step.icon];
        else src = ASSETS.ui.guideMentor || ASSETS.ui.guideSeal || '';
      }
      if (!src && step.icon) {
        const map = {
          guideMentor: 'assets/ui/guide/icon_mentor.jpg',
          guideScore: 'assets/ui/guide/icon_score.jpg',
          guideHand: 'assets/ui/guide/icon_hand.jpg',
          guidePlay: 'assets/ui/guide/icon_play.jpg',
          guideShop: 'assets/ui/guide/icon_shop.jpg',
          guideSeal: 'assets/ui/guide/seal.jpg',
        };
        src = map[step.icon] || 'assets/ui/guide/icon_mentor.jpg';
      }
      iconEl.style.backgroundImage = src ? `url('${src}')` : '';
    }

    // 进度点
    const dots = this.$('guide-dots');
    if (dots) {
      dots.innerHTML = steps.map((_, i) => {
        const cls = i < index ? 'done' : (i === index ? 'current' : '');
        return `<span class="guide-dot ${cls}"></span>`;
      }).join('');
    }

    const canSpot = this.guideCanSpotlight(step);
    const setHint = (text) => {
      if (!hint) return;
      if (text) {
        hint.style.display = 'flex';
        if (hintText) hintText.textContent = text;
        else hint.textContent = text;
      } else {
        hint.style.display = 'none';
        if (hintText) hintText.textContent = '';
      }
    };
    if (!paper && step.waitAction === 'select' && canSpot) {
      setHint('请点选一张手牌成组，再点「下一步」');
    } else if (!paper && step.waitAction === 'play' && canSpot) {
      setHint('选好牌后点「出牌」（或空格），成功出牌后点「下一步」');
    } else if (paper && step.when !== 'title' && step.when !== this.screen) {
      setHint('速览模式：阅读后点下一步即可（实战高亮需开一局）');
    } else {
      setHint('');
    }
    if (nextBtn) {
      nextBtn.textContent = index >= steps.length - 1 ? '完成入门' : '下一步';
      nextBtn.disabled = false;
      nextBtn.classList.remove('guide-pulse-btn');
    }

    document.querySelectorAll('.guide-target').forEach(el => el.classList.remove('guide-target'));
    const hole = this.$('guide-hole');
    if (hole) hole.style.display = 'none';

    // 先显示再量尺寸，保证居中
    ov.classList.add('show');
    this.guideCenterCard();
    requestAnimationFrame(() => {
      this.guidePlaceHighlight(step);
      this.guidePlaceCard(step);
    });
  },

  /** 强制屏幕正中（像素 + 百分比双保险） */
  guideCenterCard() {
    const card = this.$('guide-card');
    if (!card) return;
    card.classList.remove('place-top', 'place-bottom', 'place-right', 'place-center');
    card.classList.add('place-center');
    card.style.left = '50%';
    card.style.top = '50%';
    card.style.right = 'auto';
    card.style.bottom = 'auto';
    card.style.transform = 'translate(-50%, -50%)';
  },

  guidePlaceHighlight(step) {
    const hole = this.$('guide-hole');
    if (!hole) return;
    if (!this.guideCanSpotlight(step)) {
      hole.style.display = 'none';
      return;
    }
    const el = document.querySelector(step.highlight);
    if (!el) {
      hole.style.display = 'none';
      return;
    }
    el.classList.add('guide-target');
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) {
      hole.style.display = 'none';
      return;
    }
    const pad = 8;
    hole.style.display = 'block';
    hole.style.left = `${Math.max(4, r.left - pad)}px`;
    hole.style.top = `${Math.max(4, r.top - pad)}px`;
    hole.style.width = `${r.width + pad * 2}px`;
    hole.style.height = `${r.height + pad * 2}px`;
  },

  guidePlaceCard(step) {
    const card = this.$('guide-card');
    if (!card) return;
    const place = step.placement || 'center';
    const canSpot = this.guideCanSpotlight(step);

    // 无高亮 / 居中步骤：始终屏幕中央
    if (!canSpot || !step.highlight || place === 'center') {
      this.guideCenterCard();
      return;
    }

    const el = document.querySelector(step.highlight);
    if (!el) {
      this.guideCenterCard();
      return;
    }

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const margin = 12;
    // 先居中测真实高度
    this.guideCenterCard();
    const cardW = Math.min(card.offsetWidth || 400, vw - margin * 2);
    const cardH = Math.min(card.offsetHeight || 220, vh - margin * 2);

    let left = 0;
    let top = 0;
    let transform = 'translate(0, 0)';

    if (place === 'top') {
      // 贴在目标上方，水平居中对齐目标
      left = r.left + r.width / 2;
      top = r.top - 14;
      transform = 'translate(-50%, -100%)';
      // 上方空间不够则放到目标下方
      if (top - cardH < margin) {
        top = r.bottom + 14;
        transform = 'translate(-50%, 0)';
      }
      // 水平夹取
      left = Math.min(vw - margin - cardW / 2, Math.max(margin + cardW / 2, left));
      // 垂直夹取（按 transform 语义）
      if (transform.includes('-100%')) {
        top = Math.min(vh - margin, Math.max(margin + cardH, top));
      } else {
        top = Math.min(vh - margin - cardH, Math.max(margin, top));
      }
    } else if (place === 'right') {
      left = r.right + 16;
      top = r.top + r.height / 2 - cardH / 2;
      transform = 'translate(0, 0)';
      // 右侧不够则左侧
      if (left + cardW > vw - margin) {
        left = r.left - 16 - cardW;
      }
      left = Math.min(vw - margin - cardW, Math.max(margin, left));
      top = Math.min(vh - margin - cardH, Math.max(margin, top));
    } else {
      // bottom / default：目标下方
      left = r.left + r.width / 2;
      top = r.bottom + 14;
      transform = 'translate(-50%, 0)';
      if (top + cardH > vh - margin) {
        top = r.top - 14;
        transform = 'translate(-50%, -100%)';
      }
      left = Math.min(vw - margin - cardW / 2, Math.max(margin + cardW / 2, left));
      if (transform.includes('-100%')) {
        top = Math.min(vh - margin, Math.max(margin + cardH, top));
      } else {
        top = Math.min(vh - margin - cardH, Math.max(margin, top));
      }
    }

    // 若仍可能出屏，回退居中
    if (!Number.isFinite(left) || !Number.isFinite(top) || cardW < 40) {
      this.guideCenterCard();
      return;
    }

    card.classList.remove('place-top', 'place-bottom', 'place-right', 'place-center');
    card.classList.add('place-' + place);
    card.style.right = 'auto';
    card.style.bottom = 'auto';
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    card.style.transform = transform;
  },

  /** 暂停引导，保留进度，稍后在目标界面续播 */
  guidePauseForScreen(nextWhen, message) {
    this.guideHide(true);
    this._guideActive = true;
    this._guidePaused = true;
    if (message) this.toast(message, 3200);
  },

  guideNext() {
    if (!this._guideActive && !this._guidePaused) return;
    const idx = game.meta.tutorialIndex || 0;
    const steps = TUTORIAL_STEPS || [];
    const step = steps[idx];
    const paper = !!this._guidePaperMode;

    // 实战练习校验（纸面模式跳过）
    if (!paper && step?.waitAction === 'select' && this.guideCanSpotlight(step)) {
      const n = game.battle?.selectedIds?.size || 0;
      if (n <= 0) {
        this.toast('请先点选一张手牌');
        this.shake(this.$('hand-area') || this.$('hand-cards'));
        return;
      }
    }
    if (!paper && step?.waitAction === 'play' && this.guideCanSpotlight(step)) {
      if (!this._guideDidPlay) {
        this.toast('请先成功出一次牌');
        this.shake(this.$('btn-play'));
        return;
      }
    }

    // 欢迎步：首次实战路径 → 引导开战；纸面模式直接翻页
    if (step?.id === 'welcome' && !paper) {
      game.setTutorialIndex(idx + 1);
      this.guidePauseForScreen('battle', '请点「开始论道」→ 常道 → 选牌客，战斗中将继续教学');
      const btn = this.$('btn-start');
      if (btn) {
        btn.classList.add('guide-pulse-btn');
        setTimeout(() => btn.classList.remove('guide-pulse-btn'), 5000);
      }
      return;
    }

    if (step?.id === 'done' || idx >= steps.length - 1) {
      game.completeTutorial();
      this._guidePaused = false;
      this._guidePaperMode = false;
      this.guideHide(false);
      this.toast('入门完成！');
      if (this.screen !== 'title') this.renderTitle();
      return;
    }

    const nextIdx = idx + 1;
    const next = steps[nextIdx];
    this._guideDidPlay = false;

    // 跨屏：不强制跳界面，暂停到自然进入时续播
    if (next && next.when && next.when !== 'any' && next.when !== this.screen && !paper) {
      if (next.when === 'shop' && this.screen === 'battle') {
        game.setTutorialIndex(nextIdx);
        this.guidePauseForScreen('shop', '先破境这一关，藏经阁里会继续教学');
        return;
      }
      if (next.when === 'title' && (this.screen === 'shop' || this.screen === 'battle' || this.screen === 'map')) {
        game.setTutorialIndex(nextIdx);
        this.guidePauseForScreen('title', '返回标题后还有两步长线介绍');
        return;
      }
      if (next.when === 'battle' && this.screen === 'title' && !game.battle) {
        game.setTutorialIndex(nextIdx);
        this.guidePauseForScreen('battle', '开始一局论道后，教学将在战斗中继续');
        const btn = this.$('btn-start');
        if (btn) {
          btn.classList.add('guide-pulse-btn');
          setTimeout(() => btn.classList.remove('guide-pulse-btn'), 5000);
        }
        return;
      }
    }

    this.guideShowStep(nextIdx);
  },

  /** 当前屏若有未完成引导步骤则显示 */
  guideShowForScreen(screenName) {
    if (!game.isTutorialActive || !game.isTutorialActive()) return;
    const steps = TUTORIAL_STEPS || [];
    let idx = game.meta.tutorialIndex || 0;

    // 进入关键界面时唤醒暂停的引导
    if (screenName === 'battle' || screenName === 'shop' || screenName === 'map' || screenName === 'title') {
      if (this._guidePaused || this._guideActive) this._guideActive = true;
    }
    // 首次实战路径：进战斗时即使还没点过引导也要接上（index 已在 welcome 后）
    if (screenName === 'battle' && game.isTutorialActive()) {
      this._guideActive = true;
    }
    if (screenName === 'shop' && game.isTutorialActive()) {
      this._guideActive = true;
    }
    if (!this._guideActive) return;

    // 对齐到当前界面应显示的步骤
    while (idx < steps.length) {
      const w = steps[idx].when;
      if (w === screenName || w === 'any') break;
      if (screenName === 'battle' && w === 'title') { idx++; continue; }
      if (screenName === 'shop' && (w === 'title' || w === 'battle' || w === 'map')) { idx++; continue; }
      if (screenName === 'map' && (w === 'title' || w === 'battle')) { idx++; continue; }
      if (screenName === 'title' && (w === 'battle' || w === 'shop' || w === 'map')) { idx++; continue; }
      break;
    }
    if (idx < steps.length && (steps[idx].when === screenName || steps[idx].when === 'any')) {
      this._guidePaused = false;
      this.guideShowStep(idx);
    }
  },

  guideNotifySelect() {
    if (!this._guideActive || this._guideWait !== 'select') return;
    const hint = this.$('guide-hint');
    const hintText = this.$('guide-hint-text');
    if (hint) {
      hint.style.display = 'flex';
      const msg = '很好！已成组。可点「下一步」，或直接出牌。';
      if (hintText) hintText.textContent = msg;
      else hint.textContent = msg;
    }
    const nextBtn = this.$('guide-next');
    if (nextBtn) nextBtn.classList.add('guide-pulse-btn');
  },

  guideNotifyPlay() {
    if (!this._guideActive) return;
    this._guideDidPlay = true;
    if (this._guideWait === 'play') {
      const hint = this.$('guide-hint');
      const hintText = this.$('guide-hint-text');
      if (hint) {
        hint.style.display = 'flex';
        const msg = '出牌成功！点「下一步」继续。';
        if (hintText) hintText.textContent = msg;
        else hint.textContent = msg;
      }
      const nextBtn = this.$('guide-next');
      if (nextBtn) nextBtn.classList.add('guide-pulse-btn');
    }
  },

  startFromMap() {
    if (!game.run) {
      this.renderTitle();
      return;
    }
    // 第1局教程：直接开战（无奇牌/机关）
    const firstBattle = game.run.stagesCleared === 0 && game.run.qipai.length === 0;
    const tutorialPlain = game.meta.tutorialStep === 0 && firstBattle;
    if (tutorialPlain) {
      this.enterBattle();
      return;
    }
    // 无奇牌：强制选一张再战
    if (game.run.qipai.length === 0) {
      this.startQipaiSelect('battle');
      return;
    }
    // 已有构筑：每关开战前给一次可跳过的奇缘（避免反复刷可关掉：同 stage 只弹一次）
    const key = `${game.run.realmIndex}-${game.run.stageIndex}-${game.run.endlessFloor || 0}`;
    if (this._stageQipaiKey !== key) {
      this._stageQipaiKey = key;
      this.startQipaiSelect('battle');
      return;
    }
    this.enterBattle();
  },

  // ===== 战斗渲染 =====
  renderBattle() {
    const b = game.battle;
    if (!b || !game.run) return;

    // 分数变化时跳动
    if (this._lastPlayerScore != null && b.playerScore !== this._lastPlayerScore) {
      this.bumpScore('player');
    }
    if (this._lastEnemyScore != null && b.enemyScore !== this._lastEnemyScore) {
      this.bumpScore('enemy');
    }
    this._lastPlayerScore = b.playerScore;
    this._lastEnemyScore = b.enemyScore;

    const info = game.getCurrentStage();
    this.$('battle-stage').textContent = `${b.realmName} · ${b.stageName}`;
    const charEl = this.$('battle-char');
    const char = game.run.character;
    const pUrl = (typeof ASSETS !== 'undefined') ? ASSETS.charPortrait(char.id) : '';
    charEl.innerHTML = `<span class="battle-char-portrait" style="background-image:url('${pUrl}')"></span><span>${char.name}</span>`;
    charEl.style.display = 'flex';
    charEl.style.alignItems = 'center';
    charEl.style.gap = '8px';

    // 破境竞速 + 资源
    game.refreshBattleDynamics?.();
    const hud = game.getBattleHud ? game.getBattleHud() : null;
    const pp = Math.min(100, (b.playerScore / Math.max(1, b.threshold)) * 100);
    const enemyPct = Math.min(100, (b.enemyScore / Math.max(1, b.enemyThreshold)) * 100);
    const barP = this.$('bar-player');
    const barE = this.$('bar-enemy');
    if (barP) {
      barP.style.width = pp + '%';
      barP.classList.toggle('near-clear', !!(hud && hud.nearClear));
    }
    if (barE) {
      barE.style.width = enemyPct + '%';
      barE.classList.toggle('threat-high', !!(hud && hud.threat === 'high'));
      barE.classList.toggle('threat-mid', !!(hud && hud.threat === 'mid'));
    }
    const sp = this.$('score-player');
    const se = this.$('score-enemy');
    if (sp) sp.textContent = `${b.playerScore} / ${b.threshold}`;
    if (se) se.textContent = `${b.enemyScore} / ${b.enemyThreshold}`;

    const need = hud ? hud.need : game.scoreToClear();
    const tipP = this.$('race-tip-player');
    const tipE = this.$('race-tip-enemy');
    if (tipP) {
      tipP.className = 'race-tip';
      if (b.playerScore >= b.threshold) {
        tipP.textContent = '已破境！';
        tipP.classList.add('is-lead');
      } else if (need > 0 && need <= Math.max(120, b.threshold * 0.12)) {
        tipP.textContent = `再得 ${need} 分即可破境`;
        tipP.classList.add('is-near');
      } else if (pp >= enemyPct) {
        tipP.textContent = `进度 ${pp.toFixed(0)}% · 暂时领先`;
        tipP.classList.add('is-lead');
      } else {
        tipP.textContent = `进度 ${pp.toFixed(0)}% · 继续冲分`;
      }
    }
    if (tipE) {
      tipE.className = 'race-tip';
      const eNeed = Math.max(0, b.enemyThreshold - b.enemyScore);
      if (b.enemyScore >= b.enemyThreshold) {
        tipE.textContent = '守关者已破境';
        tipE.classList.add('is-danger');
      } else if (hud && hud.threat === 'high') {
        tipE.textContent = `仅差 ${eNeed} · 局势危急`;
        tipE.classList.add('is-danger');
      } else if (hud && hud.threat === 'mid') {
        tipE.textContent = `还差 ${eNeed} · 注意防守`;
        tipE.classList.add('is-near');
      } else {
        tipE.textContent = `进度 ${enemyPct.toFixed(0)}% · 还差 ${eNeed}`;
      }
    }

    const isPlayer = b.turn === 'player' && b.status === 'playing' && !this.aiThinking && !this.animating;
    const zongTokens = game.run.zongshiTokens || 0;
    const zongArmed = !!b.zongshiArmed;
    const chain = b.playerChain || 0;
    const free = !!(b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy');
    const softLeft = hud ? hud.softLeft : ((b.maxSoftRound || 24) - b.round);
    const nextQi = hud ? hud.nextQi : 0;
    const xinmoCap = b.xinmoCap || 5;
    const xinmoPct = Math.min(100, (b.xinmo / xinmoCap) * 100);

    // 资源格：一眼能懂的核心数值
    const res = this.$('resource-grid');
    if (res) {
      const xinWarn = b.xinmo >= xinmoCap - 1;
      res.innerHTML = `
        <div class="res-cell${xinWarn ? ' is-warn' : ''}" title="心魔过高会冻结手牌或抬高门槛；连续过牌会上涨">
          <span class="res-label">心魔</span>
          <span class="res-value">${b.xinmo} / ${xinmoCap}</span>
          <div class="res-bar"><i style="width:${xinmoPct}%"></i></div>
        </div>
        <div class="res-cell${(b.jiguanTokens || 0) > 0 ? ' is-good' : ''}" title="发动部分机关时消耗">
          <span class="res-label">机关令</span>
          <span class="res-value">${b.jiguanTokens || 0}</span>
        </div>
        <div class="res-cell${zongTokens > 0 || zongArmed ? ' is-good' : ''}" title="蓄势后下一手得分提高">
          <span class="res-label">宗势令</span>
          <span class="res-value">${zongArmed ? '蓄势中' : zongTokens}</span>
        </div>
        <div class="res-cell${softLeft <= 5 ? ' is-warn' : ''}" title="回合耗尽后守关者会持续涨势">
          <span class="res-label">回合</span>
          <span class="res-value">${b.round} / ${b.maxSoftRound || 24}</span>
        </div>
      `;
    }

    // 情境提示：只显示当下有用的
    const chips = this.$('battle-chips');
    if (chips) {
      const suit = SUITS.find(s => s.id === b.tianmingSuit);
      const tips = [];
      if (b.tianmingHidden) {
        tips.push('<span class="chip gold">天命未明</span>');
      } else if (suit) {
        const suitIcon = (typeof ASSETS !== 'undefined') ? ASSETS.suitIcon(suit.id) : '';
        tips.push(suitIcon
          ? `<span class="chip gold chip-suit" title="该花色牌理+2"><span class="chip-mini-icon" style="background-image:url('${suitIcon}')"></span>天命 ${suit.symbol}</span>`
          : `<span class="chip gold" title="该花色牌理+2">天命 ${suit.symbol}</span>`);
      }
      if (free && isPlayer) tips.push('<span class="chip gold">可任意出牌</span>');
      else if (!free && isPlayer) tips.push('<span class="chip">需压过上家</span>');
      if (chain >= 2) tips.push(`<span class="chip green">连压 ×${chain}</span>`);
      if (nextQi > 0.05) tips.push(`<span class="chip gold">下手数气 +${nextQi.toFixed(1)}</span>`);
      if (b.shield) tips.push(`<span class="chip green">护体 ×${b.shield}</span>`);
      if (hud && hud.threat === 'high') tips.push('<span class="chip danger">敌将破境</span>');
      if (hud && hud.comeback) tips.push('<span class="chip green">逆风回气</span>');
      if (need > 0 && need <= Math.max(150, b.threshold * 0.15)) {
        tips.push(`<span class="chip green">差 ${need} 破境</span>`);
      }
      chips.innerHTML = tips.join('');
    }

    const zBtn = this.$('btn-zongshi');
    if (zBtn) {
      const canZ = isPlayer && (zongTokens > 0 || zongArmed);
      zBtn.disabled = !canZ;
      zBtn.textContent = zongArmed
        ? '取消宗势蓄势'
        : (zongTokens > 0 ? `蓄势宗势令（剩 ${zongTokens}）` : '暂无宗势令');
      zBtn.title = zongArmed
        ? '再次点击取消蓄势'
        : '消耗 1 令，使下一手得分提高';
      zBtn.classList.toggle('need-action', zongArmed);
    }
    this.syncMobileBattleBar();

    // 敌人肖像：宗主局换 Boss 立绘
    const enemyPortraitEl = this.$('enemy-portrait');
    if (enemyPortraitEl && typeof ASSETS !== 'undefined') {
      const isBoss = b.stageType === 'zong' || !!b.boss;
      enemyPortraitEl.style.backgroundImage = `url('${ASSETS.enemyPortrait(isBoss)}')`;
    }

    // 敌人牌背
    const enemyCards = this.$('enemy-cards');
    const showCount = Math.min(b.enemyHand.length, 17);
    const prevEnemyCount = this._lastEnemyHandCount;
    enemyCards.innerHTML = '';
    for (let i = 0; i < showCount; i++) {
      const d = document.createElement('div');
      d.className = 'card-back';
      enemyCards.appendChild(d);
    }
    if (prevEnemyCount != null && showCount !== prevEnemyCount) {
      this.pulseClass(enemyCards, 'dealing', 320);
    }
    this._lastEnemyHandCount = showCount;
    this.$('enemy-count').textContent = `${b.enemyHand.length} 张`;

    // 桌面
    this.renderTable();

    // 日志
    const logEl = this.$('battle-log');
    logEl.innerHTML = b.log.slice(0, 12).map(l => `<div>${l.msg}</div>`).join('');

    // 右侧构筑
    this.renderBuildPanel();

    // 手牌
    this.renderHand();

    // 机关 / 锦囊
    this.renderJiguan();
    this.renderJinnang();

    const legal = isPlayer ? game.countLegalPlays() : 0;
    const canSel = isPlayer && game.canPlaySelected();
    const est = canSel ? game.estimateSelectedScore() : null;
    const playBtn = this.$('btn-play');
    playBtn.disabled = !isPlayer || !canSel;
    playBtn.classList.toggle('can-clear', !!(est && est.score >= game.scoreToClear() && game.scoreToClear() > 0));
    playBtn.classList.toggle('ready-play', !!canSel);
    this.$('btn-pass').disabled = !isPlayer || b.freePlay || (!b.lastHand);
    this.$('btn-hint').disabled = !isPlayer;
    const drawBtn = this.$('btn-draw');
    if (drawBtn) {
      const drawMax = 6 + ((game.getMetaBonuses && game.getMetaBonuses().drawExtra) || 0);
      const canDraw = isPlayer && ((b.reserve?.length || 0) + (b.deck?.length || 0) > 0)
        && b.playerHand.length < (b.handLimit || 20)
        && (b.drawsThisBattle || 0) < drawMax;
      drawBtn.disabled = !canDraw;
      const leftDraw = Math.max(0, drawMax - (b.drawsThisBattle || 0));
      drawBtn.textContent = `摸牌${b.reserve?.length ? `(底${b.reserve.length})` : ''}·${leftDraw}`;
      drawBtn.title = `本局还可摸 ${leftDraw}/${drawMax} 次（手牌臃肿会增心魔）`;
    }
    const peekBtn = this.$('btn-peek');
    if (peekBtn) {
      const canPeek = game.run.character.passive?.type === 'peek_suits';
      peekBtn.style.display = canPeek ? 'inline-flex' : 'none';
      peekBtn.disabled = !isPlayer || !(b.deck || []).length;
      peekBtn.title = !isPlayer
        ? '轮到你时才能施展天机测'
        : (!(b.deck || []).length ? '牌堆已空，无法推演' : '查看牌堆顶三张花色');
    }

    // 引导：无牌可压 → 过牌；有合法选中 → 出牌
    playBtn.classList.remove('need-action');
    this.$('btn-pass')?.classList.remove('need-action');
    if (isPlayer && !b.freePlay && legal === 0) {
      this.$('btn-pass').classList.add('need-action');
    } else if (isPlayer && canSel && est && est.score >= game.scoreToClear()) {
      playBtn.classList.add('need-action');
    } else if (isPlayer && canSel) {
      playBtn.classList.add('ready-play');
    }

    // 局面条
    const phase = this.$('battle-phase');
    if (phase) {
      const tip = b.stageTip ? ` · ${b.stageTip}` : '';
      if (!isPlayer || this.aiThinking) {
        phase.textContent = '守关者出牌中…';
      } else if (hud && hud.nearClear) {
        phase.textContent = free
          ? `破境在即（差${need}）· 优先高分组合${tip}`
          : `破境在即 · 压过【${b.lastHand?.name || '上家'}】后可一锤定音`;
      } else if (hud && hud.threat === 'high') {
        phase.textContent = free
          ? '背水一战 · 敌将破境，速推进度！'
          : `背水 · 必须压过【${b.lastHand?.name || '上家'}】或护体/机关`;
      } else if (softLeft <= 5 && softLeft > 0) {
        phase.textContent = `末段压迫（剩约${softLeft}回合）· 加快破境`;
      } else if (b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy') {
        phase.textContent = `自由出牌 · 选高收益牌型推进破境${chain >= 2 ? ' · 连压中' : ''}`;
      } else if (legal === 0) {
        phase.textContent = `压不过【${b.lastHand?.name || '上家'}】· 可过牌/摸牌/用机关`;
      } else {
        phase.textContent = `需压过【${b.lastHand?.name || '上家'}】· 点牌成组，再点轮换${chain >= 1 ? ` · 连压×${chain}` : ''}`;
      }
    }

    // 近破境时提示按钮脉冲
    const hintBtn = this.$('btn-hint');
    if (hintBtn) hintBtn.classList.toggle('pulse-hint', !!(isPlayer && hud && hud.nearClear));

    // 回合手感：你的回合 / 敌方回合
    const handArea = this.$('hand-area');
    if (handArea) {
      handArea.classList.toggle('your-turn', !!(isPlayer && b.status === 'playing'));
      handArea.classList.toggle('enemy-turn', !!(b.turn === 'enemy' || this.aiThinking));
    }

    // 敌方思考中文案
    const enemyName = document.querySelector('.enemy-name');
    if (enemyName) {
      const baseName = (b.boss && b.boss.name) ? b.boss.name.split('·')[0] : '守关者';
      enemyName.textContent = (this.aiThinking || b.turn === 'enemy') && b.status === 'playing'
        ? `${baseName} · 思忖…`
        : baseName;
    }

    this.updateHandHint();
    this.syncPlayButtons();
  },

  renderBuildPanel() {
    const el = this.$('build-qipai');
    if (!el || !game.run) return;
    const xf = game.run.xinfa || {};
    const xfParts = Object.keys(XINFA || {})
      .filter(k => (xf[k] || 0) > 0)
      .map(k => `${XINFA[k].name.replace('诀', '')}${xf[k]}`)
      .slice(0, 6);
    const xfHtml = xfParts.length
      ? `<div class="build-xinfa">心法：${xfParts.join(' · ')}</div>`
      : '';
    if (!game.run.qipai.length) {
      el.innerHTML = xfHtml + '<span style="color:var(--muted)">暂无奇牌</span>';
      return;
    }
    el.innerHTML = xfHtml + game.run.qipai.map(q => {
      const icon = (typeof ASSETS !== 'undefined' && ASSETS.qipaiIcon) ? ASSETS.qipaiIcon(q, true) : '';
      return `<div class="build-item">
        ${icon ? `<span class="build-qipai-icon" style="background-image:url('${icon}')"></span>` : ''}
        <div class="build-item-text"><b style="color:${RARITY_COLOR[q.rarity] || ''}">${q.name}</b><span>${q.desc}</span></div>
      </div>`;
    }).join('');
  },

  renderTable() {
    const b = game.battle;
    const area = this.$('last-play');
    const info = this.$('last-play-info');
    area.innerHTML = '';
    area.classList.remove('last-play-crowded');

    if (b.lastHand) {
      // 少量出牌应完整展开；仅长组合才压缩，避免第一手的三带一、四张炸弹互相遮挡。
      area.classList.toggle('last-play-crowded', b.lastHand.cards.length > 7);
      b.lastHand.cards.forEach(c => {
        area.appendChild(this.createCardEl(c, { table: true }));
      });
      const who = b.lastPlayer === 'player' ? '你' : '守关者';
      let scoreHtml = '';
      if (b.lastPlayScore) {
        scoreHtml = `<span class="score-pop${b.lastPlayer === 'enemy' ? ' enemy' : ''}">+${b.lastPlayScore}</span>`;
      }
      const beatTag = (b.lastPlayer === 'player' && b.lastPlayWasBeat)
        ? '<span class="beat-tag">压过</span>'
        : '';
      const hIcon = (typeof ASSETS !== 'undefined')
        ? ASSETS.handIcon(b.lastHand.type)
        : '';
      const iconHtml = hIcon
        ? `<span class="hand-type-ico" style="background-image:url('${hIcon}')" title="${b.lastHand.name}"></span>`
        : '';
      const chain = b.playerChain || 0;
      const chainTag = (b.lastPlayer === 'player' && chain >= 2)
        ? `<span class="chain-tag">连×${chain}</span>`
        : '';
      info.innerHTML = `${scoreHtml}${beatTag}${chainTag}<span class="last-play-line">${iconHtml}${who}的【${b.lastHand.name}】${b.freePlay ? ' · 自由出牌' : ''}</span>`;
    } else {
      info.innerHTML = b.freePlay ? '自由出牌，选择牌型打出' : '等待出牌…';
    }
  },

  createCardEl(card, opts = {}) {
    const el = document.createElement('div');
    let cls = 'card';
    if (card.joker) {
      cls += card.jokerType === 'red' ? ' joker-red' : ' joker-black';
    } else {
      cls += card.color === 'red' ? ' red' : ' black';
    }
    if (opts.table) cls += ' table-card';
    if (opts.selected) cls += ' selected';
    if (card._frozen) cls += ' frozen';
    if (opts.hint) cls += ' hint';
    el.className = cls;

    if (card.joker) {
      el.innerHTML = `
        <div class="card-joker-label">${card.label}</div>
        <div class="card-sheen"></div>
      `;
    } else {
      el.innerHTML = `
        <div class="card-corner tl"><span class="cr">${card.label}</span><span class="cs">${card.suitSymbol}</span></div>
        <div class="card-center suit-lg">${card.suitSymbol}</div>
        <div class="card-corner br"><span class="cr">${card.label}</span><span class="cs">${card.suitSymbol}</span></div>
        <div class="card-watermark">${card.suitSymbol}</div>
        <div class="card-sheen"></div>
      `;
    }

    el.dataset.cardId = card.id;

    if (!opts.table && !card._frozen) {
      this.bindCardInteraction(el, card);
    }
    return el;
  },

  /**
   * 手牌触控：区分横向滑动与点选；长按 = 微调加减单张。
   * 避免滑动手牌时误选，并补上移动端无 Shift 的缺口。
   */
  bindCardInteraction(el, card) {
    el.onmousedown = (e) => { e.preventDefault(); };
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    let ptr = null;
    const clearLong = () => {
      if (ptr?.longTimer) {
        clearTimeout(ptr.longTimer);
        ptr.longTimer = null;
      }
    };

    el.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      const battle = game.battle;
      if (!battle || battle.turn !== 'player' || this.aiThinking || this.animating) return;
      ptr = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        longFired: false,
        longTimer: null,
      };
      // 触控长按进入单张加减（等同 Shift）
      if (e.pointerType === 'touch' || this.isTouchUI()) {
        ptr.longTimer = setTimeout(() => {
          if (!ptr || ptr.moved) return;
          ptr.longFired = true;
          try {
            if (navigator.vibrate) navigator.vibrate(14);
          } catch (_) { /* ignore */ }
          el.classList.add('long-press');
          setTimeout(() => el.classList.remove('long-press'), 220);
          this.selectCard(card, { multi: true, fromLongPress: true });
          this.toast('微调：已切换该牌', 900);
        }, 420);
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const dx = e.clientX - ptr.x;
      const dy = e.clientY - ptr.y;
      // 横向滑动手牌时取消点选；阈值略大以免微抖误判
      if (Math.abs(dx) > 12 || Math.abs(dy) > 14) {
        ptr.moved = true;
        clearLong();
      }
    });

    const endPtr = (e, cancelled) => {
      if (!ptr || (e && e.pointerId !== ptr.id)) return;
      const state = ptr;
      clearLong();
      ptr = null;
      if (cancelled || state.moved || state.longFired) return;
      const multi = !!(this.multiSelectMode || (e && (e.shiftKey || e.ctrlKey || e.metaKey)));
      this.selectCard(card, { multi });
    };

    el.addEventListener('pointerup', (e) => endPtr(e, false));
    el.addEventListener('pointercancel', (e) => endPtr(e, true));
    // 吞掉 click，避免与 pointerup 双触发
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  },

  /** 选牌核心：双击出牌、微调、反馈 */
  selectCard(card, opts = {}) {
    const battle = game.battle;
    if (!battle || battle.turn !== 'player' || this.aiThinking || this.animating) return;

    const multi = !!opts.multi;
    const now = Date.now();
    const dblMs = this.isTouchUI() ? 300 : 320;

    // 双击/双触：在已选合法组上直接出牌
    if (!multi && !opts.fromLongPress && this._lastClickCard === card.id && now - this._lastClickTime < dblMs) {
      if (!battle.selectedIds.has(card.id)) {
        game.toggleSelect(card.id, { multi: false });
      }
      this.renderHand();
      this.updateHandHint();
      this.syncPlayButtons();
      this.syncMobileBattleBar();
      if (game.canPlaySelected()) {
        this._lastClickCard = null;
        this.onPlay();
        return;
      }
    }
    this._lastClickCard = card.id;
    this._lastClickTime = now;

    game.toggleSelect(card.id, { multi });
    this._hintCardIds = null;
    this.renderHand();

    const picked = [...(game.battle?.selectedIds || [])];
    if (picked.length) {
      requestAnimationFrame(() => {
        picked.forEach(id => {
          const node = document.querySelector(`.hand-cards .card[data-card-id="${id}"]`);
          if (node) {
            node.classList.add('tap');
            setTimeout(() => node.classList.remove('tap'), 160);
          }
        });
      });
      this.guideNotifySelect();
    }
    this.updateHandHint();
    this.syncPlayButtons();
    this.syncMobileBattleBar();
    if (typeof SFX !== 'undefined') SFX.play('select');
  },

  clearHandSelection() {
    if (!game.battle) return;
    game.battle.selectedIds.clear();
    game.battle._selectCycleKey = null;
    game.battle._selectCycleIdx = 0;
    this._hintCardIds = null;
    this.renderHand();
    this.updateHandHint();
    this.syncPlayButtons();
    this.syncMobileBattleBar();
  },

  toggleMultiSelectMode() {
    this.multiSelectMode = !this.multiSelectMode;
    this.syncMobileBattleBar();
    this.toast(this.multiSelectMode ? '微调已开：点牌加减单张' : '微调已关：点牌智能成组', 1200);
    this.updateHandHint();
  },

  /** 同步移动端资源条与快捷按钮（宗势/清空/微调） */
  syncMobileBattleBar() {
    const b = game.battle;
    const res = this.$('mobile-res');
    const zBtn = this.$('btn-zongshi-m');
    const multiBtn = this.$('btn-multi-toggle');
    const clearBtn = this.$('btn-clear-sel');
    if (!b) return;

    const zongTokens = game.run?.zongshiTokens || 0;
    const zongArmed = !!b.zongshiArmed;
    const isPlayer = b.turn === 'player' && b.status === 'playing' && !this.aiThinking && !this.animating;
    const xinmoCap = b.xinmoCap || 5;

    if (res) {
      res.innerHTML = `
        <span class="mres${b.xinmo >= xinmoCap - 1 ? ' warn' : ''}" title="心魔">心魔 ${b.xinmo}/${xinmoCap}</span>
        <span class="mres" title="机关令">令 ${b.jiguanTokens || 0}</span>
        <span class="mres${zongArmed ? ' good' : ''}" title="宗势令">${zongArmed ? '宗势·蓄' : `宗势 ${zongTokens}`}</span>
        <span class="mres${(b.maxSoftRound || 24) - b.round <= 5 ? ' warn' : ''}" title="回合">回 ${b.round}/${b.maxSoftRound || 24}</span>
      `;
    }
    if (zBtn) {
      const canZ = isPlayer && (zongTokens > 0 || zongArmed);
      zBtn.disabled = !canZ;
      zBtn.textContent = zongArmed ? '取消蓄势' : (zongTokens > 0 ? `宗势×${zongTokens}` : '宗势');
      zBtn.classList.toggle('need-action', !!zongArmed);
      zBtn.classList.toggle('is-armed', !!zongArmed);
    }
    if (multiBtn) {
      multiBtn.classList.toggle('is-on', !!this.multiSelectMode);
      multiBtn.setAttribute('aria-pressed', this.multiSelectMode ? 'true' : 'false');
      multiBtn.textContent = this.multiSelectMode ? '微调·开' : '微调';
    }
    if (clearBtn) {
      clearBtn.disabled = !isPlayer || !(b.selectedIds && b.selectedIds.size);
    }
  },

  /** 仅根据当前选牌刷新出牌/过牌按钮状态（不重绘全桌） */
  syncPlayButtons() {
    const b = game.battle;
    if (!b) return;
    const isPlayer = b.turn === 'player' && b.status === 'playing' && !this.aiThinking && !this.animating;
    const canSel = isPlayer && game.canPlaySelected();
    const est = canSel ? game.estimateSelectedScore() : null;
    const need = game.scoreToClear();
    const playBtn = this.$('btn-play');
    const passBtn = this.$('btn-pass');
    const drawBtn = this.$('btn-draw');
    if (playBtn) {
      playBtn.disabled = !isPlayer || !canSel;
      playBtn.classList.toggle('can-clear', !!(est && need > 0 && est.score >= need));
      playBtn.classList.toggle('ready-play', !!canSel);
      playBtn.classList.toggle('need-action', !!(est && need > 0 && est.score >= need));
      // 出牌按钮动态文案
      const ico = playBtn.querySelector('.btn-ico');
      const icoHtml = ico ? ico.outerHTML : '';
      if (canSel && est) {
        if (need > 0 && est.score >= need) {
          playBtn.innerHTML = `${icoHtml}<span>破境 · ${est.score}</span>`;
        } else {
          playBtn.innerHTML = `${icoHtml}<span>出牌 · ${est.score}</span>`;
        }
      } else {
        playBtn.innerHTML = `${icoHtml}<span>出牌</span>`;
      }
      // 恢复图标背景
      const ico2 = this.$('ico-play');
      if (ico2 && typeof ASSETS !== 'undefined') {
        ico2.style.backgroundImage = `url('${ASSETS.icons.play}')`;
      }
    }
    if (passBtn) {
      passBtn.disabled = !isPlayer || !!(b.freePlay || !b.lastHand || b.lastPlayer === 'player');
      const legal = isPlayer ? game.countLegalPlays() : 0;
      const free = b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy';
      passBtn.classList.toggle('need-action', isPlayer && !free && legal === 0);
    }
    if (drawBtn) {
      const drawMax = 6 + ((game.getMetaBonuses && game.getMetaBonuses().drawExtra) || 0);
      const canDraw = isPlayer && ((b.reserve?.length || 0) + (b.deck?.length || 0) > 0)
        && b.playerHand.length < (b.handLimit || 20)
        && (b.drawsThisBattle || 0) < drawMax;
      drawBtn.disabled = !canDraw;
    }
    this.syncMobileBattleBar();
  },

  renderHand() {
    const b = game.battle;
    const container = this.$('hand-cards');
    if (!container) return;
    game.pruneSelection();
    container.innerHTML = '';
    const sorted = sortCards(b.playerHand);
    const n = sorted.length;
    // 重叠：牌越多叠得越紧；触控端略放宽，减少点偏
    const touch = this.isTouchUI();
    const overlap = touch
      ? (n <= 8 ? -10 : n <= 12 ? -13 : n <= 16 ? -16 : -18)
      : (n <= 8 ? -12 : n <= 12 ? -16 : n <= 16 ? -20 : -24);
    // 轻扇形：中间低、两侧略抬，旋转角克制；触控端几乎拉平便于点选
    const maxRot = touch ? (n <= 10 ? 2 : 3) : (n <= 8 ? 7 : n <= 14 ? 9 : 11);

    // 推荐高亮 id 集合
    const hintIds = this._hintCardIds instanceof Set ? this._hintCardIds : null;
    // 选中牌序号（按牌面序）
    const selSorted = sortCards(sorted.filter(c => b.selectedIds.has(c.id)));
    const selOrder = new Map(selSorted.map((c, idx) => [c.id, idx + 1]));

    sorted.forEach((c, i) => {
      const selected = b.selectedIds.has(c.id);
      const el = this.createCardEl(c, { selected, hint: !!(hintIds && hintIds.has(c.id)) });
      // 扇形 CSS 变量
      const t = n <= 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
      const rot = t * maxRot;
      const y = touch ? 0 : Math.abs(t) * (n > 12 ? 6 : 4);
      el.style.setProperty('--fan-ml', i === 0 ? '0px' : `${overlap}px`);
      el.style.setProperty('--fan-rot', `${rot.toFixed(2)}deg`);
      el.style.setProperty('--fan-y', `${y.toFixed(1)}px`);
      el.style.marginLeft = i === 0 ? '0' : `${overlap}px`;
      el.style.zIndex = String(selected ? 100 + i : i + 1);
      if (selected && selOrder.has(c.id)) {
        el.dataset.pick = String(selOrder.get(c.id));
        el.classList.add('has-pick');
      }
      container.appendChild(el);
    });

    const label = this.$('hand-count-label');
    if (label) {
      const free = b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy';
      const legal = game.countLegalPlays();
      label.textContent = free
        ? `手牌 ${b.playerHand.length} 张 · 可出${legal}手`
        : `手牌 ${b.playerHand.length} 张 · 可压${legal}手`;
    }
  },

  updateHandHint() {
    const b = game.battle;
    const hint = this.$('hand-hint');
    if (!hint) return;
    hint.classList.remove('can-play', 'cannot-play', 'can-clear');
    hint.style.color = '';
    if (!b || b.turn !== 'player' || this.aiThinking) {
      hint.textContent = b?.turn === 'enemy' || this.aiThinking ? '守关者出牌中…' : '';
      return;
    }
    const need = game.scoreToClear();
    const legal = game.countLegalPlays();
    const cards = game.getSelectedCards();
    const free = b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy';

    if (!free && legal === 0) {
      hint.textContent = `无牌可压 · 过牌/摸牌/机关（差${need}破境）`;
      hint.classList.add('cannot-play');
      hint.style.color = 'var(--danger)';
      return;
    }

    const touch = this.isTouchUI();
    const fineTip = touch
      ? (this.multiSelectMode ? '微调中·点牌加减' : '长按/点「微调」加减')
      : 'Shift微调';
    if (!cards.length) {
      const base = free
        ? (touch ? `点牌成组 · 再点轮换 · ${fineTip}` : '点牌成组 · 再点轮换 · Shift微调')
        : (touch
          ? `点牌压【${b.lastHand?.name || '上家'}】· 再点轮换`
          : `点牌自动压【${b.lastHand?.name || '上家'}】· 再点轮换`);
      hint.textContent = `${base} · 差${need}破境 · 可压${legal}手`;
      return;
    }
    const labels = cards.map(c => (c.joker ? c.label : c.suitSymbol + c.label)).join('');
    const hand = game.getSelectedHand();
    if (!hand) {
      hint.textContent = `已选 ${labels} · 不是合法牌型（${fineTip}）`;
      hint.classList.add('cannot-play');
      hint.style.color = 'var(--danger)';
      return;
    }
    if (hand.cards.length !== cards.length) {
      hint.textContent = touch
        ? `已选 ${labels} · 多选杂牌，点「清空」或开微调去掉`
        : `已选 ${labels} · 多选了杂牌，请重选或 Shift 去掉`;
      hint.classList.add('cannot-play');
      hint.style.color = 'var(--danger)';
      return;
    }
    if (!game.canPlaySelected()) {
      hint.textContent = `【${hand.name}】${labels} 压不过上家`;
      hint.classList.add('cannot-play');
      hint.style.color = 'var(--danger)';
      return;
    }
    const preview = game.estimateSelectedScore() || calculateScore(hand, game.getScoreContext());
    const armed = b.zongshiArmed ? ' · 宗势×1.3' : '';
    const alts = b._selectCycleKey != null
      ? game.listPlaysIncluding(b._selectCycleKey).length
      : 0;
    const altTip = alts > 1 ? ` · 方案${(b._selectCycleIdx || 0) + 1}/${alts}` : '';
    // 关键加成摘要（含巧压/首见）
    const highlights = (preview.breakdown || [])
      .filter(x => /天命|同花|连|宗势|气\+|牌理\+|巧压|首见|开局|气脉|威能|背水|逆风/.test(x.label + x.value)
        && x.label !== '基础牌理' && !/基础气/.test(x.label))
      .slice(0, 3)
      .map(x => x.label)
      .join('·');
    const bonusTip = highlights ? ` · ${highlights}` : '';
    if (preview.score >= need && need > 0) {
      const over = preview.score - need;
      const clean = over <= Math.max(40, need * 0.15) ? ' · 干净破境' : '';
      hint.textContent = `【${hand.name}】${labels} · ${preview.score}分 → 可破境！${clean}${armed}${altTip}`;
      hint.classList.add('can-play', 'can-clear');
      hint.style.color = 'var(--green)';
    } else {
      hint.textContent = `【${hand.name}】${labels} · 约${preview.score}分（还差${Math.max(0, need - preview.score)}）${armed}${bonusTip}${altTip}`;
      hint.classList.add('can-play');
      hint.style.color = 'var(--gold-light)';
    }
  },

  onDraw() {
    if (this.aiThinking || this.animating) return;
    const res = game.manualDraw();
    if (!res.ok) {
      this.toast(res.reason || '无法摸牌');
      this.shake(this.$('btn-draw') || this.$('action-bar'));
      return;
    }
    this.sfx('select');
    this.toast(`摸到 ${res.drawn} 张`);
    this._hintCardIds = null;
    if (game.battle) game.battle.selectedIds.clear();
    this.renderBattle();
    // 新摸到的牌轻闪最后几张
    requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.hand-cards .card');
      const n = res.drawn || 1;
      [...cards].slice(-n).forEach(node => {
        node.classList.add('tap');
        setTimeout(() => node.classList.remove('tap'), 220);
      });
    });
  },

  onZongshi() {
    if (this.aiThinking || this.animating) return;
    const res = game.toggleZongshi();
    if (!res.ok) {
      this.toast(res.reason || '无法使用');
      this.shake(this.$('btn-zongshi-m') || this.$('btn-zongshi'));
      return;
    }
    this.sfx('shop');
    this.toast(res.armed ? '宗势已蓄势，下次出牌×1.3' : '已取消宗势蓄势');
    this.renderBattle();
    this.syncMobileBattleBar();
  },

  renderJiguan() {
    const b = game.battle;
    const bar = this.$('jiguan-bar');
    const meta = this.$('jiguan-meta');
    const tray = this.$('util-tray');
    if (!bar || !b) return;

    const isPlayer = b.turn === 'player' && b.status === 'playing' && !this.aiThinking && !this.animating;
    const maxJ = b.jiguanTurnLimit || (b.extraJiguanTurn ? 2 : (b.maxJiguanPerTurn || 1));
    const used = b.turnJiguanUsed || 0;
    const usedUp = used >= maxJ;
    const tokens = b.jiguanTokens || 0;
    if (meta) {
      meta.textContent = `令 ${tokens} · 本回合 ${Math.min(used, maxJ)}/${maxJ}`;
      meta.title = '机关令用于支付带费用的机关；每回合默认只能发动 1 次';
    }
    if (tray) tray.classList.toggle('is-empty', !b.jiguanHand.length);

    bar.innerHTML = '';
    bar.style.display = 'flex';

    if (!b.jiguanHand.length) {
      const empty = document.createElement('div');
      empty.className = 'util-empty';
      empty.textContent = (game.meta.gamesPlayed || 0) <= 1 && (game.meta.tutorialStep || 0) < 2
        ? '首局先熟悉出牌；之后对局会派发机关技能'
        : '本局暂无机关（部分关卡/构筑会获得）';
      bar.appendChild(empty);
      return;
    }

    b.jiguanHand.forEach(j => {
      const el = document.createElement('button');
      el.type = 'button';
      let cost = j.cost || 0;
      if (b.boss?.jiguanCost) cost = Math.max(0, cost + b.boss.jiguanCost);
      if (b.modifiers?.includes('jiguan_cost_up')) cost += 1;
      const canAfford = tokens >= cost;
      const disabled = !isPlayer || usedUp || !canAfford;
      el.className = 'jiguan-chip has-icon'
        + (disabled ? ' is-disabled' : '')
        + (canAfford ? '' : ' no-token');
      el.disabled = disabled;
      const icon = (typeof ASSETS !== 'undefined') ? ASSETS.jiguanIcon(j.id) : '';
      const shortDesc = (j.desc || '').replace(/。$/, '');
      const costCls = cost <= 0 ? '' : (canAfford ? ' is-paid' : ' is-short');
      const costLabel = cost <= 0 ? '免费' : `${cost} 令`;
      el.innerHTML = `
        ${icon ? `<span class="chip-icon" style="background-image:url('${icon}')"></span>` : ''}
        <span class="chip-text">
          <span class="chip-name">${j.name}</span>
          <span class="chip-desc">${shortDesc}</span>
        </span>
        <span class="cost-pill${costCls}">${costLabel}</span>
      `;
      let why = j.desc || '';
      if (!isPlayer) why = '轮到你时才能使用';
      else if (usedUp) why = '本回合机关次数已用完';
      else if (!canAfford) why = `需要 ${cost} 机关令（当前 ${tokens}）`;
      else why = `${j.desc}${cost ? ` · 耗 ${cost} 令` : ' · 免费'}`;
      el.title = why;
      el.onclick = () => this.onUseJiguan(j);
      bar.appendChild(el);
    });
  },

  renderJinnang() {
    const bar = this.$('jinnang-bar');
    const section = this.$('jinnang-section');
    if (!bar || !game.run) return;
    bar.innerHTML = '';
    const list = game.run.jinnang || [];
    if (section) {
      if (!list.length) {
        section.hidden = true;
        return;
      }
      section.hidden = false;
    }
    if (!list.length) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    const b = game.battle;
    const isPlayer = b && b.turn === 'player' && b.status === 'playing' && !this.aiThinking && !this.animating;
    const jnIcon = (typeof ASSETS !== 'undefined') ? ASSETS.jinnangIcon() : '';
    list.forEach(j => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'jinnang-chip has-icon' + (isPlayer ? '' : ' is-disabled');
      el.disabled = !isPlayer;
      el.innerHTML = `
        ${jnIcon ? `<span class="chip-icon" style="background-image:url('${jnIcon}')"></span>` : ''}
        <span class="chip-text">
          <span class="chip-name">${j.name}</span>
          <span class="chip-desc">${(j.desc || '一次性').replace(/。$/, '')}</span>
        </span>
      `;
      el.title = isPlayer ? (j.desc || j.name) : '轮到你时才能使用';
      el.onclick = () => this.onUseJinnang(j);
      bar.appendChild(el);
    });
  },

  async onUseJiguan(j) {
    const b = game.battle;
    if (!b || b.turn !== 'player' || this.aiThinking || this.animating) return;

    let extra = {};
    if (j.effect.type === 'wild_rank') {
      const cards = game.getSelectedCards();
      if (cards.length !== 1 && b.selectedIds.size !== 1) {
        if (!b.selectedIds.size) {
          this.toast('请先选中要百变的1张牌');
          this.shake(this.$('hand-area'));
          return;
        }
      }
      const cardId = [...b.selectedIds][0] || cards[0]?.id;
      if (!cardId) {
        this.toast('请先选中要百变的1张牌');
        this.shake(this.$('hand-area'));
        return;
      }
      const ranks = RANKS.filter(r => !r.joker && r.id !== '2').map(r => ({
        label: r.label,
        value: r.id,
      }));
      const rankId = await this.showModal(
        '百变 · 视为何点数？',
        `<p class="cast-modal-desc"><b>${j.name}</b>：${j.desc}</p>`,
        ranks
      );
      if (!rankId) return;
      extra = { cardId, rankId };
    }

    if (j.effect.type === 'discard_draw') {
      if (!b.selectedIds.size) {
        this.toast('请先选中要弃的1张牌');
        this.shake(this.$('hand-area'));
        return;
      }
      extra = { cardId: [...b.selectedIds][0] };
    }

    const res = game.useJiguan(j.uid, extra);
    if (!res.ok) {
      this.toast(res.reason || '无法使用');
      this.shake(this.$('jiguan-bar') || this.$('action-bar'));
      return;
    }
    this.sfx('jiguan');
    this.playCastFx({
      kind: 'jiguan',
      name: j.name,
      intro: j.desc,
      effect: res.effectMsg || j.desc,
      detail: [res.detail, res.passiveNote, res.masterNote].filter(Boolean).join(' · '),
      fxKind: res.fxKind || 'default',
      icon: (typeof ASSETS !== 'undefined') ? ASSETS.jiguanIcon(j.id) : '',
      cost: res.cost,
      tokensLeft: res.tokensLeft,
    });
    this.pulseClass(this.$('jiguan-bar'), 'used-flash', 320);
    this.applyCastScreenFx(res.fxKind || 'default');
    this.renderBattle();
  },

  async onUseJinnang(j) {
    const b = game.battle;
    if (!b || b.turn !== 'player' || this.aiThinking || this.animating) return;

    let extra = {};
    if (j.id === 'yirong') {
      if (!b.selectedIds.size) {
        this.toast('请先选中1张牌');
        this.shake(this.$('hand-area'));
        return;
      }
      const cardId = [...b.selectedIds][0];
      const ranks = RANKS.filter(r => !r.joker).map(r => ({ label: r.label, value: r.id }));
      const rankId = await this.showModal(
        '易容符 · 改为何点数？',
        `<p class="cast-modal-desc"><b>${j.name}</b>：${j.desc}</p>`,
        ranks
      );
      if (!rankId) return;
      extra = { cardId, rankId };
    }

    const res = game.useJinnang(j.uid, extra);
    if (!res.ok) {
      this.toast(res.reason || '无法使用');
      this.shake(this.$('jinnang-bar') || this.$('action-bar'));
      return;
    }
    this.sfx('jiguan');
    this.playCastFx({
      kind: 'jinnang',
      name: j.name,
      intro: j.desc,
      effect: res.effectMsg || j.desc,
      detail: res.detail || '',
      fxKind: res.fxKind || 'buff',
      icon: (typeof ASSETS !== 'undefined') ? ASSETS.jinnangIcon() : '',
    });
    this.pulseClass(this.$('jinnang-bar'), 'used-flash', 320);
    this.applyCastScreenFx(res.fxKind || 'buff');
    this.renderBattle();
  },

  /**
   * 机关/锦囊发动：名称 + 说明 + 实际效果
   * @param {{kind,name,intro,effect,detail,fxKind,icon,cost,tokensLeft}} p
   */
  playCastFx(p) {
    const root = this.$('cast-fx');
    if (!root) {
      this.toast(`${p.kind === 'jinnang' ? '锦囊' : '机关'}【${p.name}】${p.effect || ''}`, 2600);
      return;
    }
    const kindEl = this.$('cast-fx-kind');
    const nameEl = this.$('cast-fx-name');
    const descEl = this.$('cast-fx-desc');
    const effEl = this.$('cast-fx-effect');
    const extraEl = this.$('cast-fx-extra');
    const iconEl = this.$('cast-fx-icon');
    if (kindEl) kindEl.textContent = p.kind === 'jinnang' ? '锦囊发动' : '机关发动';
    if (nameEl) nameEl.textContent = p.name || '—';
    if (descEl) descEl.textContent = p.intro || '';
    if (effEl) effEl.textContent = p.effect || '';
    if (extraEl) {
      const bits = [];
      if (p.detail) bits.push(p.detail);
      if (p.cost != null) bits.push(`消耗 ${p.cost} 令 · 剩余 ${p.tokensLeft ?? '—'}`);
      extraEl.textContent = bits.join(' ｜ ');
      extraEl.style.display = bits.length ? 'block' : 'none';
    }
    if (iconEl) {
      iconEl.style.backgroundImage = p.icon ? `url('${p.icon}')` : '';
      iconEl.className = 'cast-fx-icon fx-' + (p.fxKind || 'default');
    }
    const kindCls = p.kind === 'jinnang' ? 'is-jinnang' : 'is-jiguan';
    root.className = `cast-fx show ${kindCls} fx-${p.fxKind || 'default'}`;
    clearTimeout(this._castFxTimer);
    this._castFxTimer = setTimeout(() => {
      root.classList.remove('show');
      root.className = 'cast-fx';
    }, 1700);
  },

  /** 桌面/敌方区域的短促光效 */
  applyCastScreenFx(fxKind) {
    const table = document.querySelector('.table-felt');
    const enemy = document.querySelector('.enemy-area');
    const hand = this.$('hand-area');
    const map = {
      seal: { el: enemy, cls: 'fx-seal' },
      strike: { el: enemy, cls: 'fx-strike' },
      ice: { el: enemy, cls: 'fx-ice' },
      steal: { el: enemy, cls: 'fx-steal' },
      buff: { el: hand, cls: 'fx-buff' },
      heal: { el: hand, cls: 'fx-heal' },
      shield: { el: hand, cls: 'fx-shield' },
      draw: { el: hand, cls: 'fx-draw' },
      morph: { el: hand, cls: 'fx-morph' },
      clear: { el: hand, cls: 'fx-clear' },
      default: { el: table, cls: 'fx-default' },
    };
    const conf = map[fxKind] || map.default;
    if (conf.el) this.pulseClass(conf.el, conf.cls, 520);
    if (table && conf.el !== table) this.pulseClass(table, 'fx-ripple', 400);
  },

  onPlay() {
    if (this.aiThinking || this.animating) return;
    if (!game.battle || game.battle.status !== 'playing' || game.battle.turn !== 'player') return;
    game.pruneSelection();
    if (!game.getSelectedCards().length) {
      this.toast('请先选牌');
      this.shake(this.$('hand-area'));
      return;
    }
    if (!game.canPlaySelected()) {
      const hand = game.getSelectedHand();
      this.toast(hand ? '压不过上家或牌型不完整' : '不是合法牌型');
      this.shake(this.$('hand-area'));
      this.sfx('pass');
      return;
    }

    // 防连点
    this.animating = true;
    const gen = this._battleGen || 0;
    this._hintCardIds = null;
    let res;
    try {
      res = game.playSelected();
    } catch (err) {
      this.animating = false;
      console.error('[牌宗] playSelected', err);
      this.toast('出牌异常，请重选');
      if (game.battle) game.battle.selectedIds.clear();
      this.renderBattle();
      return;
    }
    this.animating = false;
    if (!res || !res.ok) {
      this.toast((res && res.reason) || '无法出牌');
      this.shake(this.$('action-bar'));
      if (game.battle) game.battle.selectedIds.clear();
      this.renderBattle();
      return;
    }

    this.sfx('play');
    if ((res.score || 0) >= 300) this.sfx('bigscore');
    else if (res.score > 0) this.sfx('score');
    this.guideNotifyPlay();

    // 桌面击中 + 得分闪报
    this.pulseClass(document.querySelector('.table-area'), 'hit', 400);
    if (res.score > 0 && res.hand) {
      const logDetail = !!(game.getMetaBonuses && game.getMetaBonuses().logDetail);
      const bits = (res.breakdown || [])
        .filter(x => x.label && x.label !== '本次得分' && x.label !== '基础牌理')
        .slice(0, logDetail ? 6 : 3)
        .map(x => logDetail && x.value ? `${x.label}${x.value}` : x.label)
        .join('·');
      const chain = game.battle?.playerChain || 0;
      const chainTip = chain >= 2 ? ` 连压×${chain}` : '';
      this.flashScore(`+${res.score}`, `${res.hand.name}${bits ? ' · ' + bits : ''}${chainTip}`, res.score >= 300);
    }

    this.renderBattle();

    if (res.won) {
      this.sfx('win');
      this.playFx('破境', `得分 ${res.score || ''}`, 'win');
      setTimeout(() => {
        if (gen === this._battleGen) this.showResult(true, res);
      }, 1000);
      return;
    }
    if (res.lost) {
      this.sfx('lose');
      this.playFx('落败', res.reason || '论道未成', 'lose');
      setTimeout(() => {
        if (gen === this._battleGen) this.showResult(false, res);
      }, 900);
      return;
    }
    if (res.revived) {
      this.toast('宗主赦令！死里逃生');
      this.renderBattle();
      return;
    }

    this.runEnemyTurn();
  },

  onPass() {
    if (this.aiThinking || this.animating) return;
    const res = game.pass();
    if (!res.ok) {
      this.toast(res.reason || '现在不能过牌');
      this.shake(this.$('btn-pass') || this.$('action-bar'));
      return;
    }
    this.sfx('pass');
    this._hintCardIds = null;
    this.pulseClass(document.querySelector('.table-felt'), 'pass-flash', 360);
    this.renderBattle();
    this.runEnemyTurn();
  },

  onHint() {
    const b = game.battle;
    if (!b || b.turn !== 'player' || this.aiThinking) return;
    const freeHint = !!(b.freePlay || !b.lastHand || b.lastPlayer !== 'enemy');
    const rec = game.recommendBestPlay
      ? game.recommendBestPlay()
      : recommendPlay(b.playerHand.filter(c => !c._frozen), freeHint ? null : b.lastHand, {
          freePlay: freeHint,
          needScore: game.scoreToClear(),
          scoreCtx: game.getScoreContext(),
          scoreFn: game.scorePlayEstimate
            ? (p) => game.scorePlayEstimate(p, !freeHint)
            : null,
        });
    if (!rec) {
      this.toast('没有可出的牌，请过牌、摸牌或使用机关');
      this.shake(this.$('hand-area'));
      return;
    }
    b.selectedIds = new Set(rec.cards.map(c => c.id));
    b._selectCycleKey = rec.cards[0]?.id || null;
    b._selectCycleIdx = 0;
    this._hintCardIds = new Set(rec.cards.map(c => c.id));
    game.pruneSelection();
    this.renderHand();
    this.updateHandHint();
    this.syncPlayButtons();
    this.sfx('select');
    // 推荐牌轻闪
    requestAnimationFrame(() => {
      this._hintCardIds.forEach(id => {
        const node = document.querySelector(`.hand-cards .card[data-card-id="${id}"]`);
        if (node) {
          node.classList.add('tap');
          setTimeout(() => node.classList.remove('tap'), 200);
        }
      });
    });
    const est = game.estimateSelectedScore();
    const need = game.scoreToClear();
    const mb = game.getMetaBonuses ? game.getMetaBonuses() : {};
    const better = mb.betterHint || mb.proHint;
    if (est && est.score >= need && need > 0) {
      this.toast(better
        ? `${mb.proHint ? '天眼' : '牌眼'}破境：【${rec.name}】预估 ${est.score} · 门槛 ${need}`
        : `推荐破境：【${rec.name}】约 ${est.score} 分`);
    } else if (better && est) {
      const qi = est.qi != null ? ` · 气×${Number(est.qi).toFixed(2)}` : '';
      const gap = need > 0 ? ` · 差 ${need}` : '';
      this.toast(`${mb.proHint ? '天眼' : '牌眼'}：【${rec.name}】预估 ${est.score}${qi}${gap}`);
    } else {
      this.toast(`推荐：【${rec.name}】${est ? `约 ${est.score} 分` : ''}`);
    }
  },

  onPeek() {
    const b = game.battle;
    if (!b || b.turn !== 'player' || b.status !== 'playing' || this.aiThinking || this.animating) {
      this.toast('轮到你时才能施展天机测');
      return;
    }
    const suits = game.peekTopSuits();
    if (!suits || !suits.length) {
      this.toast('牌堆已空，无法推演');
      return;
    }
    this.sfx('select');
    this.renderBattle();
    this.showPeekPreview(suits);
  },

  showPeekPreview(suits) {
    const preview = this.$('peek-preview');
    if (!preview) return;
    const symbols = suits.map(s => `<span class="peek-suit">${s}</span>`).join('');
    preview.innerHTML = `<span class="peek-label">天机测 · 牌堆顶</span><span class="peek-suits">${symbols}</span>`;
    preview.hidden = false;
    preview.classList.remove('is-visible');
    requestAnimationFrame(() => preview.classList.add('is-visible'));
    clearTimeout(this._peekPreviewTimer);
    this._peekPreviewTimer = setTimeout(() => {
      preview.classList.remove('is-visible');
      setTimeout(() => { if (!preview.classList.contains('is-visible')) preview.hidden = true; }, 180);
    }, 2600);
  },

  runEnemyTurn() {
    const b = game.battle;
    if (!b || b.turn !== 'enemy' || b.status !== 'playing') return;

    const gen = this._battleGen || 0;
    this.aiThinking = true;
    this.renderBattle();

    setTimeout(() => {
      // 已换局 / 已离战斗则丢弃
      if (gen !== this._battleGen || this.screen !== 'battle') {
        this.aiThinking = false;
        return;
      }
      const battle = game.battle;
      if (!battle || battle.status !== 'playing' || battle.turn !== 'enemy') {
        this.aiThinking = false;
        this.renderBattle();
        return;
      }

      const res = game.enemyTurn();
      this.aiThinking = false;
      if (gen !== this._battleGen || this.screen !== 'battle') return;

      if (res?.action === 'play') this.sfx('enemy');

      if (battle.status === 'lost' || res?.lost) {
        this.sfx('lose');
        this.renderBattle();
        this.playFx('落败', res?.reason || '守关者破境', 'lose');
        setTimeout(() => {
          if (gen === this._battleGen) this.showResult(false, res || {});
        }, 900);
        return;
      }
      if (battle.status === 'won' || res?.won) {
        this.sfx('win');
        this.playFx('破境', '通关', 'win');
        this.renderBattle();
        setTimeout(() => {
          if (gen === this._battleGen) this.showResult(true, res || {});
        }, 1000);
        return;
      }

      this.renderBattle();

      if (battle.turn === 'player' && !battle.freePlay && battle.lastHand && battle.lastPlayer === 'enemy') {
        const plays = enumeratePlays(battle.playerHand.filter(c => !c._frozen), battle.lastHand);
        if (!plays.length && !(battle.jiguanHand || []).length) {
          this.toast('压不过，只能过牌');
        }
      }
    }, 380 + Math.random() * 180);
  },

  // ===== 结算 =====
  showResult(won, res = {}) {
    this.aiThinking = false;
    this.animating = false;
    this._battleGen = (this._battleGen || 0) + 1;
    const b = game.battle;
    if (!b) {
      this.renderTitle();
      return;
    }
    const titleEl = this.$('result-title');
    const scoreEl = this.$('result-score');
    const labelEl = this.$('result-label');
    const isPuzzle = !!(res.isPuzzle || game.run?.isPuzzle);

    if (titleEl) {
      if (isPuzzle) {
        titleEl.textContent = won
          ? `残局破境 ${'★'.repeat(res.stars || b._puzzleStars || 1)}`
          : '残局未破';
      } else {
        titleEl.textContent = won ? '破境成功' : '论道失败';
      }
      titleEl.style.color = won ? 'var(--gold)' : 'var(--danger)';
    }
    if (scoreEl) scoreEl.textContent = b.playerScore;
    if (labelEl) {
      if (isPuzzle && won) {
        const stars = res.stars || b._puzzleStars || 1;
        labelEl.textContent = `${res.puzzleName || game.run?.puzzle?.name || '残局'} · ${res.rounds || b.round || 1} 回合 · ${'★'.repeat(stars)} · 阅历+${res.yueliGain || 0}${res.isFirst ? '（首通）' : ''}`;
      } else if (isPuzzle) {
        labelEl.textContent = `${res.reason || '残局未破'} · 可再试或换题`;
      } else {
        labelEl.textContent = won
          ? `门槛 ${b.threshold} · 顿悟+${res.reward || 0} · 阅历+${res.yueliGain || res.yueli || 0}`
          : `${res.reason || '失败'} · 阅历+${res.yueli || 0}`;
      }
    }

    // 胜/负全屏大插画（由 shell.css + class 控制）
    const resultScreen = this.$('screen-result');
    if (resultScreen) {
      resultScreen.classList.toggle('won', !!won);
      resultScreen.classList.toggle('lost', !won);
    }

    const bd = this.$('result-breakdown');
    if (bd) {
      if (isPuzzle) {
        const stars = res.stars || b._puzzleStars || 0;
        const best = res.bestStars || b._puzzleBestStars || stars;
        bd.innerHTML = [
          b.lastScoreBreakdown ? b.lastScoreBreakdown.map(x => `<div>${x.label}：${x.value}</div>`).join('') : '',
          `<div>本局评价：${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}</div>`,
          `<div>历史最佳：${'★'.repeat(best)}${'☆'.repeat(Math.max(0, 3 - best))}</div>`,
          `<div>用时回合：${res.rounds || b.round || 1}</div>`,
        ].filter(Boolean).join('');
      } else if (b.lastScoreBreakdown) {
        bd.innerHTML = b.lastScoreBreakdown.map(x => `<div>${x.label}：${x.value}</div>`).join('');
      } else {
        bd.innerHTML = (game.run.qipai || []).map(q => `<div>奇牌【${q.name}】${q.desc}</div>`).join('') || '无';
      }
    }

    const rq = this.$('result-qipai');
    if (rq) {
      if (isPuzzle) {
        rq.textContent = game.run?.puzzle?.tip
          ? `提示：${game.run.puzzle.tip}`
          : (game.run?.puzzle?.desc || '');
      } else {
        rq.textContent = (game.run.qipai || []).length
          ? '本局构筑：' + game.run.qipai.map(q => q.name).join('、')
          : '';
      }
    }

    const code = isPuzzle ? '' : game.exportShareCode();
    const shareEl = this.$('result-share');
    if (shareEl) shareEl.textContent = code || (isPuzzle ? '（残局模式无构筑码）' : '（暂无）');
    this._lastShare = code;

    const btnNext = this.$('btn-result-next');
    const btnShop = this.$('btn-result-shop');
    const btnRetry = this.$('btn-result-retry');
    // 残局：返回列表 / 再试；正传胜利：藏经阁；失败：再来一局
    if (isPuzzle) {
      if (btnNext) {
        btnNext.style.display = 'inline-flex';
        btnNext.textContent = '返回残局列表';
      }
      if (btnShop) btnShop.style.display = 'none';
      if (btnRetry) {
        btnRetry.style.display = 'inline-flex';
        btnRetry.textContent = '再试一次';
      }
    } else {
      if (btnNext) {
        btnNext.style.display = won ? 'inline-flex' : 'none';
        btnNext.textContent = '进入藏经阁';
      }
      if (btnShop) btnShop.style.display = 'none';
      if (btnRetry) {
        btnRetry.style.display = won ? 'none' : 'inline-flex';
        btnRetry.textContent = '再来一局';
      }
    }

    this.showScreen('result');
    this.persistRun('result');
  },

  resultNext() {
    if (game.run?.isPuzzle) {
      if (typeof game.abandonRun === 'function') game.abandonRun();
      else {
        game.run = null;
        game.battle = null;
        if (game.clearRunSave) game.clearRunSave();
      }
      this.renderPuzzleSelect();
      return;
    }
    // 进藏经阁
    this.renderShop(true);
  },

  resultRetry() {
    // 残局：同一题重开
    if (game.run?.isPuzzle && game.run.puzzleId) {
      const id = game.run.puzzleId;
      if (typeof game.abandonRun === 'function') game.abandonRun();
      this.startPuzzle(id);
      return;
    }
    // 同配置再开一局（先清旧断点）
    const setup = (game.run && game.run.character)
      ? {
          characterId: game.run.character.id,
          mode: game.run.mode || 'normal',
          difficulty: game.run.difficulty?.id || 'normal',
        }
      : (game.meta.lastRunSetup || null);
    if (!setup) {
      this.renderTitle();
      return;
    }
    if (typeof game.abandonRun === 'function') game.abandonRun();
    else {
      game.run = null;
      game.battle = null;
      if (game.clearRunSave) game.clearRunSave();
    }
    this.selectedMode = setup.mode;
    this.selectedDifficulty = setup.difficulty;
    this.selectedCharId = setup.characterId;
    this.sfx('click');
    game.startRun(setup.characterId, {
      mode: setup.mode,
      difficulty: setup.difficulty,
    });
    if (setup.mode === 'endless') {
      game.run.isEndless = true;
      game.run.endlessFloor = 1;
      game.run.realmIndex = 8;
    }
    this._stageQipaiKey = null;
    this.shopQipaiChoices = [];
    this.toast('已重开论道');
    this.renderMap();
  },

  // ===== 藏经阁 =====
  renderShop(afterWin = false) {
    this._shopAfterWin = afterWin;
    const run = game.run;
    this.$('shop-dunwu').textContent = `顿悟 ${run.dunwu}`;

    // 心法（价格与 game.shopUpgradeXinfa / 廉贾符一致）
    const xinfaEl = this.$('shop-xinfa');
    xinfaEl.innerHTML = '';
    const dunwu = run.dunwu || 0;
    Object.values(XINFA).forEach(xf => {
      const lv = run.xinfa[xf.id] || 0;
      let cost = 15 + lv * 10;
      if (game.hasQipai('jing_yan')) cost = Math.max(5, cost - 5);
      cost = game.metaShopCost ? game.metaShopCost(cost) : cost;
      const maxed = lv >= xf.max;
      const can = !maxed && dunwu >= cost;
      const item = document.createElement('div');
      item.className = 'shop-item has-thumb' + (can ? '' : ' unaffordable');
      const xfIcon = (typeof ASSETS !== 'undefined') ? ASSETS.xinfaIcon(xf.id) : '';
      item.innerHTML = `
        ${xfIcon ? `<span class="shop-thumb" style="background-image:url('${xfIcon}')"></span>` : ''}
        <div class="info">
          <div class="name">${xf.name} Lv.${lv}/${xf.max}</div>
          <div class="desc">强化${HAND_TYPES[xf.id]?.name || xf.id} · 气/牌理成长</div>
        </div>
        <span class="price ${can || maxed ? '' : 'short'}">${maxed ? '已满' : cost + '顿悟'}</span>
        <button class="btn btn-secondary btn-small" ${maxed || !can ? 'disabled' : ''}>${maxed ? '满级' : '升级'}</button>
      `;
      item.querySelector('button').onclick = () => {
        const r = game.shopUpgradeXinfa(xf.id);
        if (!r.ok) {
          this.toast(r.reason || '无法升级');
          this.shake(item);
        } else {
          this.sfx('shop');
          this.toast(`${xf.name} → Lv.${r.level}`);
          this.renderShop(afterWin);
        }
      };
      xinfaEl.appendChild(item);
    });

    // 奇牌购买（选项数走 getQipaiChoiceCount，价格走 metaShopCost）
    const qpPickN = game.getQipaiChoiceCount ? game.getQipaiChoiceCount() : 3;
    if (!this.shopQipaiChoices.length) {
      this.shopQipaiChoices = game.pickQipaiForRun(qpPickN, !!game.battle?.boss?.cursedBoost);
    }
    const qpCost = game.metaShopCost ? game.metaShopCost(25) : 25;
    const qpEl = this.$('shop-qipai');
    qpEl.innerHTML = '';
    this.shopQipaiChoices.forEach(q => {
      const ownedAlready = run.qipai.some(x => x.id === q.id);
      const can = !ownedAlready && dunwu >= qpCost;
      const item = document.createElement('div');
      item.className = 'shop-item has-thumb' + (can || ownedAlready ? '' : ' unaffordable');
      const icon = (typeof ASSETS !== 'undefined' && ASSETS.qipaiIcon) ? ASSETS.qipaiIcon(q, true) : '';
      const frame = (typeof ASSETS !== 'undefined') ? ASSETS.frameForRarity(q.rarity) : '';
      item.innerHTML = `
        <span class="shop-thumb qipai-shop-thumb" style="${icon ? `background-image:url('${icon}')` : (frame ? `background-image:url('${frame}')` : '')}"></span>
        <div class="info">
          <div class="name" style="color:${RARITY_COLOR[q.rarity]}">${q.name} · ${RARITY_LABEL[q.rarity]}</div>
          <div class="desc">${q.desc}</div>
        </div>
        <span class="price ${can || ownedAlready ? '' : 'short'}">${ownedAlready ? '已有' : qpCost + '顿悟'}</span>
        <button class="btn btn-secondary btn-small" ${ownedAlready || !can ? 'disabled' : ''}>${ownedAlready ? '已有' : '购置'}</button>
      `;
      item.querySelector('button').onclick = () => {
        const r = game.shopBuyQipai(q.id);
        if (!r.ok) {
          this.toast(r.reason || '无法购买');
          this.shake(item);
        } else {
          this.sfx('shop');
          this.toast(`获得【${q.name}】`);
          this.shopQipaiChoices = [];
          this.renderShop(afterWin);
        }
      };
      qpEl.appendChild(item);
    });

    // 锦囊
    const jnCost = game.metaShopCost ? game.metaShopCost(20) : 20;
    const btnJn = this.$('btn-buy-jinnang');
    if (btnJn) {
      btnJn.disabled = dunwu < jnCost;
      btnJn.textContent = btnJn.textContent?.includes('锦囊')
        ? `买锦囊（${jnCost}顿悟）`
        : btnJn.textContent;
      if (!btnJn.dataset.baseLabel) {
        btnJn.dataset.baseLabel = '购买随机锦囊';
      }
      btnJn.textContent = `${btnJn.dataset.baseLabel} · ${jnCost}顿悟`;
      btnJn.onclick = () => {
        const r = game.shopBuyJinnang();
        if (!r.ok) {
          this.toast(r.reason || '顿悟不足');
          this.shake(btnJn);
        } else {
          this.sfx('shop');
          this.toast(`获得锦囊【${r.jinnang.name}】`);
          this.renderShop(afterWin);
        }
      };
    }
    // 已有锦囊列表
    const jnBox = this.$('shop-owned-jinnang-placeholder');
    if (jnBox) {
      if (!(run.jinnang || []).length) {
        jnBox.innerHTML = '<div class="empty-hint">购买后在战斗中使用</div>';
      } else {
        jnBox.innerHTML = run.jinnang.map(j => `
          <div class="shop-item">
            <div class="info">
              <div class="name">${j.name}</div>
              <div class="desc">${j.desc || ''}</div>
            </div>
            <span class="price">待用</span>
          </div>
        `).join('');
      }
    }

    // 已有奇牌（删除 / 柳千变献祭）
    const ownedEl = this.$('shop-owned');
    ownedEl.innerHTML = '';
    if (!(run.qipai || []).length) {
      ownedEl.innerHTML = '<div class="empty-hint">暂无奇牌 · 可在上方购置或开局/破境时选择</div>';
    }
    run.qipai.forEach(q => {
      const item = document.createElement('div');
      item.className = 'shop-item';
      let extraBtn = '';
      if (run.character.id === 'liu') {
        extraBtn = `<button class="btn btn-ghost btn-small" data-act="sac">换宗势令</button>`;
      }
      item.innerHTML = `
        <div class="info">
          <div class="name">${q.name}</div>
          <div class="desc">${q.desc}</div>
        </div>
        <button class="btn btn-danger btn-small" data-act="del">删除(${game.metaShopCost ? game.metaShopCost(10) : 10})</button>
        ${extraBtn}
      `;
      item.querySelector('[data-act="del"]').onclick = () => {
        const r = game.shopDeleteQipai(q.id);
        if (!r.ok) this.toast('顿悟不足');
        else this.renderShop(afterWin);
      };
      const sac = item.querySelector('[data-act="sac"]');
      if (sac) {
        sac.onclick = () => {
          game.sacrificeQipai(q.id);
          this.toast('获得1宗势令');
          this.renderShop(afterWin);
        };
      }
      ownedEl.appendChild(item);
    });

    this.showScreen('shop');
    this.persistRun('shop');
    if (game.isTutorialActive && game.isTutorialActive()) {
      setTimeout(() => this.guideShowForScreen('shop'), 300);
    }
  },

  leaveShop() {
    this.shopQipaiChoices = [];
    if (!game.run) {
      this.renderTitle();
      return;
    }
    if (!this._shopAfterWin) {
      this.renderMap();
      return;
    }
    const adv = game.advanceAfterWin() || {};
    if (adv.milestones?.length) {
      const m = adv.milestones[adv.milestones.length - 1];
      this.toast(`里程碑【${m.name}】顿悟+${m.dunwu || 0} 阅历+${m.yueli || 0}`, 2800);
    }
    if (adv.enterEndless) {
      this.toast('八境归一！进入无尽论道');
      this._stageQipaiKey = `${game.run.realmIndex}-${game.run.stageIndex}-${game.run.endlessFloor || 0}`;
      this.maybeStageEventThen(() => this.startQipaiSelect('battle'));
      return;
    }
    if (adv.completed) {
      this.toast('论道圆满');
      if (typeof game.abandonRun === 'function') game.abandonRun();
      else if (game.clearRunSave) game.clearRunSave();
      this.renderTitle();
      return;
    }
    if (game.run.isDaily && game.run.stagesCleared >= 3) {
      game.completeDaily();
      this.toast('每日挑战阶段奖励已领取');
    }
    if (game.run.isWeekly && game.run.stagesCleared >= 6 && game.meta.weekly?.completed) {
      this.toast('本周禁宗奖励已结算');
    }
    // 无尽层间 / 常规推进：奇遇 → 奇牌 → 开战
    if (adv.endless || game.meta.tutorialStep >= 1 || game.run.stagesCleared >= 1) {
      this._stageQipaiKey = `${game.run.realmIndex}-${game.run.stageIndex}-${game.run.endlessFloor || 0}`;
      this.maybeStageEventThen(() => this.startQipaiSelect('battle'));
    } else {
      this.renderMap();
    }
  },

  /** 关间奇遇 */
  maybeStageEventThen(nextFn) {
    const ev = game.rollStageEvent && game.rollStageEvent();
    if (!ev) {
      nextFn();
      return;
    }
    this.showStageEvent(ev, nextFn);
  },

  showStageEvent(ev, nextFn) {
    const overlay = this.$('modal-overlay');
    const title = this.$('modal-title');
    const body = this.$('modal-body');
    const opts = this.$('modal-options');
    if (!overlay || !title || !body || !opts) {
      nextFn();
      return;
    }
    title.textContent = `奇遇 · ${ev.name}`;
    body.innerHTML = `<p style="color:var(--muted);line-height:1.65;margin:0 0 8px">${ev.desc}</p>`;
    opts.innerHTML = '';
    const finish = (r, ch) => {
      overlay.classList.remove('show');
      const cancel = this.$('modal-cancel');
      if (cancel) cancel.textContent = '取消';
      if (r && r.ok && ch) this.toast(`奇遇：${ch.label}`);
      if (r && r.openQipai) this.startQipaiSelect('battle');
      else nextFn();
    };
    (ev.choices || []).forEach(ch => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-opt';
      btn.textContent = ch.label;
      btn.onclick = () => {
        const r = game.applyStageEventChoice(ev.id, ch.id);
        if (!r.ok) {
          this.toast(r.reason || '无法选择');
          this.shake(btn);
          return;
        }
        this.sfx('shop');
        finish(r, ch);
      };
      opts.appendChild(btn);
    });
    const cancel = this.$('modal-cancel');
    if (cancel) {
      cancel.textContent = '随机一项';
      cancel.onclick = () => {
        const ch = ev.choices[Math.floor(game.random() * ev.choices.length)];
        const r = game.applyStageEventChoice(ev.id, ch.id);
        if (r.ok) this.sfx('shop');
        finish(r, ch);
      };
    }
    overlay.classList.add('show');
  },

  renderHelp() {
    const gal = this.$('hand-type-gallery');
    if (gal && typeof ASSETS !== 'undefined' && typeof HAND_TYPES !== 'undefined') {
      gal.innerHTML = Object.values(HAND_TYPES).map(h => {
        const ico = ASSETS.handIcon(h.id);
        return `<div class="hand-type-item">
          <span class="hand-type-pic" style="background-image:url('${ico}')"></span>
          <div class="hand-type-meta"><b>${h.name}</b><span>气 ×${h.qi.toFixed(2)}</span></div>
        </div>`;
      }).join('');
    }
    this.showScreen('help');
  },

  renderCodex(filter) {
    if (filter !== undefined) this._codexFilter = filter;
    const f = this._codexFilter || 'all';
    const grid = this.$('codex-grid');
    const tabs = this.$('codex-tabs');
    const seen = new Set(game.meta.seenQipai || []);
    const total = QIPAI_POOL.length;
    const seenN = seen.size;
    this.$('codex-desc').textContent = `已见 ${seenN} / ${total} · 遭遇或装备后收录 · 卡池上限 ≤${game.meta.poolUnlock || 0}`;

    const fill = this.$('codex-progress-fill');
    if (fill) fill.style.width = `${total ? Math.round((seenN / total) * 100) : 0}%`;

    const statsEl = this.$('codex-rarity-stats');
    if (statsEl) {
      statsEl.innerHTML = (CODEX_RARITY_ORDER || ['common', 'rare', 'legend', 'cursed']).map(r => {
        const list = QIPAI_POOL.filter(q => q.rarity === r);
        const s = list.filter(q => seen.has(q.id)).length;
        return `<span class="codex-stat" style="--rc:${RARITY_COLOR[r]}">${RARITY_LABEL[r]} ${s}/${list.length}</span>`;
      }).join('');
    }

    if (tabs) {
      tabs.innerHTML = '';
      (CODEX_RARITY_TABS || [{ id: 'all', name: '全部' }]).forEach(tab => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'codex-tab' + (f === tab.id ? ' active' : '');
        let countLabel = tab.name;
        if (tab.id === 'all') countLabel = `全部 ${seenN}/${total}`;
        else if (tab.id === 'seen') countLabel = `已见 ${seenN}`;
        else if (tab.id === 'unseen') countLabel = `未见 ${total - seenN}`;
        else {
          const list = QIPAI_POOL.filter(q => q.rarity === tab.id);
          const s = list.filter(q => seen.has(q.id)).length;
          countLabel = `${tab.name} ${s}/${list.length}`;
        }
        btn.textContent = countLabel;
        btn.onclick = () => this.renderCodex(tab.id);
        tabs.appendChild(btn);
      });
    }

    grid.innerHTML = '';
    let list = QIPAI_POOL.slice();
    if (f === 'seen') list = list.filter(q => seen.has(q.id));
    else if (f === 'unseen') list = list.filter(q => !seen.has(q.id));
    else if (f !== 'all') list = list.filter(q => q.rarity === f);

    list.sort((a, b) => {
      const ra = (CODEX_RARITY_ORDER || []).indexOf(a.rarity);
      const rb = (CODEX_RARITY_ORDER || []).indexOf(b.rarity);
      if (ra !== rb) return ra - rb;
      return (a.unlock || 0) - (b.unlock || 0);
    });

    list.forEach(q => {
      const isSeen = seen.has(q.id);
      const poolOpen = (q.unlock || 0) <= (game.meta.poolUnlock || 0);
      const div = document.createElement('article');
      div.className = 'codex-card rarity-' + (q.rarity || 'common') + (isSeen ? ' seen' : ' locked');
      div.tabIndex = 0;
      div.setAttribute('role', 'button');
      const frame = (typeof ASSETS !== 'undefined') ? ASSETS.frameForRarity(q.rarity) : '';
      const icon = (typeof ASSETS !== 'undefined') ? ASSETS.qipaiIcon(q, isSeen) : '';
      const name = isSeen ? q.name : (poolOpen ? '？？？' : '未开池');
      const desc = isSeen ? q.desc : (poolOpen ? '遭遇或装备后收录全貌' : `卡池需求阅历 ≥ ${q.unlock || 0}`);
      const foot = isSeen ? '已收录' : poolOpen ? '待收录' : '池未开';
      const rc = RARITY_COLOR[q.rarity] || '#a0aec0';
      const safeDesc = String(desc).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      div.innerHTML = `
        <div class="codex-card-art">
          <div class="codex-card-frame" style="${frame ? `background-image:url('${frame}')` : ''}"></div>
          <span class="codex-card-icon" style="${icon ? `background-image:url('${icon}')` : ''}"></span>
          <span class="codex-rarity-badge" style="color:${rc};border-color:${rc}66;background:${rc}18">${RARITY_LABEL[q.rarity] || ''}</span>
        </div>
        <div class="codex-card-body">
          <div class="codex-card-name" style="color:${isSeen ? rc : 'var(--muted)'}">${name}</div>
          <div class="codex-card-desc" title="${safeDesc}">${desc}</div>
          <div class="codex-card-foot">${foot}</div>
        </div>
      `;
      const open = () => this.showCodexDetail(q, isSeen, poolOpen);
      div.onclick = open;
      div.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      };
      grid.appendChild(div);
    });
    this.showScreen('codex');
  },

  showCodexDetail(q, isSeen, poolOpen) {
    const overlay = this.$('codex-detail-overlay');
    if (!overlay || !q) return;
    const frame = (typeof ASSETS !== 'undefined') ? ASSETS.frameForRarity(q.rarity) : '';
    const icon = (typeof ASSETS !== 'undefined') ? ASSETS.qipaiIcon(q, isSeen) : '';
    const frameEl = this.$('codex-detail-frame');
    if (frameEl) frameEl.style.backgroundImage = frame ? `url('${frame}')` : '';
    const art = this.$('codex-detail-art');
    if (art) {
      art.style.backgroundImage = icon ? `url('${icon}')` : '';
      art.className = 'codex-detail-art rarity-' + (q.rarity || 'common') + (isSeen ? '' : ' locked');
    }
    const rEl = this.$('codex-detail-rarity');
    const nEl = this.$('codex-detail-name');
    const dEl = this.$('codex-detail-desc');
    const mEl = this.$('codex-detail-meta');
    const rc = RARITY_COLOR[q.rarity] || '';
    if (rEl) {
      rEl.textContent = RARITY_LABEL[q.rarity] || '';
      rEl.style.color = rc;
    }
    if (nEl) {
      nEl.textContent = isSeen ? q.name : '？？？';
      nEl.style.color = isSeen ? rc : '';
    }
    if (dEl) {
      dEl.textContent = isSeen
        ? q.desc
        : (poolOpen
          ? '尚未收录。在论道中获得或遭遇后即可解锁完整信息。'
          : `需在阅历商店将卡池开至 ≥ ${q.unlock || 0}`);
    }
    if (mEl) {
      mEl.innerHTML = isSeen
        ? `<span>卡池门槛 ${q.unlock || 0}</span><span>主题 ${typeof ASSETS !== 'undefined' ? ASSETS.qipaiThemeKey(q) : '—'}</span>`
        : `<span>卡池门槛 ${q.unlock || 0}</span><span>${poolOpen ? '池已开 · 待收录' : '池未开'}</span>`;
    }
    overlay.classList.add('show');
  },

  hideCodexDetail() {
    const overlay = this.$('codex-detail-overlay');
    if (overlay) overlay.classList.remove('show');
  },

  renderAchieve(filterCat) {
    if (filterCat !== undefined) this._achieveFilter = filterCat;
    const filter = this._achieveFilter || 'all';
    const grid = this.$('achieve-grid');
    const tabs = this.$('achieve-tabs');
    const done = Object.keys(game.meta.achievements || {}).length;
    const totalY = ACHIEVEMENTS.reduce((s, a) => s + (game.meta.achievements[a.id] ? (a.yueli || 0) : 0), 0);
    this.$('achieve-desc').textContent = `已完成 ${done} / ${ACHIEVEMENTS.length} · 成就阅历 +${totalY}`;

    if (tabs) {
      tabs.innerHTML = '';
      const makeTab = (id, label) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'achieve-tab' + (filter === id ? ' active' : '');
        btn.textContent = label;
        btn.onclick = () => this.renderAchieve(id);
        tabs.appendChild(btn);
      };
      makeTab('all', `全部 ${done}/${ACHIEVEMENTS.length}`);
      (typeof ACHIEVE_CATS !== 'undefined' ? ACHIEVE_CATS : []).forEach(c => {
        const list = ACHIEVEMENTS.filter(a => a.cat === c.id);
        const d = list.filter(a => game.meta.achievements[a.id]).length;
        makeTab(c.id, `${c.name} ${d}/${list.length}`);
      });
      makeTab('locked', '未完成');
      makeTab('done', '已完成');
    }

    grid.innerHTML = '';
    const list = ACHIEVEMENTS.filter(a => {
      const ok = !!game.meta.achievements[a.id];
      if (filter === 'all') return true;
      if (filter === 'locked') return !ok;
      if (filter === 'done') return ok;
      return a.cat === filter;
    });

    // 已完成靠后 / 分类内按 yueli 升序
    list.sort((a, b) => {
      const oa = game.meta.achievements[a.id] ? 1 : 0;
      const ob = game.meta.achievements[b.id] ? 1 : 0;
      if (oa !== ob) return oa - ob;
      return (a.yueli || 0) - (b.yueli || 0);
    });

    list.forEach(a => {
      const ok = !!game.meta.achievements[a.id];
      const div = document.createElement('div');
      const tier = a.tier || (typeof ASSETS !== 'undefined' ? ASSETS._tierFromYueli(a.yueli) : 'bronze');
      div.className = 'achieve-card tier-' + tier + (ok ? ' done' : ' locked');
      const badge = (typeof ASSETS !== 'undefined') ? ASSETS.achieveBadge(a, ok) : '';
      const catName = (typeof ACHIEVE_CATS !== 'undefined'
        ? (ACHIEVE_CATS.find(c => c.id === a.cat) || {}).name
        : '') || '';
      const prog = !ok && game.getAchieveProgress ? game.getAchieveProgress(a) : null;
      let progHtml = '';
      if (prog && prog.target > 0) {
        const pct = Math.round(prog.pct * 100);
        progHtml = `
          <div class="achieve-progress">
            <div class="achieve-progress-bar"><i style="width:${pct}%"></i></div>
            <span class="achieve-progress-text">${prog.raw}/${prog.target}</span>
          </div>`;
      }
      div.innerHTML = `
        ${badge ? `<span class="achieve-badge" style="background-image:url('${badge}')"></span>` : ''}
        <div class="achieve-body">
          <div class="achieve-top">
            <div class="name">${ok ? '✓ ' : ''}${a.name}</div>
            ${catName ? `<span class="achieve-cat">${catName}</span>` : ''}
          </div>
          <div class="achieve-desc-line">${a.desc}</div>
          ${progHtml}
          <div class="reward">奖励阅历 +${a.yueli} · ${tier === 'diamond' ? '钻石' : tier === 'gold' ? '金' : tier === 'silver' ? '银' : '铜'}</div>
        </div>
      `;
      grid.appendChild(div);
    });
    this.showScreen('achieve');
  },

  renderMetaShop(filterCat) {
    if (filterCat !== undefined) this._metaFilter = filterCat;
    const f = this._metaFilter || 'all';
    const avail = game.availableYueli();
    const total = game.meta.totalYueli || 0;
    const spent = game.meta.spentYueli || 0;
    const pool = game.meta.poolUnlock || 80;

    // 摘要
    const sum = this.$('meta-summary');
    if (sum) {
      const owned = META_SHOP.filter(it => {
        if (it.type === 'pool') return pool >= it.maxUnlock;
        return game.metaLevel(it.id) > 0;
      }).length;
      sum.innerHTML = `
        <div class="meta-stat-card is-main">
          <span class="ms-label">可用阅历</span>
          <strong class="ms-value" id="meta-yueli">${avail}</strong>
        </div>
        <div class="meta-stat-card">
          <span class="ms-label">累计获得</span>
          <strong class="ms-value">${total}</strong>
        </div>
        <div class="meta-stat-card">
          <span class="ms-label">已花费</span>
          <strong class="ms-value">${spent}</strong>
        </div>
        <div class="meta-stat-card">
          <span class="ms-label">卡池门槛</span>
          <strong class="ms-value">≤${pool >= 9999 ? '全开' : pool}</strong>
        </div>
        <div class="meta-stat-card">
          <span class="ms-label">已购项目</span>
          <strong class="ms-value">${owned}/${META_SHOP.length}</strong>
        </div>
      `;
    }

    // 洞察：牌客 / 下一池 / 推荐
    const insight = this.$('meta-insight');
    if (insight) {
      const lockedChars = CHARACTERS.filter(c => (c.unlockYueli || 0) > total)
        .sort((a, b) => (a.unlockYueli || 0) - (b.unlockYueli || 0));
      const nextChar = lockedChars[0];
      const nextPool = META_SHOP.filter(x => x.type === 'pool' && pool < x.maxUnlock)
        .sort((a, b) => a.maxUnlock - b.maxUnlock)[0];
      const poolCount = QIPAI_POOL.filter(q => (q.unlock || 0) <= pool).length;
      const bits = [];
      bits.push(`<div class="insight-chip">当前可抽奇牌约 <b>${poolCount}</b> / ${QIPAI_POOL.length}</div>`);
      if (nextChar) {
        bits.push(`<div class="insight-chip">下一牌客 <b>${nextChar.name}</b> · 累计阅历 ${nextChar.unlockYueli}（还差 ${Math.max(0, nextChar.unlockYueli - total)}）</div>`);
      } else {
        bits.push('<div class="insight-chip is-good">全部牌客已按阅历解锁</div>');
      }
      if (nextPool) {
        bits.push(`<div class="insight-chip is-rec">推荐下一购：<b>${nextPool.name}</b>（${nextPool.cost} 阅历）</div>`);
      } else if (avail >= 40) {
        const cheap = META_SHOP.find(it => {
          if (it.type === 'pool') return false;
          const lv = game.metaLevel(it.id);
          return (!it.max || lv < it.max) && it.cost <= avail;
        });
        if (cheap) bits.push(`<div class="insight-chip is-rec">可购：<b>${cheap.name}</b>（${cheap.cost} 阅历）</div>`);
      }
      insight.innerHTML = bits.join('');
    }

    // 分类页签
    const tabs = this.$('meta-tabs');
    if (tabs) {
      tabs.innerHTML = '';
      (META_SHOP_CATS || [{ id: 'all', name: '全部' }]).forEach(cat => {
        const n = cat.id === 'all'
          ? META_SHOP.length
          : META_SHOP.filter(x => (x.cat || 'utility') === cat.id).length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'meta-tab' + (f === cat.id ? ' active' : '');
        btn.textContent = `${cat.name} ${n}`;
        btn.onclick = () => this.renderMetaShop(cat.id);
        tabs.appendChild(btn);
      });
    }

    const list = this.$('meta-shop-list');
    if (!list) {
      this.showScreen('meta');
      return;
    }
    list.innerHTML = '';

    let items = META_SHOP.slice();
    if (f !== 'all') items = items.filter(x => (x.cat || 'utility') === f);

    // 分组标题
    const catOrder = ['pool', 'start', 'combat', 'growth', 'utility'];
    const catName = Object.fromEntries((META_SHOP_CATS || []).map(c => [c.id, c.name]));
    const groups = f === 'all'
      ? catOrder.map(c => ({ id: c, items: items.filter(x => (x.cat || 'utility') === c) })).filter(g => g.items.length)
      : [{ id: f, items }];

    const formatEffect = (item, lv, maxed) => {
      if (item.type === 'pool') {
        return maxed
          ? `已生效：卡池 ≤${item.maxUnlock >= 9999 ? '全开' : item.maxUnlock}`
          : `购置后：卡池门槛 → ≤${item.maxUnlock >= 9999 ? '全部' : item.maxUnlock}`;
      }
      if (!lv) return '尚未购置 · 购买后永久生效';
      if (item.effectHint) {
        const v = (item.amount || 1) * lv;
        const vStr = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
        const pct = Math.round(Math.abs((item.amount || 0) * lv) * 100);
        return `当前：${item.effectHint
          .replace(/\{v\}/g, vStr)
          .replace(/\{lv\}/g, String(lv))
          .replace(/\{pct\}/g, String(pct))}`;
      }
      return `等级 ${lv}/${item.max || 1}`;
    };

    // 推荐：下一卡池 或 最便宜未满
    const recId = (() => {
      const np = META_SHOP.filter(x => x.type === 'pool' && pool < x.maxUnlock)
        .sort((a, b) => a.maxUnlock - b.maxUnlock)[0];
      if (np && avail >= np.cost) return np.id;
      const buyable = META_SHOP.filter(it => {
        if (it.type === 'pool') return pool < it.maxUnlock;
        const lv = game.metaLevel(it.id);
        return (!it.max || lv < it.max) && avail >= it.cost;
      }).sort((a, b) => a.cost - b.cost);
      return buyable[0]?.id || null;
    })();

    groups.forEach(g => {
      if (f === 'all') {
        const h = document.createElement('div');
        h.className = 'meta-group-title';
        h.textContent = catName[g.id] || g.id;
        list.appendChild(h);
      }
      g.items.forEach(item => {
        const lv = game.metaLevel(item.id);
        const isPool = item.type === 'pool';
        const maxed = isPool
          ? pool >= item.maxUnlock
          : !!(item.max && lv >= item.max);
        const canBuy = !maxed && avail >= item.cost;
        const short = !maxed && avail < item.cost;
        const effect = formatEffect(item, lv, maxed);

        const maxLabel = isPool ? 1 : (item.max || 1);
        const curLabel = isPool ? (maxed ? 1 : 0) : lv;
        const pct = Math.round((curLabel / maxLabel) * 100);

        const div = document.createElement('div');
        div.className = 'meta-item'
          + (maxed ? ' is-maxed' : '')
          + (short ? ' is-short' : '')
          + (canBuy ? ' is-buyable' : '')
          + (recId === item.id ? ' is-rec' : '');

        div.innerHTML = `
          <div class="meta-item-main">
            <div class="meta-item-top">
              <span class="meta-item-name">${item.name}</span>
              <span class="meta-item-cat">${catName[item.cat] || ''}</span>
              ${recId === item.id ? '<span class="meta-rec-tag">推荐</span>' : ''}
              ${item.tip ? `<span class="meta-tip-tag">${item.tip}</span>` : ''}
            </div>
            <div class="meta-item-desc">${item.desc}</div>
            <div class="meta-item-effect">${effect}</div>
            <div class="meta-item-bar" title="进度 ${curLabel}/${maxLabel}">
              <i style="width:${pct}%"></i>
            </div>
          </div>
          <div class="meta-item-side">
            <div class="meta-item-cost ${short ? 'short' : ''} ${maxed ? 'maxed' : ''}">
              ${maxed ? '已满' : `${item.cost} 阅历`}
            </div>
            <div class="meta-item-lv">${isPool ? (maxed ? '已开' : '未开') : `${lv}/${item.max || 1}`}</div>
            <button type="button" class="btn btn-secondary btn-small meta-buy-btn" ${maxed || short ? 'disabled' : ''}>
              ${maxed ? '已购置' : short ? '阅历不足' : '购置'}
            </button>
          </div>
        `;
        const btn = div.querySelector('.meta-buy-btn');
        if (btn && !maxed) {
          btn.onclick = () => {
            const r = game.buyMeta(item.id);
            if (!r.ok) this.toast(r.reason || '无法购买');
            else {
              this.sfx('shop');
              this.toast(`已购置【${item.name}】`);
              this.renderMetaShop(f);
            }
          };
        }
        list.appendChild(div);
      });
    });

    this.showScreen('meta');
  },

  renderWeekly() {
    const w = getWeeklyChallenge();
    this.$('weekly-key').textContent = `${w.key} · 每周一刷新主题`;
    this.$('weekly-name').textContent = w.challenge.name;
    this.$('weekly-desc').textContent = w.challenge.desc;
    const st = game.meta.weekly || {};
    const same = st.key === w.key;
    this.$('weekly-status').innerHTML = same
      ? `本周尝试 ${st.attempts || 0} 次 · 最高通关 ${st.bestStages || 0} 局 · ${st.completed ? '<span style="color:var(--green)">已领周常奖</span>' : '通关 6 局可领周常阅历'}`
      : '尚未挑战本周禁宗';
    // 周常横幅
    const panel = this.$('weekly-panel');
    if (panel && typeof ASSETS !== 'undefined') {
      let banner = panel.querySelector('.weekly-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'weekly-banner';
        panel.insertBefore(banner, panel.firstChild);
      }
      banner.style.backgroundImage = `url('${ASSETS.ui.weeklyBanner}')`;
    }
    this.showScreen('weekly');
  },

  renderRank() {
    const lb = game.meta.leaderboard || {};
    const fmt = (x) => {
      if (!x) return '<div style="color:var(--muted)">暂无纪录</div>';
      const t = x.t ? new Date(x.t).toLocaleString() : '';
      return `<div class="history-row">
        <strong>${x.char || ''} · ${x.diff || ''} · ${x.mode || ''}</strong>
        <span>关卡 ${x.stages || 0} · 总分 ${x.score || 0}${x.endless ? ` · 无尽${x.endless}` : ''}${x.maxHand ? ` · 最大手 ${x.maxHand}` : ''}</span>
        <span>${(x.qipai || []).join('、')}</span>
        <span style="opacity:0.6">${t}</span>
        ${x.share ? `<button class="btn btn-ghost btn-small" data-code="${x.share}">复制构筑码</button>` : ''}
      </div>`;
    };
    const best = this.$('rank-best');
    best.innerHTML = `
      <div style="margin-bottom:12px"><b style="color:var(--gold-light)">最深远征</b>${fmt(lb.bestStageRun)}</div>
      <div style="margin-bottom:12px"><b style="color:var(--gold-light)">无尽巅峰</b>${fmt(lb.bestEndless)}</div>
      <div style="margin-bottom:12px"><b style="color:var(--gold-light)">最强一手</b>${fmt(lb.bestHand)}</div>
      <div><b style="color:var(--gold-light)">周常最佳</b>${fmt(lb.weeklyBest)}</div>
    `;
    best.querySelectorAll('[data-code]').forEach(btn => {
      btn.onclick = () => {
        this.copyText(btn.getAttribute('data-code')).then(() => this.toast('已复制')).catch(() => this.toast('复制失败'));
      };
    });

    const hist = this.$('rank-history');
    const list = game.meta.runHistory || [];
    if (!list.length) hist.innerHTML = '<div style="color:var(--muted)">还没有历史论道</div>';
    else {
      hist.innerHTML = list.map(h => `
        <div class="history-row">
          <strong>${h.won ? '✓' : '✗'} ${h.char} · ${h.diff} · ${h.mode}</strong>
          <span>关卡 ${h.stages} · 分 ${h.score}${h.endless ? ` · 无尽${h.endless}` : ''}</span>
          <span>${(h.qipai || []).join('、')}</span>
          ${h.share ? `<button class="btn btn-ghost btn-small" data-code="${h.share}">复制构筑码</button>` : ''}
        </div>
      `).join('');
      hist.querySelectorAll('[data-code]').forEach(btn => {
        btn.onclick = () => {
          this.copyText(btn.getAttribute('data-code')).then(() => this.toast('已复制')).catch(() => this.toast('复制失败'));
        };
      });
    }
    this.showScreen('rank');
  },

  async importBuildFlow() {
    // 优先用存档弹层；无则退回 prompt
    const ta = this.$('save-modal-text');
    const title = this.$('save-modal-title');
    const apply = this.$('btn-save-modal-apply');
    const copy = this.$('btn-save-modal-copy');
    if (ta && title) {
      this._saveModalMode = 'build';
      title.textContent = '导入构筑分享码';
      ta.value = '';
      ta.placeholder = '粘贴 PZ1… 构筑码';
      if (apply) apply.style.display = 'inline-flex';
      if (copy) copy.style.display = 'none';
      const hint = this.$('save-modal-hint');
      if (hint) hint.textContent = '导入后将锁定角色与难度，请再选择模式出战。';
      this.showSaveModal();
      return;
    }
    const code = prompt('粘贴构筑分享码（PZ1…）');
    if (!code) return;
    this.applyImportBuildCode(code);
  },

  applyImportBuildCode(code) {
    const decoded = BuildShare.decode(String(code || '').trim());
    if (!decoded) {
      this.toast('分享码无效');
      return false;
    }
    const ok = confirm(`解析成功：\n${BuildShare.summary(decoded)}\n\n将以该构筑开局（奇牌+心法），是否继续选模式？`);
    if (!ok) return false;
    this._importBuild = decoded;
    this.selectedCharId = decoded.character.id;
    this.selectedDifficulty = decoded.difficulty.id;
    this.toast('构筑已就绪，请选择模式后出战');
    this.hideSaveModal();
    this.renderModeSelect('normal');
    return true;
  },

  // ===== 存档导出 / 导入 =====
  showSaveModal() {
    const ov = this.$('save-modal-overlay');
    if (ov) ov.classList.add('show');
  },

  hideSaveModal() {
    const ov = this.$('save-modal-overlay');
    if (ov) ov.classList.remove('show');
    this._saveModalMode = null;
  },

  exportSave() {
    const text = game.exportMetaSave();
    const ta = this.$('save-modal-text');
    const title = this.$('save-modal-title');
    const apply = this.$('btn-save-modal-apply');
    const copy = this.$('btn-save-modal-copy');
    const hint = this.$('save-modal-hint');
    this._saveModalMode = 'export';
    if (title) title.textContent = '导出存档';
    if (ta) {
      ta.value = text;
      ta.readOnly = true;
    }
    if (apply) apply.style.display = 'none';
    if (copy) copy.style.display = 'inline-flex';
    if (hint) {
      hint.textContent = `可用阅历 ${game.availableYueli()} · 累计 ${game.meta.totalYueli || 0} · 请复制全文妥善保存。换设备可在「导入存档」粘贴恢复。`;
    }
    this.showSaveModal();
    // 尝试下载文件
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `paizong-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (_) {}
    this.toast('存档已生成，可复制或下载 JSON');
  },

  importSaveFlow() {
    const ta = this.$('save-modal-text');
    const title = this.$('save-modal-title');
    const apply = this.$('btn-save-modal-apply');
    const copy = this.$('btn-save-modal-copy');
    const hint = this.$('save-modal-hint');
    this._saveModalMode = 'import';
    if (title) title.textContent = '导入存档';
    if (ta) {
      ta.value = '';
      ta.readOnly = false;
      ta.placeholder = '粘贴完整存档 JSON…';
    }
    if (apply) {
      apply.style.display = 'inline-flex';
      apply.textContent = '确认导入';
    }
    if (copy) copy.style.display = 'none';
    if (hint) {
      hint.textContent = '警告：导入将覆盖当前本机进度。建议先导出备份。';
    }
    this.showSaveModal();
  },

  copySaveModalText() {
    const ta = this.$('save-modal-text');
    if (!ta || !ta.value) {
      this.toast('没有可复制内容');
      return;
    }
    this.copyText(ta.value).then(() => {
      this.sfx('click');
      this.toast('已复制到剪贴板');
    }).catch(() => {
      ta.select();
      this.toast('请手动 Ctrl+C 复制');
    });
  },

  applySaveModalImport() {
    const ta = this.$('save-modal-text');
    const raw = ta ? ta.value : '';
    if (this._saveModalMode === 'build') {
      this.applyImportBuildCode(raw);
      return;
    }
    if (!raw.trim()) {
      this.toast('请先粘贴存档内容');
      return;
    }
    if (!confirm('确定导入？将覆盖当前本机阅历/成就/图鉴等进度。')) return;
    const r = game.importMetaSave(raw);
    if (!r.ok) {
      this.toast(r.reason || '导入失败');
      return;
    }
    this.hideSaveModal();
    this.sfx('shop');
    this.toast('存档已恢复');
    this.renderTitle();
  },
};

// 绑定按钮
function on(id, handler) {
  const el = UI.$(id);
  if (!el) {
    console.warn('[牌宗] 缺少按钮:', id);
    return;
  }
  el.onclick = handler;
}

function bindUI() {
  const warnOverwriteRun = () => {
    if (!game.hasRunSave || !game.hasRunSave()) return true;
    return confirm('已有未完成的论道断点。开始新局将覆盖该断点，确定？');
  };
  on('btn-start', () => {
    if (!warnOverwriteRun()) return;
    UI.sfx('click');
    UI.renderModeSelect('normal');
  });
  on('btn-endless', () => {
    if (!warnOverwriteRun()) return;
    UI.sfx('click');
    UI.renderModeSelect('endless');
  });
  on('btn-daily', () => {
    if (!warnOverwriteRun()) return;
    UI.sfx('click');
    UI.renderModeSelect('daily');
  });
  on('btn-weekly', () => { UI.sfx('click'); UI.renderWeekly(); });
  on('btn-puzzle', () => { UI.sfx('click'); UI.renderPuzzleSelect(); });
  on('btn-puzzle-back', () => UI.renderTitle());
  on('btn-retry-last', () => {
    if (!warnOverwriteRun()) return;
    UI.retryLastSetup();
  });
  on('btn-tutorial', () => { UI.sfx('click'); UI.startTutorial(true); });
  on('guide-next', () => UI.guideNext());
  on('guide-skip', () => UI.guideSkip());
  on('btn-help-tutorial', () => {
    UI.sfx('click');
    UI.startTutorial(true);
  });
  window.addEventListener('resize', () => {
    if (UI._guideActive && typeof TUTORIAL_STEPS !== 'undefined') {
      const step = TUTORIAL_STEPS[game.meta.tutorialIndex || 0];
      if (step) {
        UI.guidePlaceHighlight(step);
        UI.guidePlaceCard(step);
      }
    }
  });
  on('btn-weekly-back', () => UI.renderTitle());
  on('btn-weekly-start', () => {
    if (!warnOverwriteRun()) return;
    UI.sfx('click');
    UI.renderModeSelect('weekly');
  });
  on('btn-rank', () => { UI.sfx('click'); UI.renderRank(); });
  on('btn-rank-back', () => UI.renderTitle());
  on('btn-import', () => UI.importBuildFlow());
  on('btn-mode-back', () => UI.renderTitle());
  on('btn-mode-next', () => { UI.sfx('click'); UI.renderCharSelect(); });
  on('btn-help', () => UI.renderHelp());
  on('btn-help-back', () => UI.renderTitle());
  on('btn-meta', () => UI.renderMetaShop());
  on('btn-codex', () => UI.renderCodex());
  on('btn-achieve', () => UI.renderAchieve());
  on('btn-meta-back', () => UI.renderTitle());
  on('btn-codex-back', () => UI.renderTitle());
  on('btn-codex-detail-close', () => UI.hideCodexDetail());
  {
    const codexOv = UI.$('codex-detail-overlay');
    if (codexOv) {
      codexOv.addEventListener('click', (e) => {
        if (e.target === codexOv) UI.hideCodexDetail();
      });
    }
  }
  on('btn-achieve-back', () => UI.renderTitle());
  on('btn-char-confirm', () => UI.confirmChar());
  on('btn-char-back', () => UI.renderModeSelect(UI.selectedMode || 'normal'));
  on('btn-map-start', () => { UI.sfx('click'); UI.startFromMap(); });
  on('btn-map-back', () => {
    if (UI.abandonCurrentRun('退出本次论道？局内进度将丢失（阅历已结算部分保留）。')) {
      UI.renderTitle();
    }
  });
  // 注意：keydown 仅在 bindUI 注册一套，勿在 DOMContentLoaded 再绑
  on('btn-qipai-confirm', () => { UI.sfx('shop'); UI.confirmQipai(); });
  on('btn-skip-qipai', () => UI.skipQipai());
  on('btn-draw', () => UI.onDraw());
  on('btn-zongshi', () => UI.onZongshi());
  on('btn-zongshi-m', () => UI.onZongshi());
  on('btn-clear-sel', () => {
    UI.clearHandSelection();
    UI.sfx('select');
  });
  on('btn-multi-toggle', () => UI.toggleMultiSelectMode());
  on('btn-play', () => UI.onPlay());
  on('btn-pass', () => UI.onPass());
  on('btn-hint', () => UI.onHint());
  on('btn-peek', () => UI.onPeek());
  on('btn-result-next', () => UI.resultNext());
  on('btn-result-shop', () => UI.renderShop(true));
  on('btn-result-retry', () => UI.resultRetry());
  on('btn-result-home', () => {
    // 失败回标题：本局已结束，清断点；胜利一般走藏经阁，若直接回也清
    if (game.battle?.status === 'lost' || game.battle?.status === 'won') {
      if (typeof game.abandonRun === 'function') game.abandonRun();
      else {
        game.run = null;
        game.battle = null;
        if (game.clearRunSave) game.clearRunSave();
      }
      UI.shopQipaiChoices = [];
    }
    UI.renderTitle();
  });
  on('btn-shop-leave', () => UI.leaveShop());
  on('btn-battle-menu', () => {
    if (UI.abandonCurrentRun('确定退出本局？未结算进度将丢失。')) {
      UI.renderTitle();
    }
  });
  on('btn-continue-run', () => {
    UI.sfx('click');
    UI.resumeFromSave();
  });
  on('btn-copy-share', () => {
    const code = UI._lastShare || game.exportShareCode();
    UI.copyText(code).then(() => { UI.sfx('click'); UI.toast('构筑码已复制'); })
      .catch(() => UI.toast('复制失败，请手动选择'));
  });
  on('btn-sfx-toggle', () => {
    if (typeof SFX !== 'undefined') {
      SFX.toggle();
      UI.updateSfxButton();
    }
  });

  // 战斗快捷键
  document.addEventListener('keydown', (e) => {
    if (UI.screen !== 'battle') return;
    if (UI.aiThinking || UI.animating) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    const key = e.key;
    if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      // 未选牌时空格=提示；已选可出则出牌
      if (!game.battle?.selectedIds?.size) UI.onHint();
      else if (game.canPlaySelected()) UI.onPlay();
      else UI.onHint();
    } else if (key === 'p' || key === 'P') {
      e.preventDefault();
      UI.onPass();
    } else if (key === 'h' || key === 'H') {
      e.preventDefault();
      UI.onHint();
    } else if (key === 'd' || key === 'D') {
      e.preventDefault();
      UI.onDraw();
    } else if (key === 'z' || key === 'Z') {
      e.preventDefault();
      UI.onZongshi();
    } else if (key === 'Tab') {
      // Tab 轮换当前方案
      e.preventDefault();
      const b = game.battle;
      if (!b || b.turn !== 'player') return;
      const ids = [...(b.selectedIds || [])];
      if (ids.length) {
        game.toggleSelect(ids[0], { multi: false });
        UI.renderHand();
        UI.updateHandHint();
        UI.syncPlayButtons();
        UI.sfx('select');
      } else {
        UI.onHint();
      }
    } else if (key === 'Escape') {
      UI.clearHandSelection();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  UI.updateSfxButton();
  // 出牌/过牌按钮图标
  if (typeof ASSETS !== 'undefined') {
    const icoPass = UI.$('ico-pass');
    const icoPlay = UI.$('ico-play');
    const icoHint = UI.$('ico-hint');
    if (icoPass) icoPass.style.backgroundImage = `url('${ASSETS.icons.pass}')`;
    if (icoPlay) icoPlay.style.backgroundImage = `url('${ASSETS.icons.play}')`;
    if (icoHint) icoHint.style.backgroundImage = `url('${ASSETS.icons.hint}')`;
  }
  if (typeof preloadAssets === 'function') preloadAssets();
  UI.renderTitle();

  // 刷新后有断点：询问是否继续
  if (game.hasRunSave && game.hasRunSave()) {
    const sum = game.runSaveSummary ? game.runSaveSummary() : null;
    const tip = sum
      ? `检测到未完成的论道：${sum.charName} · ${sum.stage} · ${sum.phaseLabel}\n是否继续？\n\n选「取消」可稍后点标题「继续论道」，或放弃本局。`
      : '检测到未完成的论道，是否继续？';
    // 延迟一帧，避免挡住标题渲染
    setTimeout(() => {
      if (!game.hasRunSave || !game.hasRunSave()) return;
      const go = confirm(tip);
      if (go) UI.resumeFromSave();
      else {
        // 再问是否放弃
        const drop = confirm('要放弃这局未完成的论道吗？\n选「取消」将保留断点，可稍后继续。');
        if (drop) {
          if (typeof game.abandonRun === 'function') game.abandonRun();
          else if (game.clearRunSave) game.clearRunSave();
          UI.renderTitle();
          UI.toast('已放弃未竟论道');
        }
      }
    }, 360);
  }

  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.onclick = () => {
      const n = btn.getAttribute('data-nav');
      // 论道中途离开 hub：先确认；离开前先落盘断点，再决定是否放弃
      const inRun = !!(game.run && UI.screen !== 'title' && UI.screen !== 'help');
      const leaveRunScreens = ['weekly', 'rank', 'codex', 'achieve', 'meta', 'help'];
      if (inRun && leaveRunScreens.includes(n)) {
        UI.persistRun(UI.screen);
        const ok = confirm('离开当前界面？\n未结算进度已自动保存，可从标题「继续论道」恢复。\n若要放弃本局请点确定后再在标题选择放弃，或直接从战斗/路图退出。');
        if (!ok) return;
        // 浏览 hub 时保留 run + 断点，不强制清局
      }
      UI.sfx('click');
      if (n === 'help') UI.renderHelp();
      if (n === 'codex') UI.renderCodex();
      if (n === 'achieve') UI.renderAchieve();
      if (n === 'meta') UI.renderMetaShop();
      if (n === 'weekly') UI.renderWeekly();
      if (n === 'rank') UI.renderRank();
    };
  });

  // 存档导入/导出
  on('btn-export-save', () => UI.exportSave());
  on('btn-import-save', () => UI.importSaveFlow());
  on('btn-save-modal-close', () => UI.hideSaveModal());
  on('btn-save-modal-copy', () => UI.copySaveModalText());
  on('btn-save-modal-apply', () => UI.applySaveModalImport());

  // 切后台 / 关闭页面前再落一次盘
  const flushRun = () => {
    if (game.run) UI.persistRun(UI.screen);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushRun();
  });
  window.addEventListener('pagehide', flushRun);
  window.addEventListener('beforeunload', flushRun);

  // 首次点击解锁 AudioContext
  document.body.addEventListener('click', () => {
    if (typeof SFX !== 'undefined') SFX.ensure();
  }, { once: true });
});
