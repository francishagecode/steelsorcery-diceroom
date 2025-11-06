import { createClient } from '@supabase/supabase-js'

const rollHistory = document.querySelector('#roll-history')
const peerCountEl = document.querySelector('#peer-count')

// Generate a unique self ID
export const selfId = crypto.randomUUID()

export const peerNames = {}
export const peerColors = {}
export const peerDiceSettings = {}

let channel = null
let supabase = null

// Network action senders - initialized when room connects
export const network = {
  sendRoll: null,
  sendName: null,
  sendColor: null,
  sendEmoji: null,
  sendDiceSettings: null
}

const SUPABASE_URL = 'https://qedpxdusplakbbdmkqke.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHB4ZHVzcGxha2JiZG1rcWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MTc1NDgsImV4cCI6MjA3NzM5MzU0OH0.pM8IdSC8oFb1IxDYm84yLBigG-CiRTcK8A58XtGqLb0'

/**
 * Joins a room and sets up network actions
 * @param {string} roomName - The room ID to join
 * @returns {Object} Callback registrations
 */
function connectToRoom(roomName) {
  console.log('[Network] Connecting to room:', roomName)

  // Initialize Supabase client
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Create a channel for this room (public channel)
  const topic = `room:${roomName}`
  channel = supabase.channel(topic, { config: { broadcast: { self: true }, presence: { key: selfId } } })

  console.log('[Network] Channel created:', topic)

  // Callback storage for registering handlers later
  const callbacks = {
    onRoll: null,
    onName: null,
    onColor: null,
    onEmoji: null,
    onDiceSettings: null
  }

  // Set up broadcast listeners
  channel
    .on('broadcast', { event: 'diceRoll' }, ({ payload }) => {
      const isForMe = !payload.targetPeerId || payload.targetPeerId === selfId
      if (callbacks.onRoll && payload.peerId !== selfId && isForMe) {
        callbacks.onRoll(payload.data, payload.peerId)
      }
    })
    .on('broadcast', { event: 'playerName' }, ({ payload }) => {
      const isForMe = !payload.targetPeerId || payload.targetPeerId === selfId
      if (callbacks.onName && payload.peerId !== selfId && isForMe) {
        callbacks.onName(payload.data, payload.peerId)
      }
    })
    .on('broadcast', { event: 'playerColor' }, ({ payload }) => {
      const isForMe = !payload.targetPeerId || payload.targetPeerId === selfId
      if (callbacks.onColor && payload.peerId !== selfId && isForMe) {
        callbacks.onColor(payload.data, payload.peerId)
      }
    })
    .on('broadcast', { event: 'emoji' }, ({ payload }) => {
      const isForMe = !payload.targetPeerId || payload.targetPeerId === selfId
      if (callbacks.onEmoji && payload.peerId !== selfId && isForMe) {
        callbacks.onEmoji(payload.data, payload.peerId)
      }
    })
    .on('broadcast', { event: 'diceSettings' }, ({ payload }) => {
      const isForMe = !payload.targetPeerId || payload.targetPeerId === selfId
      if (callbacks.onDiceSettings && payload.peerId !== selfId && isForMe) {
        callbacks.onDiceSettings(payload.data, payload.peerId)
      }
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('[Network] Presence synced:', state)
      handlePresenceSync(state)
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Network] Presence join:', key, newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Network] Presence leave:', key, leftPresences)
    })

  // Subscribe to the channel
  channel.subscribe(async (status) => {
    console.log('[Network] Channel status:', status)
    if (status === 'SUBSCRIBED') {
      console.log('[Network] Subscribed to', topic)
      // Track our presence
      await channel.track({
        online_at: new Date().toISOString()
      })
    }
  })

  // Store send functions in exported network object
  network.sendRoll = (data, targetPeerId) => {
    channel.send({
      type: 'broadcast',
      event: 'diceRoll',
      payload: { data, peerId: selfId, targetPeerId }
    })
  }

  network.sendName = (data, targetPeerId) => {
    channel.send({
      type: 'broadcast',
      event: 'playerName',
      payload: { data, peerId: selfId, targetPeerId }
    })
  }

  network.sendColor = (data, targetPeerId) => {
    channel.send({
      type: 'broadcast',
      event: 'playerColor',
      payload: { data, peerId: selfId, targetPeerId }
    })
  }

  network.sendEmoji = (data, targetPeerId) => {
    channel.send({
      type: 'broadcast',
      event: 'emoji',
      payload: { data, peerId: selfId, targetPeerId }
    })
  }

  network.sendDiceSettings = (data, targetPeerId) => {
    channel.send({
      type: 'broadcast',
      event: 'diceSettings',
      payload: { data, peerId: selfId, targetPeerId }
    })
  }

  console.log('[Network] Actions created successfully')

  return callbacks
}

/**
 * Handles presence state sync - detects new and left peers
 */
