import PubSub from 'pubsub-js';

const EMOJIS = ['👍', '🎉', '🔥', '😱', '💀', '❤️'];

class EmojiButtons extends HTMLElement {
  connectedCallback() {
    this.render();
    this.attachEventListeners();

    PubSub.subscribe('emoji:received', (_, { emoji }) => {
      this.triggerEmojiConfetti(emoji);
    });
  }

  render() {
    this.innerHTML = EMOJIS.map(
      (emoji) =>
        `<button class="text-2xl sm:text-3xl lg:text-4xl hover:scale-110 sm:hover:scale-125 transition-transform cursor-pointer" data-emoji="${emoji}">${emoji}</button>`
    ).join('');
  }

  attachEventListeners() {
    this.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        this.triggerEmojiConfetti(emoji);
        PubSub.publish('emoji:send', emoji);
      });
    });
  }

  triggerEmojiConfetti(emoji) {
    const btn = this.querySelector(`[data-emoji="${emoji}"]`);
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 5,
      spread: 100,
      startVelocity: 65,
      scalar: 3,
      gravity: 0.5,
      ticks: 200,
      flat: true,
      origin: { x, y },
      shapes: ['emoji'],
      shapeOptions: { emoji: { value: [emoji] } },
    });
  }
}

customElements.define('emoji-buttons', EmojiButtons);
