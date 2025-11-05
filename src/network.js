import {joinRoom, selfId} from 'trystero/supabase' // (trystero-supabase.min.js)
const rollHistory = document.querySelector('#roll-history')
const peerCountEl = document.querySelector('#peer-count')
const canvas = document.querySelector('#canvas')

export {selfId}

export const peerNames = {}
export const peerColors = {}
export const peerDiceSettings = {}
const cursors = {}

let room = null

// Network action senders - initialized when room connects
export const network = {
  sendRoll: null,
  sendName: null,
  sendMove: null,
  sendColor: null,
  sendEmoji: null,
  sendDiceSettings: null
}

const config = {
  appId: 'https://qedpxdusplakbbdmkqke.supabase.co',
  supabaseKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHB4ZHVzcGxha2JiZG1rcWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MTc1NDgsImV4cCI6MjA3NzM5MzU0OH0.pM8IdSC8oFb1IxDYm84yLBigG-CiRTcK8A58XtGqLb0'
}

/**
 * Joins a room and sets up network actions
 * @param {string} roomName - The room ID to join
 * @returns {Object} The room instance
 */
function connectToRoom(roomName) {
  console.log('[Network] Connecting to room:', roomName, 'with config:', config)
  room = joinRoom(config, roomName)
  console.log('[Network] Room joined, room object:', room)

  // Create bidirectional action channels
  const [sendRollFn, getRoll] = room.makeAction('diceRoll')
  const [sendNameFn, getName] = room.makeAction('playerName')
  const [sendMoveFn, getMove] = room.makeAction('mouseMove')
  const [sendColorFn, getColor] = room.makeAction('playerColor')
  const [sendEmojiFn, getEmoji] = room.makeAction('emoji')
  const [sendDiceSettingsFn, getDiceSettings] = room.makeAction('diceSettings')

  console.log('[Network] Actions created successfully')

  // Store send functions in exported network object
  network.sendRoll = sendRollFn
  network.sendName = sendNameFn
  network.sendMove = sendMoveFn
  network.sendColor = sendColorFn
  network.sendEmoji = sendEmojiFn
  network.sendDiceSettings = sendDiceSettingsFn

  return {getRoll, getName, getMove, getColor, getEmoji, getDiceSettings}
}

/**
 * Sets up peer event handlers (join/leave)
 */
function setupPeerHandlers() {
  console.log('[Network] Setting up peer handlers')
  room.onPeerJoin(handlePeerJoin)
  room.onPeerLeave(handlePeerLeave)
  console.log('[Network] Current peers:', room.getPeers())
}

/**
 * Registers action receivers with their callbacks
 * @param {Object} receivers - Object containing get functions from connectToRoom
 * @param {Function} onRollReceived - Callback for incoming rolls
 */
function registerActionHandlers(receivers, onRollReceived) {
  const {getRoll, getName, getMove, getColor, getEmoji, getDiceSettings} = receivers

  getRoll(onRollReceived)

  getName((name, peerId) => {
    peerNames[peerId] = name
    updateCursorName(peerId, name)
  })

  getColor((color, peerId) => {
    peerColors[peerId] = color
    updateCursorColor(peerId, color)
  })

  getDiceSettings((settings, peerId) => {
    peerDiceSettings[peerId] = settings
  })

  getMove(moveCursor)

  getEmoji(emoji => {
    const emojiButtons = document.querySelector('emoji-buttons')
    if (emojiButtons?.triggerEmojiConfetti) {
      emojiButtons.triggerEmojiConfetti(emoji)
    } else {
      emitEmojiConfetti(emoji)
    }
  })
}

/**
 * Called when a peer joins the room
 */
function handlePeerJoin(peerId) {
  console.log('[Network] Peer joined:', peerId)

  // Sync our current state to the new peer
  network.sendName?.(peerNames[selfId], peerId)
  network.sendColor?.(peerColors[selfId], peerId)

  if (peerDiceSettings[selfId]) {
    network.sendDiceSettings?.(peerDiceSettings[selfId], peerId)
  }

  // Initialize cursor at random position
  network.sendMove?.([Math.random() * 0.93, Math.random() * 0.93], peerId)

  // UI updates
  addCursor(peerId)
  updatePeerCount()
}

/**
 * Called when a peer leaves the room
 */
function handlePeerLeave(peerId) {
  console.log('[Network] Peer left:', peerId)

  // Clean up peer state
  delete peerNames[peerId]
  delete peerColors[peerId]
  delete peerDiceSettings[peerId]

  // UI updates
  removeCursor(peerId)
  updatePeerCount()
}

/**
 * Main entry point - initializes room connection and event system
 * @param {string} roomName - The room ID to join
 * @param {Function} onRollReceived - Callback for incoming dice rolls
 */
export function initRoom(roomName, onRollReceived) {
  // Update UI with room name
  document.querySelector('#room-num').innerText = `Room: ${roomName}`

  // Connect and setup in order
  const receivers = connectToRoom(roomName)
  setupPeerHandlers()
  registerActionHandlers(receivers, onRollReceived)
}

// Shared emoji confetti function
export function emitEmojiConfetti(emoji, x, y) {
  // If no position provided, use random position for peer reactions
  const origin =
    x !== undefined && y !== undefined
      ? {x, y}
      : {x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.5 + 0.4}

  confetti({
    particleCount: 3,
    spread: 100,
    startVelocity: 45,
    scalar: 3,
    gravity: 0.5,
    ticks: 200,
    flat: true,
    origin,
    shapes: ['emoji'],
    shapeOptions: {
      emoji: {
        value: [emoji]
      }
    }
  })
}

