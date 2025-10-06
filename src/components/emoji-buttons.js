import { emitEmojiConfetti, broadcastEmoji } from '../network.js'

class EmojiButtons extends HTMLElement {
  connectedCallback() {
    this.attachEventListeners()
  }

  attachEventListeners() {
    const buttons = this.querySelectorAll('button')

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const emoji = btn.dataset.emoji

        // Calculate button position for confetti origin
        const rect = btn.getBoundingClientRect()
        const x = (rect.left + rect.width / 2) / window.innerWidth
        const y = (rect.top + rect.height / 2) / window.innerHeight

        emitEmojiConfetti(emoji, x, y)
        broadcastEmoji(emoji)
      })
    })
  }
}

customElements.define('emoji-buttons', EmojiButtons)
