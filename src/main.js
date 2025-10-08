import {
  addCursor,
  broadcastColor,
  broadcastDiceSettings,
  broadcastMove,
  broadcastName,
  displayRollInHistory,
  initRoom,
  moveCursor,
  peerColors,
  peerDiceSettings,
  peerNames,
  selfId,
} from './network.js'
import './emoji-buttons.js'
import './dice-pool.js'
import './dice-settings.js'
import './dice-box.js'

console.log('=== MAIN.JS STARTED, IMPORTS COMPLETE ===')

const roomId = window.location.hash.slice(1) || 'main'
console.log('Room ID:', roomId)

const _defaultColors = ['#dc143c', '#ffd700', '#4169e1', '#32cd32']

let myName = localStorage.getItem('playerName')
if (!myName) {
  const playerName = prompt('Enter your name:')
  myName = playerName?.trim() ? playerName.trim() : selfId.slice(0, 8)
  localStorage.setItem('playerName', myName)
}

const diceSettingsEl = document.querySelector('dice-settings')
const diceBoxEl = document.querySelector('dice-box')

const settings = diceSettingsEl.getSettings()

peerNames[selfId] = myName
peerColors[selfId] = settings.color
peerDiceSettings[selfId] = {
  texture: settings.texture,
  material: settings.material,
  labelColor: settings.labelColor,
}

await diceBoxEl.initialize(settings.color, {
  labelColor: settings.labelColor,
  material: settings.material,
  texture: settings.texture,
})

async function handleIncomingRoll(rollData, peerId) {
  const rollerColor = peerColors[peerId] || '#ffffff'
  const strength = rollData.strength || 11
  const settings = peerDiceSettings[peerId] || {}
  await diceBoxEl.roll(rollData, rollerColor, strength, settings)
  displayRollInHistory(rollData, peerId)
}

// Initialize room and networking
try {
  console.log('Initializing room...')
  initRoom(roomId, handleIncomingRoll)
  document.documentElement.className = 'ready'
  addCursor(selfId, true)
  console.log('Room initialized successfully')
} catch (error) {
  console.error('Failed to initialize room:', error)
  console.log('Continuing without network features...')
  document.documentElement.className = 'ready'
}

// Create new room button
document.querySelector('#create-room-btn').addEventListener('click', createNewRoom)

function createNewRoom() {
  const roomName = prompt('Enter a name for your new room:')
  if (!roomName) return

  const sanitized = roomName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')

  if (!sanitized) {
    alert('Please enter a valid room name (letters, numbers, and hyphens only)')
    return
  }

  const timestamp = Date.now()
  const hash = simpleMD5Hash(sanitized + timestamp)
  const newRoomId = `${sanitized}-${hash}`

  window.location.hash = newRoomId
  window.location.reload()
}

function simpleMD5Hash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).substring(0, 8)
}

document.querySelector('#name-btn').addEventListener('click', () => {
  const newName = prompt('Enter your name:', myName)
  if (newName?.trim()) {
    myName = newName.trim()
    peerNames[selfId] = myName
    localStorage.setItem('playerName', myName)

    const cursorEl = document.querySelector(`#cursor-${selfId}`)
    if (cursorEl) {
      const labelEl = cursorEl.querySelector('p')
      if (labelEl) {
        labelEl.textContent = myName
      }
    }

    broadcastName(myName)
  }
})

diceSettingsEl.addEventListener('color-change', async (e) => {
  const { color } = e.detail
  peerColors[selfId] = color

  await diceBoxEl.reinitialize(color)
  broadcastColor(color)
})

addEventListener('mousemove', ({ clientX, clientY }) => {
  const x = clientX / innerWidth
  const y = clientY / innerHeight
  moveCursor([x, y], selfId)
  broadcastMove([x, y])
})

addEventListener('touchmove', (e) => {
  const x = e.touches[0].clientX / innerWidth
  const y = e.touches[0].clientY / innerHeight
  moveCursor([x, y], selfId)
  broadcastMove([x, y])
})

diceSettingsEl.addEventListener('label-color-change', async (e) => {
  const { labelColor } = e.detail
  peerDiceSettings[selfId].labelColor = labelColor
  const currentSettings = diceSettingsEl.getSettings()
  await diceBoxEl.updateConfig({ labelColor }, currentSettings.color)
  broadcastDiceSettings(peerDiceSettings[selfId])
})

diceSettingsEl.addEventListener('material-change', async (e) => {
  const { material } = e.detail
  peerDiceSettings[selfId].material = material
  const currentSettings = diceSettingsEl.getSettings()
  await diceBoxEl.updateConfig({ material }, currentSettings.color)
  broadcastDiceSettings(peerDiceSettings[selfId])
})

diceSettingsEl.addEventListener('texture-change', async (e) => {
  const { texture } = e.detail
  peerDiceSettings[selfId].texture = texture
  const currentSettings = diceSettingsEl.getSettings()
  await diceBoxEl.updateConfig({ texture }, currentSettings.color)
  broadcastDiceSettings(peerDiceSettings[selfId])
})

addEventListener('hashchange', () => {
  window.location.reload()
})

document.querySelector('#faq-btn').addEventListener('click', () => {
  document.querySelector('#faq-dialog').showModal()
})

document.querySelector('#close-faq-btn').addEventListener('click', () => {
  document.querySelector('#faq-dialog').close()
})
