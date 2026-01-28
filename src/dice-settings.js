import PubSub from 'pubsub-js';
import { selfId, network } from './network.js';

export class DiceSettings extends HTMLElement {
  async connectedCallback() {
    this.myColor = localStorage.getItem('playerColor') || '#89CFF0';
    this.myLabelColor = localStorage.getItem('labelColor') || '#ffffff';
    this.myMaterial = localStorage.getItem('material') || 'glass';
    this.myTexture = localStorage.getItem('texture') || 'astral';

    this.render();
    await this.loadTextures();
    this.attachEventListeners();
    this.updateUIValues();
  }

  render() {
    this.innerHTML = `
      <dialog id="dice-settings-dialog"
        class="bg-black/95 backdrop:bg-black/80 text-white rounded-lg sm:rounded-xl p-4 sm:p-6 max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full border border-white/20 sm:border-2">
        <div class="flex justify-between items-center mb-4 sm:mb-6">
          <h2 class="text-xl sm:text-2xl font-bold">Dice Settings</h2>
          <button id="close-dialog-btn" class="text-2xl sm:text-3xl leading-none hover:text-red-400 transition-colors">&times;</button>
        </div>

        <div class="mb-4 sm:mb-6">
          <label class="text-base sm:text-lg font-semibold text-gray-300 block mb-2">Dice Color:</label>
          <input type="color" id="color-picker" title="Choose your dice color"
            class="w-full h-10 sm:h-12 rounded-lg cursor-pointer border-2 border-white/30" />
        </div>

        <div class="mb-4 sm:mb-6">
          <div class="text-base sm:text-lg font-semibold text-gray-300 mb-2 sm:mb-3">Dice Customization:</div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label class="text-xs sm:text-sm text-gray-400 block mb-1">Label Color:</label>
              <input id="label-color-picker" type="color" value="#ffffff"
                class="w-full h-10 rounded cursor-pointer border-2 border-white/30" />
            </div>
            <div>
              <label class="text-xs sm:text-sm text-gray-400 block mb-1">Material:</label>
              <select id="material-select"
                class="w-full bg-black/60 text-white p-2 text-sm sm:text-base rounded border-2 border-white/30">
                <option value="plastic">Plastic</option>
                <option value="glass" selected>Glass</option>
              </select>
            </div>
            <div>
              <label class="text-xs sm:text-sm text-gray-400 block mb-1">Texture:</label>
              <select id="texture-select"
                class="w-full bg-black/60 text-white p-2 text-sm sm:text-base rounded border-2 border-white/30">
                <option value="">Loading textures...</option>
              </select>
            </div>
          </div>
        </div>
      </dialog>
    `;
  }

  async loadTextures() {
    try {
      const response = await fetch('./textures.json');
      const textures = await response.json();
      const textureSelect = this.querySelector('#texture-select');

      textureSelect.innerHTML = '<option value="">None (Solid)</option>';

      textures.forEach((texture) => {
        const option = document.createElement('option');
        option.value = texture;
        option.textContent = texture.charAt(0).toUpperCase() + texture.slice(1).replace(/[.-]/g, ' ');
        textureSelect.appendChild(option);
      });

      textureSelect.value = this.myTexture;
    } catch (err) {
      console.error('Failed to load textures:', err);
    }
  }

  updateUIValues() {
    this.querySelector('#color-picker').value = this.myColor;
    this.querySelector('#label-color-picker').value = this.myLabelColor;
    this.querySelector('#material-select').value = this.myMaterial;
  }

  attachEventListeners() {
    const dialog = this.querySelector('dialog');
    const openBtn = document.querySelector('#dice-settings-btn');
    const closeBtn = this.querySelector('#close-dialog-btn');

    openBtn?.addEventListener('click', () => dialog.showModal());
    closeBtn?.addEventListener('click', () => dialog.close());

    this.querySelector('#color-picker').addEventListener('input', (e) => {
      this.myColor = e.target.value;
      localStorage.setItem('playerColor', this.myColor);
      network.updatePeer(selfId, { color: this.myColor });

      PubSub.publish('diceConfig:update', this.getSettings());
      PubSub.publish('settings:send', { color: this.myColor });
      PubSub.publish('peer:updated', { peerId: selfId, color: this.myColor });
    });

    this.querySelector('#label-color-picker').addEventListener('change', (e) => {
      this.myLabelColor = e.target.value;
      localStorage.setItem('labelColor', this.myLabelColor);

      const self = network.getPeer(selfId);
      const updatedSettings = { ...self?.diceSettings, labelColor: this.myLabelColor };
      network.updatePeer(selfId, { diceSettings: updatedSettings });

      PubSub.publish('diceConfig:update', this.getSettings());
      PubSub.publish('settings:send', { diceSettings: updatedSettings });
    });

    this.querySelector('#material-select').addEventListener('change', (e) => {
      this.myMaterial = e.target.value;
      localStorage.setItem('material', this.myMaterial);

      const self = network.getPeer(selfId);
      const updatedSettings = { ...self?.diceSettings, material: this.myMaterial };
      network.updatePeer(selfId, { diceSettings: updatedSettings });

      PubSub.publish('diceConfig:update', this.getSettings());
      PubSub.publish('settings:send', { diceSettings: updatedSettings });
    });

    this.querySelector('#texture-select').addEventListener('change', (e) => {
      this.myTexture = e.target.value;
      localStorage.setItem('texture', this.myTexture);

      const self = network.getPeer(selfId);
      const updatedSettings = { ...self?.diceSettings, texture: this.myTexture };
      network.updatePeer(selfId, { diceSettings: updatedSettings });

      PubSub.publish('diceConfig:update', this.getSettings());
      PubSub.publish('settings:send', { diceSettings: updatedSettings });
    });
  }

  getSettings() {
    return {
      color: this.myColor,
      labelColor: this.myLabelColor,
      material: this.myMaterial,
      texture: this.myTexture,
    };
  }
}

customElements.define('dice-settings', DiceSettings);
