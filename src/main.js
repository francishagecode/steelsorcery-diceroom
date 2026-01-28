import { network, selfId } from './network.js';
import './emoji-buttons.js';
import './dice-pool.js';
import './dice-settings.js';
import './dice-box.js';
import './roll-history.js';
import './player-list.js';

const roomId = window.location.hash.slice(1) || 'main';

let myName = localStorage.getItem('playerName');
if (!myName) {
  const playerName = prompt('Enter your name:');
  myName = playerName?.trim() || selfId.slice(0, 8);
  localStorage.setItem('playerName', myName);
}

const diceSettingsEl = document.querySelector('dice-settings');
const diceBoxEl = document.querySelector('dice-box');
const settings = diceSettingsEl.getSettings();

network.updatePeer(selfId, {
  name: myName,
  color: settings.color,
  diceSettings: {
    texture: settings.texture,
    material: settings.material,
    labelColor: settings.labelColor,
  },
});

await diceBoxEl.initialize(settings.color, {
  labelColor: settings.labelColor,
  material: settings.material,
  texture: settings.texture,
});

try {
  await network.connect(roomId);
} catch (error) {
  console.error('Failed to initialize room:', error);
}

document.documentElement.className = 'ready';

addEventListener('hashchange', () => window.location.reload());
