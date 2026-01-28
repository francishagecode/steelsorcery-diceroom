import DiceBox from '@3d-dice/dice-box-threejs';
import PubSub from 'pubsub-js';
import { network } from './network.js';

const SINGLE_STRENGTH = 2;
const GROUP_STRENGTH = 1;
const SINGLE_GRAVITY = 500;
const GROUP_GRAVITY = 600;

export class DiceBoxComponent extends HTMLElement {
  connectedCallback() {
    this.diceBoxInstances = [];
    this.currentConfig = {};

    this.subscriptions = [
      PubSub.subscribe('roll:animate', async (_, { rollData }) => {
        await this.rollDice(rollData);
      }),
      PubSub.subscribe('roll:received', async (_, { rollData }) => {
        await this.rollDice(rollData);
      }),
      PubSub.subscribe('diceConfig:update', async (_, settings) => {
        this.currentConfig = { ...settings };
      }),
    ];
  }

  disconnectedCallback() {
    this.subscriptions?.forEach((token) => PubSub.unsubscribe(token));
    this.cleanup();
  }

  async initialize(color, initialConfig = {}) {
    this.currentConfig = { color, ...initialConfig };
  }

  async rollDice(rollData) {
    this.cleanup();
    this.innerHTML = '';

    const peerIds = Object.keys(rollData.resultsByPlayer);
    const numPlayers = peerIds.length;
    const isSingle = numPlayers === 1;

    this.className = isSingle
      ? 'grid grid-cols-1'
      : this.getGridClass(numPlayers);

    const rollPromises = peerIds.map((peerId) =>
      this.createPlayerDiceBox(peerId, rollData.resultsByPlayer[peerId], numPlayers)
    );

    await Promise.all(rollPromises);
    PubSub.publish('roll:complete', { rollData });
  }

  createPlayerDiceBox(peerId, playerData, numPlayers) {
    return new Promise(async (resolve) => {
      const isSingle = numPlayers === 1;
      const peer = network.getPeer(peerId);
      const settings = peer?.diceSettings || {};

      const container = document.createElement('div');
      container.id = `dice-box-${peerId}`;
      container.className = isSingle
        ? 'player-dice-box relative bg-black/20 rounded-xl overflow-hidden h-[350px] lg:h-[450px]'
        : 'player-dice-box relative bg-black/20 rounded-lg overflow-hidden min-h-[120px] sm:min-h-[160px]';

      const label = document.createElement('div');
      label.className = 'absolute top-2 left-2 z-10 px-2 py-1 rounded text-sm font-bold backdrop-blur-sm';
      label.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      label.style.color = playerData.color;
      label.style.borderLeft = `3px solid ${playerData.color}`;
      label.style.paddingLeft = '0.5rem';
      label.textContent = playerData.playerName;

      container.appendChild(label);
      this.appendChild(container);

      const diceBox = new DiceBox(`#dice-box-${peerId}`, {
        assetPath: './',
        theme_customColorset: {
          background: playerData.color,
          foreground: settings.labelColor || '#ffffff',
          outline: '#000000',
          texture: settings.texture || '',
          material: settings.material || 'plastic',
        },
        light_intensity: 1,
        gravity_multiplier: isSingle ? SINGLE_GRAVITY : GROUP_GRAVITY,
        baseScale: this.calculateScale(numPlayers),
        theme_surface: 'green-felt',
        strength: isSingle ? SINGLE_STRENGTH : GROUP_STRENGTH,
        shadows: false,
        sounds: isSingle,
        onRollComplete: () => resolve(),
      });

      this.diceBoxInstances.push(diceBox);

      try {
        await diceBox.initialize();
        const notation = this.buildNotation(playerData.results);
        await diceBox.roll(notation);
      } catch (err) {
        console.error(`Dice roll error for ${playerData.playerName}:`, err);
        resolve(); // Resolve anyway to not block other rolls
      }
    });
  }

  buildNotation(results) {
    const diceTypes = results.map((r) => `1d${r.sides}`).join('+');
    const values = results.map((r) => r.value).join(',');
    return `${diceTypes}@${values}`;
  }

  calculateScale(numPlayers) {
    const isMobile = window.innerWidth < 768;
    if (numPlayers === 1) return isMobile ? 55 : 85;
    if (numPlayers === 2) return isMobile ? 35 : 55;
    if (numPlayers <= 4) return isMobile ? 28 : 45;
    return isMobile ? 22 : 35;
  }

  getGridClass(numPlayers) {
    if (numPlayers === 1) return 'grid grid-cols-1';
    if (numPlayers === 2) return 'grid grid-cols-2 gap-1';
    if (numPlayers <= 4) return 'grid grid-cols-2 gap-1';
    if (numPlayers <= 6) return 'grid grid-cols-3 gap-1';
    return 'grid grid-cols-3 gap-1';
  }

  cleanup() {
    this.diceBoxInstances.forEach((instance) => {
      try {
        if (instance.destroy) instance.destroy();
      } catch (err) {
        console.warn('Error cleaning up dice box instance:', err);
      }
    });
    this.diceBoxInstances = [];
  }
}

customElements.define('dice-box', DiceBoxComponent);
