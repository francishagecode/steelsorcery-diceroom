import PubSub from 'pubsub-js';
import { selfId } from './network.js';
import './components/dice-result.js';
import './components/player-badge.js';

class RollHistory extends HTMLElement {
  connectedCallback() {
    this.maxRolls = 20;
    this.classList.add('flex', 'flex-col', 'gap-3', 'sm:gap-4', 'mb-24');

    this.subscriptionToken = PubSub.subscribe('roll:complete', (_, { rollData }) => {
      if (rollData.isGroupRoll) {
        this.addGroupRoll(rollData);
      } else {
        this.addSingleRoll(rollData);
      }
    });
  }

  disconnectedCallback() {
    if (this.subscriptionToken) PubSub.unsubscribe(this.subscriptionToken);
  }

  addSingleRoll(rollData) {
    const peerId = Object.keys(rollData.resultsByPlayer)[0];
    const playerData = rollData.resultsByPlayer[peerId];
    const isYou = peerId === selfId;

    const rollEl = document.createElement('div');
    rollEl.className = `bg-black/40 rounded-xl p-4 sm:p-6 lg:p-8 animate-[slideIn_0.3s_ease-out] ${
      isYou ? 'ring-1 sm:ring-2 ring-white/30' : ''
    }`;

    rollEl.innerHTML = `
      <div class="flex justify-between mb-4 sm:mb-6 text-xs sm:text-sm lg:text-base items-start">
        <player-badge name="${playerData.playerName}" color="${playerData.color}" ${isYou ? 'highlight' : ''}></player-badge>
        <div class="flex flex-col items-end gap-1 sm:gap-2">
          <span class="text-gray-500 text-xs sm:text-sm lg:text-base">${new Date(rollData.timestamp).toLocaleTimeString()}</span>
          <div class="text-lg sm:text-xl lg:text-2xl font-bold text-white">Total: ${playerData.total}</div>
        </div>
      </div>
      <div class="flex gap-1 sm:gap-1.5 flex-wrap">
        ${playerData.results.map((r) => `<dice-result sides="${r.sides}" value="${r.value}"></dice-result>`).join('')}
      </div>
    `;

    this.insertBefore(rollEl, this.firstChild);
    this.trimRolls();
  }

  addGroupRoll(rollData) {
    const { resultsByPlayer, overallTotal, timestamp } = rollData;
    const peerIds = Object.keys(resultsByPlayer);

    const rollEl = document.createElement('div');
    rollEl.className = 'bg-black/40 rounded-xl p-4 sm:p-6 lg:p-8 animate-[slideIn_0.3s_ease-out]';

    const playerSections = peerIds
      .map((peerId) => {
        const playerData = resultsByPlayer[peerId];
        const isYou = peerId === selfId;
        return `
        <div class="mb-4 last:mb-0 pb-4 last:pb-0 border-b border-white/10 last:border-0">
          <div class="flex justify-between items-center mb-3">
            <player-badge name="${playerData.playerName}" color="${playerData.color}" ${isYou ? 'highlight' : ''}></player-badge>
            <span class="text-base sm:text-lg font-bold text-white">${playerData.total}</span>
          </div>
          <div class="flex gap-1 sm:gap-1.5 flex-wrap">
            ${playerData.results.map((r) => `<dice-result sides="${r.sides}" value="${r.value}"></dice-result>`).join('')}
          </div>
        </div>
      `;
      })
      .join('');

    rollEl.innerHTML = `
      <div class="flex justify-between mb-4 sm:mb-6 pb-3 border-b border-white/20">
        <span class="font-bold text-lg">Group Roll</span>
        <div class="flex flex-col items-end gap-1">
          <span class="text-gray-500 text-xs sm:text-sm">${new Date(timestamp).toLocaleTimeString()}</span>
          <div class="text-xl sm:text-2xl font-bold text-white">Total: ${overallTotal}</div>
        </div>
      </div>
      ${playerSections}
    `;

    this.insertBefore(rollEl, this.firstChild);
    this.trimRolls();
  }

  trimRolls() {
    while (this.children.length > this.maxRolls) {
      this.removeChild(this.lastChild);
    }
  }

  clear() {
    this.innerHTML = '';
  }
}

customElements.define('roll-history', RollHistory);
