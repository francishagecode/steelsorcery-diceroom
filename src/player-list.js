import PubSub from 'pubsub-js';
import { selfId, network } from './network.js';

class PlayerList extends HTMLElement {
  connectedCallback() {
    this.myName = localStorage.getItem('playerName') || selfId.slice(0, 8);
    this.render();
    this.cacheElements();
    this.setupSubscriptions();
    this.attachEventListeners();
    this.updateUsernameList();
  }

  render() {
    this.innerHTML = `
      <header class="p-3 sm:p-4 mb-4 sm:mb-6 lg:mb-8 bg-black/60 rounded-xl">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div class="flex gap-2 sm:gap-3 items-center flex-wrap">
            <button id="name-btn" title="Change your name"
              class="px-3 py-2 text-sm sm:text-base font-bold text-white rounded-lg cursor-pointer transition-all bg-[#1e3a5f] hover:bg-[#2a4d7f]">
              Username
            </button>
            <button id="dice-settings-btn" title="Open dice settings"
              class="px-3 py-2 text-sm sm:text-base font-bold text-white rounded-lg cursor-pointer transition-all bg-[#1e3a5f] hover:bg-[#2a4d7f]">
              Customize Dice
            </button>
            <button id="create-room-btn" title="Create a new room"
              class="px-4 py-2 text-sm sm:text-base font-bold text-white rounded-lg cursor-pointer transition-all bg-[#1e3a5f] hover:bg-[#2a4d7f] sm:hover:-translate-y-1 active:translate-y-0">
              Create Room
            </button>
            <button id="faq-btn" title="Frequently Asked Questions"
              class="px-3 py-2 text-sm sm:text-base font-bold text-white rounded-lg cursor-pointer transition-all bg-[#1e3a5f] hover:bg-[#2a4d7f]">
              FAQ
            </button>
          </div>
          <div id="room-num" class="text-xs sm:text-sm lg:text-base text-white font-semibold"></div>
        </div>
        <div class="mt-3 pt-3 border-t border-white/10">
          <div class="text-xs sm:text-sm text-gray-400 mb-2">Connected Players:</div>
          <div id="username-list" class="flex flex-wrap gap-2 sm:gap-3">
            <span class="text-gray-400 text-sm">No players</span>
          </div>
        </div>
      </header>
    `;
  }

  cacheElements() {
    this.usernameListEl = this.querySelector('#username-list');
    this.roomNumEl = this.querySelector('#room-num');
  }

  setupSubscriptions() {
    PubSub.subscribe('room:connected', (_, { roomName }) => this.updateRoomName(roomName));
    PubSub.subscribe('peer:joined', () => this.updateUsernameList());
    PubSub.subscribe('peer:left', () => this.updateUsernameList());
    PubSub.subscribe('peer:updated', () => this.updateUsernameList());
  }

  attachEventListeners() {
    this.querySelector('#name-btn').addEventListener('click', () => this.handleChangeName());
    this.querySelector('#create-room-btn').addEventListener('click', () => this.handleCreateRoom());
    this.querySelector('#faq-btn').addEventListener('click', () => {
      document.querySelector('#faq-dialog').showModal();
    });
    document.querySelector('#close-faq-btn')?.addEventListener('click', () => {
      document.querySelector('#faq-dialog').close();
    });
  }

  handleChangeName() {
    const newName = prompt('Enter your name:', this.myName);
    if (!newName?.trim()) return;

    this.myName = newName.trim();
    network.updatePeer(selfId, { name: this.myName });
    localStorage.setItem('playerName', this.myName);

    PubSub.publish('settings:send', { name: this.myName });
    PubSub.publish('peer:updated', { peerId: selfId, name: this.myName });
  }

  handleCreateRoom() {
    const roomName = prompt('Enter a name for your new room:');
    if (!roomName) return;

    const sanitized = roomName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!sanitized) {
      alert('Please enter a valid room name (letters, numbers, and hyphens only)');
      return;
    }

    const timestamp = Date.now();
    const hash = this.simpleHash(sanitized + timestamp);
    const newRoomId = `${sanitized}-${hash}`;

    window.location.hash = newRoomId;
    window.location.reload();
  }

  simpleHash(str) {
    const hash = [...str].reduce((acc, char) => {
      const code = char.charCodeAt(0);
      let newHash = (acc << 5) - acc + code;
      return newHash & newHash;
    }, 0);
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  updateRoomName(roomName) {
    if (this.roomNumEl) {
      this.roomNumEl.textContent = `Room: ${roomName}`;
    }
  }

  updateUsernameList() {
    if (!this.usernameListEl) return;

    const allPeers = network
      .getAllPeers()
      .map((peer) => ({ ...peer, isSelf: peer.id === selfId }))
      .sort((a, b) => {
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;
        return a.name.localeCompare(b.name);
      });

    this.usernameListEl.innerHTML = '';

    if (allPeers.length === 0) {
      this.usernameListEl.innerHTML = '<span class="text-gray-400 text-sm">No players</span>';
      return;
    }

    allPeers.forEach(({ name, isSelf, color }) => {
      const nameEl = document.createElement('span');
      nameEl.className = `text-sm font-medium ${isSelf ? 'text-orange-400' : 'text-white'}`;
      nameEl.style.borderLeft = `3px solid ${color}`;
      nameEl.style.paddingLeft = '0.5rem';
      nameEl.textContent = isSelf ? `${name} (you)` : name;
      this.usernameListEl.appendChild(nameEl);
    });
  }

  getPlayerName() {
    return this.myName;
  }
}

customElements.define('player-list', PlayerList);
