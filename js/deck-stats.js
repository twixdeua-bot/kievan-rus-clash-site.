/* Дополнительный блок статистики колод. Реальные значения не выдумываются. */
(() => {
  'use strict';
  let items = [], loaded = false;
  const normalize = s => String(s || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9а-яё]+/g, ' ').trim();
  const signature = a => a.map(normalize).sort().join('|');
  function deckNames(deck) {
    return [...deck.querySelectorAll('.deck-cards .mini span')]
      .map(el => el.textContent.trim()).filter(Boolean);
  }
  function paint(deck) {
    if (deck.querySelector('.global-deck-stats')) return;
    const names = deckNames(deck);
    const key = signature(names);
    const item = items.find(x => Array.isArray(x.cards) && x.cards.length === 8 &&
      signature(x.cards) === key);
    const box = document.createElement('div');
    box.className = 'global-deck-stats';
    if (item && Number.isFinite(item.winRate)) {
      box.innerHTML = '<b>Глобальная статистика</b><span>Победы: ' + item.winRate.toFixed(1) +
        '%</span><span>Боёв: ' + (Number.isFinite(item.battles) ? item.battles.toLocaleString('ru-RU') : 'нет данных') +
        '</span><span>Использование: ' + (Number.isFinite(item.usage) ? item.usage.toFixed(2) + '%' : 'нет данных') + '</span>';
    } else {
      box.innerHTML = '<b>Глобальная статистика</b><span>Реальные данные для этой колоды не найдены.</span>';
    }
    const actions = deck.querySelector('.deck-actions');
    if (actions) deck.insertBefore(box, actions); else deck.appendChild(box);
  }
  async function load() {
    if (loaded) return; loaded = true;
    try {
      const r = await fetch('/api/deck-stats', {headers:{Accept:'application/json'}});
      const data = await r.json();
      if (r.ok && Array.isArray(data.items)) items = data.items;
    } catch (_) {}
    document.querySelectorAll('article.deck').forEach(paint);
  }
  function scan() {
    document.querySelectorAll('article.deck').forEach(paint);
    load();
  }
  const style = document.createElement('style');
  style.textContent = '.global-deck-stats{display:flex;flex-wrap:wrap;gap:7px 12px;align-items:center;margin:12px 0;padding:10px 12px;border:1px solid rgba(221,180,88,.3);border-radius:10px;background:rgba(7,16,39,.55);font-size:.82rem;color:#dbe4f6}.global-deck-stats b{color:#e8c878;width:100%;font-size:.86rem}';
  document.head.appendChild(style);
  const root = document.querySelector('#app');
  if (root) { new MutationObserver(scan).observe(root,{childList:true,subtree:true}); scan(); }
  else document.addEventListener('DOMContentLoaded',scan,{once:true});
})();
