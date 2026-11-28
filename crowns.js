'use strict';
(() => {
  const storageKey = 'frontier-v6-crowns-v1';
  const silverRewards = Object.freeze({Easy: 1, Normal: 10, Hard: 75, Brutal: 300, Impossible: 1200, God: 6000, Wrath: 3000});
  const items = Object.freeze({
    war:{name:'War mode',kind:'mode',price:500},
    'banner-chevron':{name:'Chevron banner',kind:'banner',price:10},
    'banner-cross':{name:'Cross banner',kind:'banner',price:10},
    'palette-jade':{name:'Jade army',kind:'palette',price:75,color:'#58c49b'},
    'palette-violet':{name:'Violet army',kind:'palette',price:75,color:'#b694e8'},
    'castle-royal':{name:'Royal castle',kind:'castle',price:300},
    'castle-fortress':{name:'Iron fortress',kind:'castle',price:300}
  });
  let pending = Promise.resolve();

  function readWallet() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {version: 1, silver: 0, gold: 0, awarded: {}, owned: [], equipped: {}};
    const wallet = JSON.parse(raw);
    if (wallet.version !== 1 || !Number.isSafeInteger(wallet.silver) || wallet.silver < 0 ||
        !Number.isSafeInteger(wallet.gold) || wallet.gold < 0 || !wallet.awarded || typeof wallet.awarded !== 'object') {
      throw Error('Crown balance could not be loaded. Browser data has an unsupported format.');
    }
    wallet.owned = Array.isArray(wallet.owned) ? wallet.owned.filter(id => Object.hasOwn(items,id)) : [];
    wallet.equipped = wallet.equipped && typeof wallet.equipped === 'object' ? wallet.equipped : {};
    return wallet;
  }

  function render(wallet) {
    for (const [id, balance] of [['silverCrowns', wallet.silver], ['introSilverCrowns', wallet.silver], ['goldCrowns', wallet.gold], ['introGoldCrowns', wallet.gold]]) {
      const element = document.getElementById(id);
      if (element) element.textContent = balance.toLocaleString();
    }
  }

  function refresh() {
    try {
      render(readWallet());
    } catch (error) {
      const notice = document.getElementById('crownStorageNotice');
      if (notice) notice.textContent = error.message || 'Crown storage is unavailable in this browser.';
    }
  }

  function saveReward(reward) {
    const action = () => {
      const wallet = readWallet();
      const duplicate = Object.hasOwn(wallet.awarded, reward.id);
      if (!duplicate) {
        const balance = wallet[reward.currency] + reward.amount;
        if (!Number.isSafeInteger(balance)) throw Error('Crown balance limit reached.');
        wallet[reward.currency] = balance;
        wallet.awarded[reward.id] = {currency: reward.currency, amount: reward.amount};
        localStorage.setItem(storageKey, JSON.stringify(wallet));
      }
      render(wallet);
      const result = document.getElementById('crownReward');
      if (result) result.textContent = (duplicate ? 'Already collected: ' : 'Earned ') + reward.amount.toLocaleString() + ' ' + (reward.currency === 'silver' ? 'Silver' : 'Gold') + ' Crowns';
      const retry = document.getElementById('retryCrownReward');
      if (retry) retry.hidden = true;
    };
    const locked = () => typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(storageKey, action)
      : action();
    pending = pending.catch(() => {}).then(locked).catch(() => {
      const result = document.getElementById('crownReward');
      if (result) result.textContent = 'Reward could not be saved. Allow browser storage, then retry.';
      const retry = document.getElementById('retryCrownReward');
      if (retry) {
        retry.hidden = false;
        retry.onclick = () => saveReward(reward);
      }
    });
    return pending;
  }

  function startMatch(state, restoring) {
    if (!restoring || !state.crownMatchId) {
      state.crownMatchId = restoring
        ? 'legacy-' + state.seed + '-' + state.difficulty + '-' + state.gameMode
        : typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }
    const result = document.getElementById('crownReward');
    if (result) result.textContent = '';
    const retry = document.getElementById('retryCrownReward');
    if (retry) retry.hidden = true;
  }

  function awardSoloVictory(state) {
    if (!state.ended || state.pvp || state.spectator || !state.crownMatchId || !Object.hasOwn(silverRewards, state.difficulty)) return Promise.resolve();
    const friendlyCastle = state.entities.some(unit => unit.type === 'castle' && unit.side === 0 && unit.hp > 0);
    const enemyCastle = state.entities.some(unit => unit.type === 'castle' && unit.side === 1 && unit.hp > 0);
    if (!friendlyCastle || enemyCastle) return Promise.resolve();
    return saveReward({id: 'solo-' + state.crownMatchId, currency: 'silver', amount: silverRewards[state.difficulty]});
  }

  function awardPvPResult(state) {
    if (!state.pvp || !state.ended || ![0, 1].includes(state.winner)) return Promise.resolve();
    let room;
    try { room = sessionStorage.getItem('frontier-v6-room'); } catch { return Promise.resolve(); }
    if (!room || !/^[A-F0-9]{8}$/.test(room)) return Promise.resolve();
    return saveReward({id: 'pvp-' + room, currency: 'gold', amount: state.winner === 0 ? 30 : 10});
  }

  function transact(id, equipOnly=false) {
    const action=()=>{
      if(!Object.hasOwn(items,id))throw Error('Unknown shop item.');
      const w=readWallet(),item=items[id];
      if(!w.owned.includes(id)){
        if(equipOnly)throw Error('Purchase this item first.');
        if(w.silver<item.price)throw Error('Need '+(item.price-w.silver)+' more Silver Crowns.');
        w.silver-=item.price;w.owned.push(id);
      }
      if(item.kind!=='mode')w.equipped[item.kind]=id;
      localStorage.setItem(storageKey,JSON.stringify(w));render(w);return w;
    };
    pending=pending.catch(()=>{}).then(()=>navigator.locks?navigator.locks.request(storageKey,action):action());
    return pending;
  }
  function resetCosmetic(kind){
    const action=()=>{const w=readWallet();delete w.equipped[kind];localStorage.setItem(storageKey,JSON.stringify(w));return w};
    pending=pending.catch(()=>{}).then(()=>navigator.locks?navigator.locks.request(storageKey,action):action());return pending;
  }
  function snapshot(){const w=readWallet();return {...w,owned:[...w.owned],equipped:{...w.equipped}}}
  function hasUnlock(id){try{return readWallet().owned.includes(id)}catch{return false}}
  window.FrontierCrowns = {startMatch, awardSoloVictory, awardPvPResult, items, transact, resetCosmetic, snapshot, hasUnlock};
  window.addEventListener('storage', event => { if (event.key === storageKey) refresh(); });
  refresh();
})();
