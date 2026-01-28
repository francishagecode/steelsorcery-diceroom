import PubSub from 'pubsub-js';
import { selfId, network } from './network.js';
import { DICE_TYPES } from './config/dice-config.js';
import './components/dice-button.js';
import './components/pool-die.js';

const pool = [];
let poolSyncInitialized = false;

class DicePool extends HTMLElement {
  connectedCallback() {
    this.render();
    this.cacheElements();
    this.attachEventListeners();

    if (!poolSyncInitialized) {
      this.setupPoolSync();
      poolSyncInitialized = true;
    }
  }

  render() {
    this.innerHTML = `
      <div class="bg-black/40 rounded-xl p-4 sm:p-6 lg:p-8">
        <div class="flex gap-4 text-sm mb-4 sm:mb-6 font-bold text-white text-center justify-center">
          <span class="flex items-center gap-2">
            <kbd class="bg-black text-[10px] p-1 px-1.5 rounded-lg text-white">Left click</kbd>
            Add to Pool
          </span>
          <span>|</span>
          <span class="flex items-center gap-2">
            <kbd class="bg-black text-[10px] p-1 px-1.5 rounded-lg text-white">Right click</kbd>
            Insta-roll
          </span>
        </div>
        <div class="flex gap-1.5 sm:gap-2 flex-wrap justify-center" id="dice-buttons">
          ${DICE_TYPES.map((sides) => `<dice-button sides="${sides}"></dice-button>`).join('')}
        </div>
      </div>

      <div class="bg-black/40 rounded-xl p-4 sm:p-6 lg:p-8 min-h-[120px] sm:min-h-[150px]">
        <div id="pool-summary" class="text-lg sm:text-xl lg:text-2xl font-bold text-center py-2 sm:py-3 min-h-[2rem] sm:min-h-[2.8rem] empty:hidden text-white"></div>
        <div id="dice-pool" class="flex gap-1 flex-wrap min-h-[50px] sm:min-h-[60px] p-3 sm:p-4 bg-black/30 rounded-lg justify-center"></div>
        <button id="roll-pool-btn" disabled
          class="w-full py-3 sm:py-4 lg:py-5 text-lg sm:text-xl lg:text-2xl font-semibold text-white rounded-lg cursor-pointer transition-colors bg-[#1e3a5f] hover:bg-[#2a4d7f] disabled:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black/30">
          Roll Pool
        </button>
      </div>
    `;
  }

  cacheElements() {
    this.dicePoolEl = this.querySelector('#dice-pool');
    this.rollPoolBtn = this.querySelector('#roll-pool-btn');
    this.summaryEl = this.querySelector('#pool-summary');
  }

  setupPoolSync() {
    PubSub.subscribe('room:connected', () => {
      setTimeout(() => PubSub.publish('pool:sync:request'), 500);
    });

    PubSub.subscribe('peer:joined', () => {
      const myDice = pool.filter((d) => d.peerId === selfId);
      if (myDice.length > 0) {
        PubSub.publish('pool:sync:send', myDice);
      }
    });

    PubSub.subscribe('pool:sync:requested', () => {
      const myDice = pool.filter((d) => d.peerId === selfId);
      if (myDice.length > 0) {
        PubSub.publish('pool:sync:send', myDice);
      }
    });

    PubSub.subscribe('pool:sync:received', (_, dice) => {
      if (!dice || !Array.isArray(dice)) return;
      let changed = false;
      dice.forEach((die) => {
        if (!pool.find((d) => d.id === die.id)) {
          pool.push(die);
          changed = true;
        }
      });
      if (changed) {
        this.renderPool();
        this.updateRollButton();
      }
    });

    PubSub.subscribe('pool:add', (_, die) => {
      if (die?.peerId === selfId) return;
      if (!die?.sides) return;
      pool.push(die);
      this.renderPool();
      this.updateRollButton();
    });

    PubSub.subscribe('pool:remove', (_, { dieId, peerId }) => {
      if (peerId === selfId) return;
      const index = pool.findIndex((d) => d.id === dieId);
      if (index !== -1) {
        pool.splice(index, 1);
        this.renderPool();
        this.updateRollButton();
      }
    });

    PubSub.subscribe('pool:clear', (_, { peerId }) => {
      if (peerId === selfId) return;
      let changed = false;
      for (let i = pool.length - 1; i >= 0; i--) {
        if (pool[i].peerId === peerId) {
          pool.splice(i, 1);
          changed = true;
        }
      }
      if (changed) {
        this.renderPool();
        this.updateRollButton();
      }
    });

    PubSub.subscribe('roll:received', (_, { rollData, peerId }) => {
      if (peerId === selfId || !rollData?.rolledDiceIds) return;
      let changed = false;
      for (let i = pool.length - 1; i >= 0; i--) {
        if (rollData.rolledDiceIds.includes(pool[i].id)) {
          pool.splice(i, 1);
          changed = true;
        }
      }
      if (changed) {
        this.renderPool();
        this.updateRollButton();
      }
    });
  }

