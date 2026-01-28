import { getDiceClasses } from '../config/dice-config.js';

class DiceResult extends HTMLElement {
  static get observedAttributes() {
    return ['sides', 'value'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const sides = this.getAttribute('sides') || '6';
    const value = this.getAttribute('value') || '?';
    const classes = getDiceClasses(parseInt(sides, 10));

    this.innerHTML = `
      <span class="min-w-[50px] sm:min-w-[55px] lg:min-w-[60px]
        h-[50px] sm:h-[55px] lg:h-[60px] px-3 sm:px-4
        flex items-center justify-center text-xl sm:text-2xl font-bold
        rounded-lg shadow-[0_4px_6px_rgb(0_0_0/0.3)] relative
        border-2 sm:border-[3px] ${classes}">
        ${value}
        <span class="absolute bottom-[2px] right-1 text-xs sm:text-sm lg:text-base
          text-black/40 font-normal">d${sides}</span>
      </span>
    `;
  }
}

customElements.define('dice-result', DiceResult);
