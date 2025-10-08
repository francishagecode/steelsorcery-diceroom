import DiceBox from '@3d-dice/dice-box-threejs'

export class DiceBoxComponent extends HTMLElement {
  constructor() {
    super()
    this.diceBox = null
    this.currentDiceColor = null
    this.diceConfig = {
      texture: '',
      material: 'plastic',
      gravity: 400,
      strength: 11,
      labelColor: '#ffffff',
      outlineColor: '#000000',
      soundsSurface: 'wood_tray',
    }
  }

  async initialize(color, initialConfig = {}) {
    this.diceConfig = { ...this.diceConfig, ...initialConfig }
    await this.initializeDiceBox(color)
  }

  async initializeDiceBox(color) {
    const config = {
      assetPath: './',
      theme_customColorset: {
        background: color,
        foreground: this.diceConfig.labelColor,
        outline: this.diceConfig.outlineColor,
        texture: this.diceConfig.texture,
        material: this.diceConfig.material,
      },
      light_intensity: 1,
      gravity_multiplier: this.diceConfig.gravity,
      baseScale: 100,
      strength: this.diceConfig.strength,
      soundsSurface: this.diceConfig.soundsSurface,
      soundsVolume: this.diceConfig.soundsVolume,
      shadows: false,
      onRollComplete: (results) => {
        console.log('Roll complete:', results)
      },
    }

    this.diceBox = new DiceBox('#dice-box-container', config)

    await this.diceBox.initialize().catch((err) => {
      console.error('DiceBox initialization failed:', err)
    })
  }

  async updateConfig(config, color) {
    this.diceConfig = { ...this.diceConfig, ...config }
    await this.reinitialize(color)
    this.currentDiceColor = color
  }

  async reinitialize(color) {
    const canvases = this.querySelectorAll('canvas')
    canvases.forEach((canvas) => {
      canvas.remove()
    })
    await this.initializeDiceBox(color)
  }

  async roll(rollData, color, strength = 11, settings = {}) {
    if (!this.diceBox) return

    const newSettings = {
      texture: settings.texture || this.diceConfig.texture,
      material: settings.material || this.diceConfig.material,
      labelColor: settings.labelColor || this.diceConfig.labelColor,
    }

    const needsReinit =
      this.currentDiceColor !== color ||
      this.diceConfig.strength !== strength ||
      this.diceConfig.texture !== newSettings.texture ||
      this.diceConfig.material !== newSettings.material ||
      this.diceConfig.labelColor !== newSettings.labelColor

    if (needsReinit) {
      this.diceConfig = { ...this.diceConfig, ...newSettings, strength }
      await this.reinitialize(color)
      this.currentDiceColor = color
    }

    const diceTypes = rollData.results.map((r) => `1d${r.sides}`).join('+')
    const values = rollData.results.map((r) => r.value).join(',')
    const notation = `${diceTypes}@${values}`

    console.log('Rolling with notation:', notation, 'in color:', color, 'strength:', strength)

    try {
      const result = await this.diceBox.roll(notation)
      console.log('3D roll result:', result)
    } catch (err) {
      console.error('3D dice roll error:', err, rollData)
    }
  }
}

customElements.define('dice-box', DiceBoxComponent)
