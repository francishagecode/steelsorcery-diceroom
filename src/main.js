import {
  displayRollInHistory,
  initRoom,
  network,
  peerColors,
  peerDiceSettings,
  peerNames,
  selfId,
  updateUsernameList,
} from './network.js'
import './emoji-buttons.js'
import './dice-pool.js'
import './dice-settings.js'
import './dice-box.js'

const roomId = window.location.hash.slice(1) || 'main'
console.log('Room ID:', roomId)

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

updateUsernameList()

async function handleIncomingRoll(rollData, peerId) {
  const rollerColor = rollData.color || peerColors[peerId] || '#ffffff'
  const settings = rollData.settings || peerDiceSettings[peerId] || {}

  if (rollData.color && !peerColors[peerId]) {
    peerColors[peerId] = rollData.color
  }
  if (rollData.settings && !peerDiceSettings[peerId]) {
    peerDiceSettings[peerId] = rollData.settings
  }

  await diceBoxEl.roll(rollData, rollerColor, settings)
  displayRollInHistory(rollData, peerId)
}

try {
  console.log('Initializing room...')
  initRoom(roomId, handleIncomingRoll)
  document.documentElement.className = 'ready'
  console.log('Room initialized successfully')
} catch (error) {
  console.error('Failed to initialize room:', error)
  console.log('Continuing without network features...')
  document.documentElement.className = 'ready'
}

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
  const hash = [...str].reduce((acc, char) => {
    const code = char.charCodeAt(0)
    let newHash = (acc << 5) - acc + code
    newHash = newHash & newHash
    return newHash
  }, 0)

  return Math.abs(hash).toString(16).substring(0, 8)
}

document.querySelector('#name-btn').addEventListener('click', () => {
  const newName = prompt('Enter your name:', myName)
  if (!newName?.trim()) return

  myName = newName.trim()
  peerNames[selfId] = myName
  localStorage.setItem('playerName', myName)

  updateUsernameList()
  network.sendName?.(myName)
})

diceSettingsEl.addEventListener('color-change', async (e) => {
  const { color } = e.detail
  peerColors[selfId] = color

  const currentSettings = diceSettingsEl.getSettings()
  await diceBoxEl.updateConfig({ color: currentSettings.color }, color)
  network.sendColor?.(color)
})

diceSettingsEl.addEventListener('label-color-change', async (e) => {
  const { labelColor } = e.detail
  peerDiceSettings[selfId].labelColor = labelColor
  const currentSettings = diceSettingsEl.getSettings()
  await diceBoxEl.updateConfig({ labelColor }, currentSettings.color)
  network.sendDiceSettings?.(peerDiceSettings[selfId])
})

diceSettingsEl.addEventListener('material-change', async (e) => {
  const { material } = e.detail
  peerDiceSettings[selfId].material = material
  const currentSettings = diceSettingsEl.getSettings()
  await diceBoxEl.updateConfig({ material }, currentSettings.color)
  network.sendDiceSettings?.(peerDiceSettings[selfId])
})

diceSettingsEl.addEventListener('texture-change', async (e) => {
  const { texture } = e.detail
  peerDiceSettings[selfId].texture = texture
  const currentSettings = diceSettingsEl.getSettings()
  await diceBoxEl.updateConfig({ texture }, currentSettings.color)
  network.sendDiceSettings?.(peerDiceSettings[selfId])
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
