/**
 * 构筑分享码：PZ1.角色.难度.奇牌ids.心法.校验
 * 仅用于展示与复刻开局构筑思路，不写入元进度作弊
 */
const BuildShare = {
  encode(run) {
    if (!run) return '';
    const char = run.character?.id || 'shen';
    const diff = run.difficulty?.id || 'normal';
    const qipai = (run.qipai || []).map(q => q.id).join(',');
    const xinfa = Object.keys(XINFA).map(k => run.xinfa[k] || 0).join('');
    const raw = `PZ1|${char}|${diff}|${qipai}|${xinfa}`;
    const sum = this.checksum(raw);
    // base64url
    try {
      return btoa(unescape(encodeURIComponent(raw + '|' + sum)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (_) {
      return raw;
    }
  },

  checksum(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).slice(0, 6);
  },

  decode(code) {
    if (!code || typeof code !== 'string') return null;
    let raw = code.trim();
    try {
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
      raw = decodeURIComponent(escape(atob(b64 + pad)));
    } catch (_) {
      // 明文
    }
    const parts = raw.split('|');
    if (parts[0] !== 'PZ1' || parts.length < 5) return null;
    const [_, charId, diffId, qipaiStr, xinfaStr, sum] = parts;
    const check = this.checksum(parts.slice(0, 5).join('|'));
    if (sum && sum !== check) {
      // 宽松：仍尝试解析
    }
    const qipaiIds = qipaiStr ? qipaiStr.split(',').filter(Boolean) : [];
    const qipai = qipaiIds.map(id => QIPAI_POOL.find(q => q.id === id)).filter(Boolean);
    const xinfa = {};
    const keys = Object.keys(XINFA);
    keys.forEach((k, i) => {
      xinfa[k] = Math.min(5, parseInt((xinfaStr || '')[i] || '0', 10) || 0);
    });
    const character = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
    const difficulty = DIFFICULTIES.find(d => d.id === diffId) || DIFFICULTIES[0];
    return { character, difficulty, qipai, xinfa, qipaiIds };
  },

  summary(decoded) {
    if (!decoded) return '无效分享码';
    return [
      `牌客：${decoded.character.name}`,
      `难度：${decoded.difficulty.name}`,
      `奇牌：${decoded.qipai.map(q => q.name).join('、') || '无'}`,
      `心法：` + Object.entries(decoded.xinfa).filter(([, v]) => v > 0).map(([k, v]) => `${XINFA[k]?.name || k}L${v}`).join(' ') || '无',
    ].join('\n');
  },
};
