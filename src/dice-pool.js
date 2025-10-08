import { broadcastRoll, displayRollInHistory, peerColors, selfId } from './network.js'

const pool = []

class DicePool extends HTMLElement {
  constructor() {
    super()
    this.holdStrength = 0
    this.holdInterval = null
    this.isHolding = false
    this.dicePoolEl = null
    this.rollPoolBtn = null
  }

  connectedCallback() {
    this.dicePoolEl = this.querySelector('#dice-pool')
    this.rollPoolBtn = this.querySelector('#roll-pool-btn')

    if (this.rollPoolBtn) {
      this.rollPoolBtn.style.transition = 'background-color 0.2s'
    }
    this.attachEventListeners()
  }

  addDieToPool(sides) {
    const dieId = Date.now() + Math.random()
    pool.push({ id: dieId, sides })
    this.renderPool()
    this.updateRollButton()
  }

  removeDieFromPool(dieId) {
    const index = pool.findIndex((d) => d.id === dieId)
    if (index !== -1) {
      pool.splice(index, 1)
      this.renderPool()
      this.updateRollButton()
    }
  }

  clearPool() {
    pool.length = 0
    this.renderPool()
    this.updateRollButton()
  }

  renderPool() {
    if (pool.length === 0) {
      this.dicePoolEl.innerHTML =
        '<div class="w-full text-center text-gray-500 text-lg p-4 italic">Pool is empty. Click dice above to add them.</div>'
      this.updatePoolSummary()
      return
    }

    this.dicePoolEl.innerHTML = ''
    pool.forEach((die) => {
      const dieEl = document.createElement('button')
      const colorClasses = {
        4: 'bg-dice-4 text-black hover:border-white',
        6: 'bg-dice-6 text-white hover:border-white',
        8: 'bg-dice-8 text-white hover:border-white',
        10: 'bg-dice-10 text-white hover:border-white',
        12: 'bg-dice-12 text-black hover:border-white',
        20: 'bg-dice-20 text-black hover:border-white',
      }
      dieEl.className = `w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] lg:w-[70px] lg:h-[70px] text-base sm:text-lg font-bold border-2 sm:border-[3px] border-black rounded-lg sm:rounded-xl cursor-pointer transition-all shadow-[0_3px_6px_rgb(0_0_0/0.3)] hover:scale-110 hover:shadow-[0_5px_10px_rgb(255_255_255/0.3)] ${colorClasses[die.sides]}`
      dieEl.textContent = `d${die.sides}`
      dieEl.addEventListener('click', () => this.removeDieFromPool(die.id))
      this.dicePoolEl.appendChild(dieEl)
    })

    this.updatePoolSummary()
  }

  updatePoolSummary() {
    const summaryEl = document.querySelector('#pool-summary')

    if (pool.length === 0) {
      summaryEl.textContent = ''
      return
    }

    const grouped = {}
    pool.forEach((die) => {
      grouped[die.sides] = (grouped[die.sides] || 0) + 1
    })

    const summary = Object.keys(grouped)
      .sort((a, b) => a - b)
      .map((sides) => `${grouped[sides]}d${sides}`)
      .join(', ')

    summaryEl.textContent = summary
  }

  updateRollButton() {
    this.rollPoolBtn.disabled = pool.length === 0
    if (pool.length === 0) {
      this.rollPoolBtn.textContent = 'Roll Pool'
    } else {
      this.rollPoolBtn.textContent = `Roll ${pool.length} ${pool.length === 1 ? 'Die' : 'Dice'}`
    }
  }

  setRollButtonState(disabled, text) {
    this.rollPoolBtn.disabled = disabled
    this.rollPoolBtn.textContent = text
  }

  attachEventListeners() {
    this.querySelectorAll('.dice-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sides = parseInt(btn.dataset.sides, 10)
        this.addDieToPool(sides)
      })

      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        const sides = parseInt(btn.dataset.sides, 10)
        this.clearPool()
        this.addDieToPool(sides)
        setTimeout(() => {
          if (pool.length > 0) {
            this.handleRollPool()
          }
        }, 50)
      })
    })

    if (this.rollPoolBtn) {
      this.rollPoolBtn.addEventListener('mousedown', (e) => this.startHolding(e))
      this.rollPoolBtn.addEventListener('mouseup', (e) => this.releaseHold(e))
      this.rollPoolBtn.addEventListener('mouseleave', () => this.cancelHold())
      this.rollPoolBtn.addEventListener('touchstart', (e) => this.startHolding(e))
      this.rollPoolBtn.addEventListener('touchend', (e) => this.releaseHold(e))
      this.rollPoolBtn.addEventListener('touchcancel', () => this.cancelHold())
    }
  }

  startHolding(e) {
    if (pool.length === 0 || this.isHolding) return
    e.preventDefault()

    this.isHolding = true
    this.holdStrength = 1

    this.holdInterval = setInterval(() => {
      const maxStrength = 150

      if (this.holdStrength < maxStrength) {
        this.holdStrength += 1
      }

      const progress = this.holdStrength / maxStrength
      const red = Math.round(30 + (255 - 30) * progress)
      const green = Math.round(58 - 58 * progress)
      const blue = Math.round(95 - 95 * progress)

      this.rollPoolBtn.style.setProperty(
        'background-color',
        `rgb(${red}, ${green}, ${blue})`,
        'important',
      )
    }, 1)
  }

  releaseHold(e) {
    if (!this.isHolding) return
    e.preventDefault()

    this.isHolding = false
    clearInterval(this.holdInterval)

    this.rollPoolBtn.style.removeProperty('background-color')

    this.handleRollPool(this.holdStrength / 12)
    this.holdStrength = 0
  }

  cancelHold() {
    if (!this.isHolding) return

    this.isHolding = false
    clearInterval(this.holdInterval)
    this.holdStrength = 0

    this.rollPoolBtn.style.removeProperty('background-color')
    this.updateRollButton()
  }

  async handleRollPool(strength = 11) {
    if (pool.length === 0) return

    this.setRollButtonState(true, 'Rolling...')

    const diceToRoll = [...pool]
    this.clearPool()

    const results = diceToRoll.map((die) => ({
      sides: die.sides,
      value: Math.floor(Math.random() * die.sides) + 1,
    }))

    const total = results.reduce((sum, r) => sum + r.value, 0)

    const rollData = {
      peerId: selfId,
      dice: diceToRoll.map((d) => d.sides),
      results,
      total,
      timestamp: Date.now(),
      strength,
    }

    broadcastRoll(rollData)

    const diceBoxEl = document.querySelector('dice-box')
    await diceBoxEl.roll(rollData, peerColors[selfId], strength)

    displayRollInHistory(rollData, selfId)

    this.setRollButtonState(false, 'Roll Pool')
    this.updateRollButton()
  }
}

customElements.define('dice-pool', DicePool)
