import {
  pool,
  addDieToPool,
  clearPool,
  setRollButtonState,
  updateRollButton
} from '../dice.js'
import {selfId, broadcastRoll} from '../network.js'
import {roll3DDice} from '../dice.js'
import {displayRollInHistory} from '../network.js'
import {peerColors} from '../network.js'

class DicePool extends HTMLElement {
  constructor() {
    super()
    this.holdStrength = 0
    this.holdInterval = null
    this.isHolding = false
  }

  connectedCallback() {
    const rollButton = this.querySelector('#roll-pool-btn')
    if (rollButton) {
      rollButton.style.transition = 'background-color 0.2s'
    }
    this.attachEventListeners()
  }

  attachEventListeners() {
    // Dice type buttons - add to pool
    this.querySelectorAll('.dice-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sides = parseInt(btn.dataset.sides)
        addDieToPool(sides)
      })

      // Right-click to quick roll
      btn.addEventListener('contextmenu', e => {
        e.preventDefault()
        const sides = parseInt(btn.dataset.sides)
        clearPool()
        addDieToPool(sides)
        setTimeout(() => {
          if (pool.length > 0) {
            this.handleRollPool()
          }
        }, 50)
      })
    })

    // Roll pool button with hold mechanic
    const rollButton = this.querySelector('#roll-pool-btn')
    if (rollButton) {
      rollButton.addEventListener('mousedown', e => this.startHolding(e))
      rollButton.addEventListener('mouseup', e => this.releaseHold(e))
      rollButton.addEventListener('mouseleave', () => this.cancelHold())
      rollButton.addEventListener('touchstart', e => this.startHolding(e))
      rollButton.addEventListener('touchend', e => this.releaseHold(e))
      rollButton.addEventListener('touchcancel', () => this.cancelHold())
    }
  }

  startHolding(e) {
    if (pool.length === 0 || this.isHolding) return
    e.preventDefault()

    this.isHolding = true
    this.holdStrength = 1
    const rollButton = this.querySelector('#roll-pool-btn')

    this.holdInterval = setInterval(() => {
      const maxStrength = 150
      const wasAtMax = this.holdStrength >= maxStrength

      if (this.holdStrength < maxStrength) {
        this.holdStrength += 1
      }

      const progress = this.holdStrength / maxStrength
      const red = Math.round(30 + (255 - 30) * progress)
      const green = Math.round(58 - 58 * progress)
      const blue = Math.round(95 - 95 * progress)

      rollButton.style.setProperty(
        'background-color',
        `rgb(${red}, ${green}, ${blue})`,
        'important'
      )
    }, 1)
  }

  releaseHold(e) {
    if (!this.isHolding) return
    e.preventDefault()

    this.isHolding = false
    clearInterval(this.holdInterval)

    const rollButton = this.querySelector('#roll-pool-btn')
    rollButton.style.removeProperty('background-color')

    this.handleRollPool(this.holdStrength / 12)
    this.holdStrength = 0
  }

  cancelHold() {
    if (!this.isHolding) return

    this.isHolding = false
    clearInterval(this.holdInterval)
    this.holdStrength = 0

    const rollButton = this.querySelector('#roll-pool-btn')
    rollButton.style.removeProperty('background-color')
    updateRollButton()
  }

  async handleRollPool(strength = 11) {
    if (pool.length === 0) return

    setRollButtonState(true, 'Rolling...')

    const diceToRoll = [...pool]
    clearPool()

    const results = diceToRoll.map(die => ({
      sides: die.sides,
      value: Math.floor(Math.random() * die.sides) + 1
    }))

    const total = results.reduce((sum, r) => sum + r.value, 0)

    const rollData = {
      peerId: selfId,
      dice: diceToRoll.map(d => d.sides),
      results,
      total,
      timestamp: Date.now(),
      strength
    }

    broadcastRoll(rollData)
    await roll3DDice(rollData, peerColors[selfId], strength)
    displayRollInHistory(rollData, selfId)

    setRollButtonState(false, 'Roll Pool')
    updateRollButton()
  }
}

customElements.define('dice-pool', DicePool)
