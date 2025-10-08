export class DiceSettings extends HTMLElement {
  constructor() {
    super()
    this.myColor = localStorage.getItem('playerColor') || '#dc143c'
    this.myLabelColor = localStorage.getItem('labelColor') || '#ffffff'
    this.myMaterial = localStorage.getItem('material') || 'plastic'
    this.myTexture = localStorage.getItem('texture') || ''
  }

  async connectedCallback() {
    await this.loadTextures()
    this.attachEventListeners()
    this.updateUIValues()
  }

  async loadTextures() {
    try {
      const response = await fetch('./textures.json')
      const textures = await response.json()
      const textureSelect = this.querySelector('#texture-select')

      textureSelect.innerHTML = '<option value="">None (Solid)</option>'

      textures.forEach(texture => {
        const option = document.createElement('option')
        option.value = texture
        option.textContent =
          texture.charAt(0).toUpperCase() + texture.slice(1).replace(/[.-]/g, ' ')
        textureSelect.appendChild(option)
      })

      textureSelect.value = this.myTexture
    } catch (err) {
      console.error('Failed to load textures:', err)
    }
  }

  updateUIValues() {
    this.querySelector('#color-picker').value = this.myColor
    this.querySelector('#label-color-picker').value = this.myLabelColor
    this.querySelector('#material-select').value = this.myMaterial
  }

  attachEventListeners() {
    const dialog = this.querySelector('dialog')
    const openBtn = document.querySelector('#dice-settings-btn')
    const closeBtn = this.querySelector('#close-dialog-btn')

    if (openBtn) {
      openBtn.addEventListener('click', () => dialog.showModal())
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close())
    }

    this.querySelector('#color-picker').addEventListener('input', e => {
      this.myColor = e.target.value
      localStorage.setItem('playerColor', this.myColor)
      this.dispatchEvent(new CustomEvent('color-change', {
        detail: {color: this.myColor},
        bubbles: true
      }))
    })

    this.querySelector('#label-color-picker').addEventListener('change', e => {
      this.myLabelColor = e.target.value
      localStorage.setItem('labelColor', this.myLabelColor)
      this.dispatchEvent(new CustomEvent('label-color-change', {
        detail: {labelColor: this.myLabelColor},
        bubbles: true
      }))
    })

    this.querySelector('#material-select').addEventListener('change', e => {
      this.myMaterial = e.target.value
      localStorage.setItem('material', this.myMaterial)
      this.dispatchEvent(new CustomEvent('material-change', {
        detail: {material: this.myMaterial},
        bubbles: true
      }))
    })

    this.querySelector('#texture-select').addEventListener('change', e => {
      this.myTexture = e.target.value
      localStorage.setItem('texture', this.myTexture)
      this.dispatchEvent(new CustomEvent('texture-change', {
        detail: {texture: this.myTexture},
        bubbles: true
      }))
    })
  }

  getSettings() {
    return {
      color: this.myColor,
      labelColor: this.myLabelColor,
      material: this.myMaterial,
      texture: this.myTexture
    }
  }
}

customElements.define('dice-settings', DiceSettings)

