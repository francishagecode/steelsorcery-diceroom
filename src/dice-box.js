import DiceBox from '@3d-dice/dice-box-threejs'

const DEFAULT_STRENGTH = 8

export class DiceBoxComponent extends HTMLElement {
  constructor() {
    super()
    this.diceBox = null
    this.currentConfig = {}
  }

  async initialize(color, initialConfig = {}) {
    this.currentConfig = { color, ...initialConfig }
    await this.initializeDiceBox()
  }

  buildConfig() {

    const scale = (window.innerWidth < 768) ? 75 : 100;

    const {
      color,
      labelColor = '#ffffff',
      outlineColor = '#000000',
      texture = '',
      material = 'plastic',
    } = this.currentConfig

    return {
      assetPath: './',
      theme_customColorset: {
        background: color,
        foreground: labelColor,
        outline: outlineColor,
        texture,
        material
      },
      light_intensity: 1,
      gravity_multiplier: 400,
      baseScale: scale,
      theme_surface: 'green-felt',
      strength: DEFAULT_STRENGTH,
      shadows: false,
      sounds: true,
      onRollComplete: results => console.log('Roll complete:', results)
    }
  }

  async initializeDiceBox() {
    this.querySelectorAll('canvas').forEach(canvas => canvas.remove())

    this.diceBox = new DiceBox('#dice-box-container', this.buildConfig())
    await this.diceBox.initialize().catch(err => {
      console.error('DiceBox initialization failed:', err)
    })
  }

  async updateConfig(config, color) {
    const oldConfig = { ...this.currentConfig }
    this.currentConfig = { ...this.currentConfig, ...config, color }

    const configChanged =
      oldConfig.color !== this.currentConfig.color ||
      oldConfig.labelColor !== this.currentConfig.labelColor ||
      oldConfig.texture !== this.currentConfig.texture ||
      oldConfig.material !== this.currentConfig.material

    if (!configChanged) return

    await this.initializeDiceBox()
  }

  async roll(rollData, color, settings = {}) {
    if (!this.diceBox) return

    const newSettings = {
      texture: settings.texture || this.currentConfig.texture,
      material: settings.material || this.currentConfig.material,
      labelColor: settings.labelColor || this.currentConfig.labelColor
    }

    const visualChanged =
      this.currentConfig.color !== color ||
      this.currentConfig.texture !== newSettings.texture ||
      this.currentConfig.material !== newSettings.material ||
      this.currentConfig.labelColor !== newSettings.labelColor

    if (visualChanged) {
      this.currentConfig = { ...this.currentConfig, ...newSettings, color }
      await this.initializeDiceBox()
    }

    const diceTypes = rollData.results.map(r => `1d${r.sides}`).join('+')
    const values = rollData.results.map(r => r.value).join(',')
    const notation = `${diceTypes}@${values}`

    console.log('Rolling:', notation, 'color:', color)

    try {
      await this.diceBox.roll(notation)
    } catch (err) {
      console.error('3D dice roll error:', err, rollData)
    }
  }
}

customElements.define('dice-box', DiceBoxComponent)
