import {
  broadcastRoll,
  displayRollInHistory,
  peerColors,
  selfId
} from './network.js'

const pool = []

const DICE_STYLES = {
  2: 'bg-dice-2 text-white',
  4: 'bg-dice-4 text-black',
  6: 'bg-dice-6 text-white',
  8: 'bg-dice-8 text-white',
  10: 'bg-dice-10 text-white',
  12: 'bg-dice-12 text-black',
  20: 'bg-dice-20 text-black'
}

const BASE_DIE_CLASSES =
  'w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] lg:w-[70px] lg:h-[70px] text-base sm:text-lg font-bold border-2 sm:border-[3px] border-black rounded-lg sm:rounded-xl cursor-pointer transition-all shadow-[0_3px_6px_rgb(0_0_0/0.3)] hover:scale-110 hover:shadow-[0_5px_10px_rgb(255_255_255/0.3)] hover:border-white'

class DicePool extends HTMLElement {
  connectedCallback() {
    this.dicePoolEl = this.querySelector('#dice-pool')
    this.rollPoolBtn = this.querySelector('#roll-pool-btn')
    this.attachEventListeners()
  }

  modifyPool(operation, ...args) {
    operation(...args)
    this.renderPool()
    this.updateRollButton()
  }

  addDieToPool(sides) {
    this.modifyPool(() => pool.push({id: Date.now() + Math.random(), sides}))
  }

  removeDieFromPool(dieId) {
    this.modifyPool(() => {
      const index = pool.findIndex(d => d.id === dieId)
      if (index !== -1) pool.splice(index, 1)
    })
  }

  clearPool() {
    this.modifyPool(() => (pool.length = 0))
  }

  createDieElement(die) {
    const btn = document.createElement('button')
    btn.className = `${BASE_DIE_CLASSES} ${DICE_STYLES[die.sides]}`
    btn.textContent = `d${die.sides}`
    btn.addEventListener('click', () => this.removeDieFromPool(die.id))
    return btn
  }

  renderPool() {
    if (pool.length === 0) {
      this.dicePoolEl.innerHTML =
        '<div class="w-full text-center text-gray-500 text-lg p-4 italic">Pool is empty. Click dice above to add them.</div>'
      this.updatePoolSummary()
      return
    }

    this.dicePoolEl.innerHTML = ''
    pool.forEach(die => this.dicePoolEl.appendChild(this.createDieElement(die)))
    this.updatePoolSummary()
  }

  updatePoolSummary() {
    const summaryEl = document.querySelector('#pool-summary')

    if (pool.length === 0) {
      summaryEl.textContent = ''
      return
    }

    const grouped = pool.reduce((acc, die) => {
      acc[die.sides] = (acc[die.sides] || 0) + 1
      return acc
    }, {})

    summaryEl.textContent = Object.keys(grouped)
      .sort((a, b) => a - b)
      .map(sides => `${grouped[sides]}d${sides}`)
      .join(', ')
  }

  updateRollButton() {
    this.rollPoolBtn.disabled = pool.length === 0
    this.rollPoolBtn.textContent =
      pool.length === 0
        ? 'Roll Pool'
        : `Roll ${pool.length} ${pool.length === 1 ? 'Die' : 'Dice'}`
  }

  attachEventListeners() {
    this.querySelectorAll('.dice-type-btn').forEach(btn => {
      btn.addEventListener('click', () =>
        this.addDieToPool(parseInt(btn.dataset.sides, 10))
      )

      btn.addEventListener('contextmenu', e => {
        e.preventDefault()
        this.clearPool()
        this.addDieToPool(parseInt(btn.dataset.sides, 10))
        setTimeout(() => pool.length > 0 && this.handleRollPool(), 50)
      })
    })

    if (this.rollPoolBtn) {
      this.rollPoolBtn.addEventListener('click', () => this.handleRollPool())
    }
  }

  rollDie(die) {
    return Math.floor(Math.random() * die.sides) + 1
  }

  async handleRollPool() {
    if (pool.length === 0) return

    this.rollPoolBtn.disabled = true
    this.rollPoolBtn.textContent = 'Rolling...'

    const diceToRoll = [...pool]
    this.clearPool()

    const results = diceToRoll.map(die => ({
      sides: die.sides,
      value: this.rollDie(die)
    }))

    const total = results.reduce((sum, r) => sum + r.value, 0)

    const rollData = {
      peerId: selfId,
      dice: diceToRoll.map(d => d.sides),
      results,
      total,
      timestamp: Date.now()
    }

    broadcastRoll(rollData)

    const diceBoxEl = document.querySelector('dice-box')
    await diceBoxEl.roll(rollData, peerColors[selfId])

    displayRollInHistory(rollData, selfId)

    this.rollPoolBtn.disabled = false
    this.updateRollButton()
  }
}

customElements.define('dice-pool', DicePool)