function handlePresenceSync(state) {
  const currentPeerIds = Object.keys(state)
  const knownPeerIds = Object.keys(peerNames).filter(id => id !== selfId)

  console.log('[Network] Current peers:', currentPeerIds)
  console.log('[Network] Known peers:', knownPeerIds)

  const newPeers = []
  currentPeerIds.forEach((peerId) => {
    if (peerId !== selfId && !knownPeerIds.includes(peerId)) {
      newPeers.push(peerId)

      if (!peerNames[peerId]) {
        peerNames[peerId] = peerId.slice(0, 8)
      }
      if (!peerColors[peerId]) {
        peerColors[peerId] = '#ffffff'
      }

      console.log('[Network] New peer detected:', peerId)
    }
  })

  knownPeerIds.forEach((peerId) => {
    if (peerId !== selfId && !currentPeerIds.includes(peerId)) {
      handlePeerLeave(peerId)
    }
  })

  if (newPeers.length > 0) {
    console.log('[Network] Broadcasting state to new peers:', newPeers)

    network.sendName?.(peerNames[selfId])
    network.sendColor?.(peerColors[selfId])

    if (peerDiceSettings[selfId]) {
      network.sendDiceSettings?.(peerDiceSettings[selfId])
    }

    newPeers.forEach(peerId => {
      network.sendName?.(peerNames[selfId], peerId)
      network.sendColor?.(peerColors[selfId], peerId)

      if (peerDiceSettings[selfId]) {
        network.sendDiceSettings?.(peerDiceSettings[selfId], peerId)
      }
    })

    updateUsernameList()
    updatePeerCount()
  }
}

/**
 * Registers action receivers with their callbacks
 * @param {Object} callbacks - Callback object from connectToRoom
 * @param {Function} onRollReceived - Callback for incoming rolls
 */
function registerActionHandlers(callbacks, onRollReceived) {
  callbacks.onRoll = onRollReceived

  callbacks.onName = (name, peerId) => {
    console.log('[Network] Received name from', peerId, ':', name)
    const wasNewPeer = !peerNames[peerId]
    peerNames[peerId] = name
    updateUsernameList()
    if (wasNewPeer) {
      updatePeerCount()
    }
  }

  callbacks.onColor = (color, peerId) => {
    peerColors[peerId] = color
  }

  callbacks.onDiceSettings = (settings, peerId) => {
    peerDiceSettings[peerId] = settings
  }

  callbacks.onEmoji = (emoji) => {
    const emojiButtons = document.querySelector('emoji-buttons')
    if (emojiButtons?.triggerEmojiConfetti) {
      emojiButtons.triggerEmojiConfetti(emoji)
    } else {
      emitEmojiConfetti(emoji)
    }
  }
}

/**
 * Called when a peer joins the room
 */
function handlePeerJoin(peerId) {
  console.log('[Network] Peer joined:', peerId)

  if (!peerNames[peerId]) {
    peerNames[peerId] = peerId.slice(0, 8)
  }
  if (!peerColors[peerId]) {
    peerColors[peerId] = '#ffffff'
  }

  network.sendName?.(peerNames[selfId], peerId)
  network.sendColor?.(peerColors[selfId], peerId)

  if (peerDiceSettings[selfId]) {
    network.sendDiceSettings?.(peerDiceSettings[selfId], peerId)
  }

  updateUsernameList()
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
  updateUsernameList()
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
  const callbacks = connectToRoom(roomName)
  registerActionHandlers(callbacks, onRollReceived)
}

// Shared emoji confetti function
export function emitEmojiConfetti(emoji, x, y) {
  // If no position provided, use random position for peer reactions
  const origin =
    x !== undefined && y !== undefined
      ? { x, y }
      : { x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.5 + 0.4 }

  confetti({
    particleCount: 5,
    spread: 100,
    startVelocity: 65,
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

/**
 * Updates the username list display in the top bar
 */
export function updateUsernameList() {
  const usernameListEl = document.querySelector('#username-list')
  if (!usernameListEl) return

  // Get all peer names including self
  const allNames = Object.entries(peerNames)
    .map(([id, name]) => ({
      id,
      name,
      isSelf: id === selfId,
      color: peerColors[id] || '#ffffff'
    }))
    .sort((a, b) => {
      // Self first, then alphabetically
      if (a.isSelf) return -1
      if (b.isSelf) return 1
      return a.name.localeCompare(b.name)
    })

  // Clear and rebuild the list
  usernameListEl.innerHTML = ''

  if (allNames.length === 0) {
    usernameListEl.innerHTML = '<span class="text-gray-400 text-sm">No players</span>'
    return
  }

  allNames.forEach(({ name, isSelf, color }) => {
    const nameEl = document.createElement('span')
    nameEl.className = `text-sm font-medium ${isSelf ? 'text-orange-400' : 'text-white'}`
    nameEl.style.borderLeft = `3px solid ${color}`
    nameEl.style.paddingLeft = '0.5rem'
    nameEl.textContent = isSelf ? `${name} (you)` : name
    usernameListEl.appendChild(nameEl)
  })
}

function updatePeerCount() {
  if (!channel) return

  const state = channel.presenceState()
  const peerIds = Object.keys(state).filter((id) => id !== selfId)
  const count = peerIds.length

  peerCountEl.textContent =
    count === 0
      ? 'No peers connected'
      : count === 1
        ? '1 peer connected'
        : `${count} peers connected`
}

// Roll history display
export function displayRollInHistory(rollData, peerId) {
  const { results, total, timestamp } = rollData
  const playerName = peerNames[peerId] || peerId.slice(0, 8)
  const isYou = peerId === selfId
  const displayColor = rollData.color || peerColors[peerId] || '#ffffff'

  const rollEl = document.createElement('div')
  rollEl.className = `bg-black/40 rounded-xl p-4 sm:p-6 lg:p-8 animate-[slideIn_0.3s_ease-out] ${isYou ? 'ring-1 sm:ring-2 ring-white/30' : ''
    }`

  const header = document.createElement('div')
  header.className =
    'flex justify-between mb-4 sm:mb-6 text-xs sm:text-sm lg:text-base items-start'

  const leftInfo = document.createElement('div')
  leftInfo.className = 'flex items-center gap-2'

  const colorDot = document.createElement('div')
  colorDot.className = 'w-3 h-3 rounded-full flex-shrink-0'
  colorDot.style.backgroundColor = displayColor

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
