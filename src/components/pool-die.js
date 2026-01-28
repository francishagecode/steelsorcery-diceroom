import { getDiceClasses } from '../config/dice-config.js';

class PoolDie extends HTMLElement {
  static get observedAttributes() {
    return ['sides', 'color', 'owner'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const sides = this.getAttribute('sides') || '6';
    const color = this.getAttribute('color') || '#ffffff';
    const owner = this.getAttribute('owner') || '';
    const classes = getDiceClasses(parseInt(sides, 10));

    this.innerHTML = `
      <button class="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] lg:w-[70px] lg:h-[70px]
        text-base sm:text-lg font-bold border-2 sm:border-[3px] rounded-lg sm:rounded-xl
        cursor-pointer transition-all shadow-[0_3px_6px_rgb(0_0_0/0.3)]
        hover:scale-110 hover:shadow-[0_5px_10px_rgb(255_255_255/0.3)] hover:border-white
        relative ${classes}">
        d${sides}
        <span class="absolute top-1 right-1 w-2 h-2 rounded-full border border-black"
          style="background-color: ${color}" title="${owner}"></span>
      </button>
    `;
  }
}

customElements.define('pool-die', PoolDie);