  attachEventListeners() {
    PubSub.subscribe('dice:add', (_, { sides }) => this.addDieToPool(sides));
    PubSub.subscribe('dice:quickroll', (_, { sides }) => {
      this.clearPool();
      this.addDieToPool(sides);
      setTimeout(() => pool.length > 0 && this.handleRollPool(), 50);
    });

    this.rollPoolBtn?.addEventListener('click', () => this.handleRollPool());
  }

  addDieToPool(sides) {
    const peer = network.getPeer(selfId);
    const die = {
      id: Date.now() + Math.random(),
      sides,
      peerId: selfId,
      playerName: peer?.name || selfId.slice(0, 8),
      color: peer?.color || '#ffffff',
    };

    pool.push(die);
    this.renderPool();
    this.updateRollButton();
    PubSub.publish('pool:add:broadcast', die);
  }

  removeDieFromPool(dieId) {
    const index = pool.findIndex((d) => d.id === dieId);
    if (index === -1) return;

    pool.splice(index, 1);
    this.renderPool();
    this.updateRollButton();
    PubSub.publish('pool:remove:broadcast', { dieId, peerId: selfId });
  }

  clearPool() {
    const myDice = pool.filter((d) => d.peerId === selfId);

    for (let i = pool.length - 1; i >= 0; i--) {
      if (pool[i].peerId === selfId) {
        pool.splice(i, 1);
      }
    }
    this.renderPool();
    this.updateRollButton();

    if (myDice.length > 0) {
      PubSub.publish('pool:clear:broadcast');
    }
  }

  renderPool() {
    if (pool.length === 0) {
      this.dicePoolEl.innerHTML =
        '<div class="w-full text-center text-gray-500 text-lg p-4 italic">Pool is empty. Click dice above to add them.</div>';
      this.updatePoolSummary();
      return;
    }

    this.dicePoolEl.innerHTML = '';
    pool.forEach((die) => {
      const poolDie = document.createElement('pool-die');
      poolDie.setAttribute('sides', die.sides);
      poolDie.setAttribute('color', die.color);
      poolDie.setAttribute('owner', die.playerName);
      poolDie.addEventListener('click', () => this.removeDieFromPool(die.id));
      this.dicePoolEl.appendChild(poolDie);
    });
    this.updatePoolSummary();
  }

  updatePoolSummary() {
    if (pool.length === 0) {
      this.summaryEl.textContent = '';
      return;
    }

    const grouped = pool.reduce((acc, die) => {
      acc[die.sides] = (acc[die.sides] || 0) + 1;
      return acc;
    }, {});

    this.summaryEl.textContent = Object.keys(grouped)
      .sort((a, b) => a - b)
      .map((sides) => `${grouped[sides]}d${sides}`)
      .join(', ');
  }

  updateRollButton() {
    this.rollPoolBtn.disabled = pool.length === 0;
    this.rollPoolBtn.textContent =
      pool.length === 0 ? 'Roll Pool' : `Roll ${pool.length} ${pool.length === 1 ? 'Die' : 'Dice'}`;
  }

  rollDie(die) {
    return Math.floor(Math.random() * die.sides) + 1;
  }

  async handleRollPool() {
    if (pool.length === 0) return;

    this.rollPoolBtn.disabled = true;
    this.rollPoolBtn.textContent = 'Rolling...';

    const diceToRoll = [...pool];
    const rolledDiceIds = diceToRoll.map((d) => d.id);

    pool.length = 0;
    this.renderPool();

    const resultsByPlayer = {};
    diceToRoll.forEach((die) => {
      if (!resultsByPlayer[die.peerId]) {
        resultsByPlayer[die.peerId] = {
          playerName: die.playerName,
          color: die.color,
          dice: [],
          results: [],
        };
      }

      const value = this.rollDie(die);
      resultsByPlayer[die.peerId].dice.push(die.sides);
      resultsByPlayer[die.peerId].results.push({
        sides: die.sides,
        value,
        peerId: die.peerId,
        color: die.color,
      });
    });

    Object.keys(resultsByPlayer).forEach((peerId) => {
      const playerData = resultsByPlayer[peerId];
      playerData.total = playerData.results.reduce((sum, r) => sum + r.value, 0);
    });

    const overallTotal = Object.values(resultsByPlayer).reduce((sum, player) => sum + player.total, 0);

    const rollData = {
      timestamp: Date.now(),
      resultsByPlayer,
      overallTotal,
      isGroupRoll: Object.keys(resultsByPlayer).length > 1,
      rolledDiceIds,
    };

    PubSub.publish('roll:send', rollData);
    PubSub.publish('roll:animate', { rollData });

    this.rollPoolBtn.disabled = false;
    this.updateRollButton();
  }
}

customElements.define('dice-pool', DicePool);
