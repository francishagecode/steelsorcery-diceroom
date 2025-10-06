import DiceBox from '@3d-dice/dice-box-threejs'

const dicePoolEl = document.querySelector('#dice-pool')
const rollPoolBtn = document.querySelector('#roll-pool-btn')

export const pool = []
let diceBox = null
let diceConfig = {
  texture: '',
  material: 'plastic',
  gravity: 400,
  strength: 11,
  labelColor: '#ffffff',
  outlineColor: '#000000',
  soundsSurface: 'wood_tray',
  soundsVolume: 0.6
}

// Initialize 3D dice box
export async function initDiceBox(color, initialConfig = {}) {
  // Merge initial config with defaults
  diceConfig = {...diceConfig, ...initialConfig}

  diceBox = new DiceBox('#dice-box-container', {
    assetPath: './',
    theme_customColorset: {
      background: color,
      foreground: diceConfig.labelColor,
      outline: diceConfig.outlineColor,
      texture: diceConfig.texture,
      material: diceConfig.material
    },
    light_intensity: 1,
    gravity_multiplier: diceConfig.gravity,
    baseScale: 100,
    strength: diceConfig.strength,
    sounds: true,
    soundsSurface: diceConfig.soundsSurface,
    soundsVolume: diceConfig.soundsVolume,
    onRollComplete: results => {
      console.log('Roll complete:', results)
    }
  })

  await diceBox.initialize().catch(err => {
    console.error('DiceBox initialization failed:', err)
  })
}

// Update dice config and reinitialize
export async function updateDiceConfig(config, color) {
  diceConfig = {...diceConfig, ...config}
  await reinitializeDiceBox(color)
  currentDiceColor = color
}

export async function reinitializeDiceBox(color) {
  const container = document.querySelector('#dice-box-container')
  const canvases = container.querySelectorAll('canvas')
  canvases.forEach(canvas => canvas.remove())

  await initDiceBox(color)
}

let currentDiceColor = null

export async function roll3DDice(rollData, color, strength = 11, settings = {}) {
  if (!diceBox) return

  const newSettings = {
    texture: settings.texture || diceConfig.texture,
    material: settings.material || diceConfig.material,
    labelColor: settings.labelColor || diceConfig.labelColor
  }

  const needsReinit =
    currentDiceColor !== color ||
    diceConfig.strength !== strength ||
    diceConfig.texture !== newSettings.texture ||
    diceConfig.material !== newSettings.material ||
    diceConfig.labelColor !== newSettings.labelColor

  if (needsReinit) {
    diceConfig = {...diceConfig, ...newSettings, strength}
    await reinitializeDiceBox(color)
    currentDiceColor = color
  }

  const diceTypes = rollData.results.map(r => `1d${r.sides}`).join('+')
  const values = rollData.results.map(r => r.value).join(',')
  const notation = `${diceTypes}@${values}`

  console.log('Rolling with notation:', notation, 'in color:', color, 'strength:', strength)

  try {
    const result = await diceBox.roll(notation)
    console.log('3D roll result:', result)
  } catch (err) {
    console.error('3D dice roll error:', err, rollData)
  }
}

// Pool management
export function addDieToPool(sides) {
  const dieId = Date.now() + Math.random()
  pool.push({id: dieId, sides})
  renderPool()
  updateRollButton()
}

export function removeDieFromPool(dieId) {
  const index = pool.findIndex(d => d.id === dieId)
  if (index !== -1) {
    pool.splice(index, 1)
    renderPool()
    updateRollButton()
  }
}

export function clearPool() {
  pool.length = 0
  renderPool()
  updateRollButton()
}

function renderPool() {
  if (pool.length === 0) {
    dicePoolEl.innerHTML =
      '<div class="w-full text-center text-gray-500 text-lg p-4 italic">Pool is empty. Click dice above to add them.</div>'
    updatePoolSummary()
    return
  }

  dicePoolEl.innerHTML = ''
  pool.forEach(die => {
    const dieEl = document.createElement('button')
    const colorClasses = {
      4: 'bg-dice-4 text-black hover:border-white',
      6: 'bg-dice-6 text-white hover:border-white',
      8: 'bg-dice-8 text-white hover:border-white',
      10: 'bg-dice-10 text-white hover:border-white',
      12: 'bg-dice-12 text-black hover:border-white',
      20: 'bg-dice-20 text-black hover:border-white'
    }
    dieEl.className = `w-[70px] h-[70px] text-lg font-bold border-[3px] border-black rounded-xl cursor-pointer transition-all shadow-[0_3px_6px_rgb(0_0_0/0.3)] hover:scale-110 hover:shadow-[0_5px_10px_rgb(255_255_255/0.3)] ${colorClasses[die.sides]}`
    dieEl.textContent = `d${die.sides}`
    dieEl.addEventListener('click', () => removeDieFromPool(die.id))
    dicePoolEl.appendChild(dieEl)
  })

  updatePoolSummary()
}

function updatePoolSummary() {
  const summaryEl = document.querySelector('#pool-summary')

  if (pool.length === 0) {
    summaryEl.textContent = ''
    return
  }

  const grouped = {}
  pool.forEach(die => {
    grouped[die.sides] = (grouped[die.sides] || 0) + 1
  })

  const summary = Object.keys(grouped)
    .sort((a, b) => a - b)
    .map(sides => `${grouped[sides]}d${sides}`)
    .join(', ')

  summaryEl.textContent = summary
}

export function updateRollButton() {
  rollPoolBtn.disabled = pool.length === 0
  if (pool.length === 0) {
    rollPoolBtn.textContent = 'Roll Pool'
  } else {
    rollPoolBtn.textContent = `Roll ${pool.length} ${pool.length === 1 ? 'Die' : 'Dice'}`
  }
}

export function setRollButtonState(disabled, text) {
  rollPoolBtn.disabled = disabled
  rollPoolBtn.textContent = text
}
