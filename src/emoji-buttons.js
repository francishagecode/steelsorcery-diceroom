import { emitEmojiConfetti, broadcastEmoji } from './network.js'

class EmojiButtons extends HTMLElement {
  connectedCallback() {
    this.attachEventListeners()
  }

  attachEventListeners() {
    const buttons = this.querySelectorAll('button')

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const emoji = btn.dataset.emoji

        this.triggerEmojiConfetti(emoji)

        broadcastEmoji(emoji)
      })
    })
  }

  triggerEmojiConfetti(emoji) {
    const button = this.querySelector(`[data-emoji="${emoji}"]`)
    if (button) {
      const rect = button.getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      emitEmojiConfetti(emoji, x, y)
    }
  }
}

customElements.define('emoji-buttons', EmojiButtons)

