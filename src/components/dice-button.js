import { getDiceClasses } from '../config/dice-config.js';
import PubSub from 'pubsub-js';

class DiceButton extends HTMLElement {
  static get observedAttributes() {
    return ['sides'];
  }

  connectedCallback() {
    this.sides = parseInt(this.getAttribute('sides') || '6', 10);
    this.render();
    this.attachEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'sides' && oldValue !== newValue) {
      this.sides = parseInt(newValue, 10);
      this.render();
    }
  }

  render() {
    const classes = getDiceClasses(this.sides);
    this.innerHTML = `
      <button class="aspect-square w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20
        ${classes} border-2 sm:border-[3px] rounded-lg sm:rounded-xl
        cursor-pointer transition-all shadow-[0_4px_8px_rgb(0_0_0/0.3)]
        text-lg sm:text-xl lg:text-2xl font-bold
        hover:-translate-y-1 sm:hover:-translate-y-2
        hover:shadow-[0_8px_16px_rgb(255_255_255/0.3)] hover:border-white
        active:-translate-y-0.5">d${this.sides}</button>
    `;
  }

  attachEvents() {
    const btn = this.querySelector('button');

    btn.addEventListener('click', () => {
      PubSub.publish('dice:add', { sides: this.sides });
    });

    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      PubSub.publish('dice:quickroll', { sides: this.sides });
    });
  }
}

customElements.define('dice-button', DiceButton);