// Broadcast functions removed - use network.sendX() directly from main.js

// Cursor management
export function addCursor(id, isSelf = false) {
  const el = document.createElement('div')
  const img = document.createElement('img')
  const txt = document.createElement('p')

  el.className = 'absolute -ml-[10px] -mt-[2px]'
  el.style.left = el.style.top = '-99px'
  img.src = 'assets/images/hand.png'
  img.className = 'w-[34px] h-[46px]'
  img.style.imageRendering = 'pixelated'
  txt.className = `text-center text-sm font-bold px-2 py-1 rounded-lg shadow-lg ${isSelf ? 'bg-white/90 text-black' : 'bg-black/90 text-white'}`
  txt.innerText = peerNames[id] || id.slice(0, 4)

  if (!isSelf) {
    txt.style.borderLeft = `3px solid ${peerColors[id] || '#ffffff'}`
  }

  el.appendChild(img)
  el.appendChild(txt)
  el.id = `cursor-${id}`
  canvas.appendChild(el)
  cursors[id] = el

  return el
}

export function removeCursor(id) {
  if (!cursors[id]) return

  canvas.removeChild(cursors[id])
  delete cursors[id]
}

export function moveCursor([x, y], id) {
  const el = cursors[id]
  if (!el || typeof x !== 'number' || typeof y !== 'number') return

  el.style.left = `${x * window.innerWidth}px`
  el.style.top = `${y * window.innerHeight}px`
}

/**
 * Updates a peer's cursor name display
 */
function updateCursorName(peerId, name) {
  const cursor = cursors[peerId]
  if (!cursor) return

  const nameLabel = cursor.querySelector('p')
  if (!nameLabel) return

  nameLabel.textContent = name
}

/**
 * Updates a peer's cursor color display
 */
function updateCursorColor(peerId, color) {
  const cursor = cursors[peerId]
  if (!cursor) return

  const nameLabel = cursor.querySelector('p')
  if (!nameLabel) return

  nameLabel.style.borderLeft = `3px solid ${color}`
}

function updatePeerCount() {
  const count = Object.keys(room.getPeers()).length
  peerCountEl.textContent =
    count === 0
      ? 'No peers connected'
      : count === 1
        ? '1 peer connected'
        : `${count} peers connected`
}

// Roll history display
export function displayRollInHistory(rollData, peerId) {
  const {results, total, timestamp} = rollData
  const playerName = peerNames[peerId] || peerId.slice(0, 8)
  const isYou = peerId === selfId

  const rollEl = document.createElement('div')
  rollEl.className = `bg-black/40 rounded-xl p-4 sm:p-6 lg:p-8 animate-[slideIn_0.3s_ease-out] ${
    isYou ? 'ring-1 sm:ring-2 ring-white/30' : ''
  }`

  const header = document.createElement('div')
  header.className =
    'flex justify-between mb-4 sm:mb-6 text-xs sm:text-sm lg:text-base items-start'

  const leftInfo = document.createElement('div')
  leftInfo.className = 'flex items-center gap-2'

  const colorDot = document.createElement('div')
  colorDot.className = 'w-3 h-3 rounded-full flex-shrink-0'
  colorDot.style.backgroundColor = peerColors[peerId] || '#ffffff'

  const player = document.createElement('span')
  player.className = `font-bold text-base sm:text-lg lg:text-xl ${isYou ? 'text-orange-400' : 'text-white'}`
  player.textContent = playerName

  leftInfo.appendChild(colorDot)
  leftInfo.appendChild(player)

  const rightInfo = document.createElement('div')
  rightInfo.className = 'flex flex-col items-end gap-1 sm:gap-2'

  const time = document.createElement('span')
  time.className = 'text-gray-500 text-xs sm:text-sm lg:text-base'
  time.textContent = new Date(timestamp).toLocaleTimeString()

  const totalEl = document.createElement('div')
  totalEl.className = 'text-lg sm:text-xl lg:text-2xl font-bold text-white'
  totalEl.textContent = `Total: ${total}`

  rightInfo.appendChild(time)
  rightInfo.appendChild(totalEl)

  header.appendChild(leftInfo)
  header.appendChild(rightInfo)

  const diceContainer = document.createElement('div')
  diceContainer.className = 'flex gap-1 sm:gap-1.5 flex-wrap'

  results.forEach(result => {
    const die = document.createElement('span')
    const diceColors = {
      4: 'bg-dice-4 text-black border-black',
      6: 'bg-dice-6 text-white border-black',
      8: 'bg-dice-8 text-white border-black',
      10: 'bg-dice-10 text-white border-black',
      12: 'bg-dice-12 text-black border-black',
      20: 'bg-dice-20 text-black border-black'
    }
    die.className = `min-w-[50px] sm:min-w-[55px] lg:min-w-[60px] h-[50px] sm:h-[55px] lg:h-[60px] px-3 sm:px-4 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-lg shadow-[0_4px_6px_rgb(0_0_0/0.3)] relative border-2 sm:border-[3px] ${diceColors[result.sides]}`
    die.textContent = result.value

    const label = document.createElement('span')
    label.className =
      'absolute bottom-[2px] right-1 text-xs sm:text-sm lg:text-base text-black/40 font-normal'
    label.textContent = `d${result.sides}`
    die.appendChild(label)

    diceContainer.appendChild(die)
  })

  rollEl.appendChild(header)
  rollEl.appendChild(diceContainer)

  rollHistory.insertBefore(rollEl, rollHistory.firstChild)

  const maxRolls = 20
  while (rollHistory.children.length > maxRolls) {
    rollHistory.removeChild(rollHistory.lastChild)
  }
}
