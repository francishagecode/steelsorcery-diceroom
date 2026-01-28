class PlayerBadge extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'color', 'highlight'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const name = this.getAttribute('name') || 'Unknown';
    const color = this.getAttribute('color') || '#ffffff';
    const highlight = this.hasAttribute('highlight');

    const textClass = highlight ? 'text-orange-400' : 'text-white';

    this.className = 'inline-flex items-center gap-2';
    this.innerHTML = `
      <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
      <span class="font-bold text-base sm:text-lg ${textClass}">${name}</span>
    `;
  }
}

customElements.define('player-badge', PlayerBadge);
