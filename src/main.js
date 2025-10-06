import {
  initRoom,
  selfId,
  peerNames,
  peerColors,
  addCursor,
  moveCursor,
  displayRollInHistory,
  broadcastRoll,
  broadcastName,
  broadcastMove,
  broadcastColor
} from './network.js'
import {
  pool,
  initDiceBox,
  reinitializeDiceBox,
  roll3DDice,
  addDieToPool,
  clearPool,
  updateRollButton,
  setRollButtonState,
  updateDiceConfig
} from './dice.js'
import './components/emoji-buttons.js'
import './components/dice-pool.js'

console.log('=== MAIN.JS STARTED, IMPORTS COMPLETE ===')

// Get room ID from URL hash
const roomId = window.location.hash.slice(1) || 'main'
console.log('Room ID:', roomId)

// Default color options
const defaultColors = ['#dc143c', '#ffd700', '#4169e1', '#32cd32'] // red, yellow, blue, green

// Initialize player name
let myName = localStorage.getItem('playerName')
if (!myName) {
  const playerName = prompt('Enter your name:')
  myName =
    playerName && playerName.trim() ? playerName.trim() : selfId.slice(0, 8)
  localStorage.setItem('playerName', myName)
}

// Initialize player color (dice color)
let myColor = localStorage.getItem('playerColor')
if (!myColor) {
  myColor = defaultColors[Math.floor(Math.random() * defaultColors.length)]
  localStorage.setItem('playerColor', myColor)
}

// Initialize dice preferences
let myLabelColor = localStorage.getItem('labelColor') || '#ffffff'
let myMaterial = localStorage.getItem('material') || 'plastic'
let myTexture = localStorage.getItem('texture') || ''

peerNames[selfId] = myName
peerColors[selfId] = myColor

// Load available textures and populate dropdown
async function loadTextures() {
  try {
    const response = await fetch('/textures.json')
    const textures = await response.json()
    const textureSelect = document.querySelector('#texture-select')

    // Clear existing options except "None"
    textureSelect.innerHTML = '<option value="">None (Solid)</option>'

    // Add all available textures
    textures.forEach(texture => {
      const option = document.createElement('option')
      option.value = texture
      option.textContent =
        texture.charAt(0).toUpperCase() + texture.slice(1).replace(/[.-]/g, ' ')
      textureSelect.appendChild(option)
    })

    // Set saved texture value
    textureSelect.value = myTexture
  } catch (err) {
    console.error('Failed to load textures:', err)
  }
}

// Load textures before initializing
await loadTextures()

// Set UI values to saved preferences
document.querySelector('#label-color-picker').value = myLabelColor
document.querySelector('#material-select').value = myMaterial

// Initialize 3D dice box with saved preferences
await initDiceBox(myColor, {
  labelColor: myLabelColor,
  material: myMaterial,
  texture: myTexture
})

async function handleIncomingRoll(rollData, peerId) {
  const rollerColor = peerColors[peerId] || '#ffffff'
  const strength = rollData.strength || 11
  await roll3DDice(rollData, rollerColor, strength)
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
document
  .querySelector('#create-room-btn')
  .addEventListener('click', createNewRoom)

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

// Change name button
document.querySelector('#name-btn').addEventListener('click', () => {
  const newName = prompt('Enter your name:', myName)
  if (newName && newName.trim()) {
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

// Dice settings dialog
const diceSettingsDialog = document.querySelector('#dice-settings-dialog')
document.querySelector('#dice-settings-btn').addEventListener('click', () => {
  diceSettingsDialog.showModal()
})
document.querySelector('#close-dialog-btn').addEventListener('click', () => {
  diceSettingsDialog.close()
})

// Color picker
const colorPicker = document.querySelector('#color-picker')
colorPicker.value = myColor
colorPicker.addEventListener('input', async e => {
  myColor = e.target.value
  peerColors[selfId] = myColor
  localStorage.setItem('playerColor', myColor)

  const cursorEl = document.querySelector(`#cursor-${selfId}`)
  if (cursorEl) {
    const labelEl = cursorEl.querySelector('p')
    if (labelEl) {
      labelEl.style.color = myColor
    }
  }

  await reinitializeDiceBox(myColor)
  broadcastColor(myColor)
})

// Mouse/touch movement tracking
addEventListener('mousemove', ({clientX, clientY}) => {
  const x = clientX / innerWidth
  const y = clientY / innerHeight
  moveCursor([x, y], selfId)
  broadcastMove([x, y])
})

addEventListener('touchmove', e => {
  const x = e.touches[0].clientX / innerWidth
  const y = e.touches[0].clientY / innerHeight
  moveCursor([x, y], selfId)
  broadcastMove([x, y])
})

// Dice settings controls
document
  .querySelector('#label-color-picker')
  .addEventListener('change', async e => {
    myLabelColor = e.target.value
    localStorage.setItem('labelColor', myLabelColor)
    await updateDiceConfig({labelColor: myLabelColor}, myColor)
  })

document
  .querySelector('#material-select')
  .addEventListener('change', async e => {
    myMaterial = e.target.value
    localStorage.setItem('material', myMaterial)
    await updateDiceConfig({material: myMaterial}, myColor)
  })

document
  .querySelector('#texture-select')
  .addEventListener('change', async e => {
    myTexture = e.target.value
    localStorage.setItem('texture', myTexture)
    await updateDiceConfig({texture: myTexture}, myColor)
  })
