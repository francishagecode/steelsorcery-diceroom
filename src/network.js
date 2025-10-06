import {joinRoom, selfId} from 'trystero/torrent'

const canvas = document.querySelector('#canvas')
const rollHistory = document.querySelector('#roll-history')
const peerCountEl = document.querySelector('#peer-count')

export {selfId}

export const peerNames = {}
export const peerColors = {}
const cursors = {}

let room = null
let sendRoll = null
let sendName = null
let sendMove = null
let sendColor = null
let sendEmoji = null

const config = {
  appId: 'steel-sorcery-diceroom'
}

// Initialize room and setup peer handlers
export function initRoom(roomName, onRollReceived) {
  let getRoll, getName, getMove, getColor, getEmoji

  room = joinRoom(config, roomName)
  ;[sendRoll, getRoll] = room.makeAction('diceRoll')
  ;[sendName, getName] = room.makeAction('playerName')
  ;[sendMove, getMove] = room.makeAction('mouseMove')
  ;[sendColor, getColor] = room.makeAction('playerColor')
  ;[sendEmoji, getEmoji] = room.makeAction('emoji')

  document.querySelector('#room-num').innerText = `Room: ${roomName}`

  room.onPeerJoin(peerId => {
    sendName(peerNames[selfId], peerId)
    sendColor(peerColors[selfId], peerId)
    addCursor(peerId)
    if (sendMove) {
      sendMove([Math.random() * 0.93, Math.random() * 0.93], peerId)
    }
    updatePeerCount()
  })

  room.onPeerLeave(peerId => {
    delete peerNames[peerId]
    delete peerColors[peerId]
    removeCursor(peerId)
    updatePeerCount()
  })

  getRoll(onRollReceived)
  getName((name, peerId) => {
    peerNames[peerId] = name
    if (cursors[peerId]) {
      const nameLabel = cursors[peerId].querySelector('p')
      if (nameLabel) {
        nameLabel.textContent = name
      }
    }
  })
  getColor((color, peerId) => {
    peerColors[peerId] = color
    if (cursors[peerId]) {
      const nameLabel = cursors[peerId].querySelector('p')
      if (nameLabel) {
        nameLabel.style.color = color
      }
    }
  })
  getMove(moveCursor)
  getEmoji(emoji => {
    // Find the emoji button on this client and trigger confetti from its position
    const emojiButtons = document.querySelector('emoji-buttons')
    if (emojiButtons && emojiButtons.triggerEmojiConfetti) {
      emojiButtons.triggerEmojiConfetti(emoji)
    } else {
      // Fallback to random position if button not found
      emitEmojiConfetti(emoji)
    }
  })

  return {sendRoll, sendName, sendMove, sendColor, sendEmoji}
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

export function broadcastRoll(rollData) {
  if (sendRoll) {
    sendRoll(rollData)
  }
}

export function broadcastName(name) {
  if (sendName) {
    sendName(name)
  }
}

export function broadcastMove(coords) {
  if (sendMove) {
    sendMove(coords)
  }
}

export function broadcastColor(color) {
  if (sendColor) {
    sendColor(color)
  }
}

export function broadcastEmoji(emoji) {
  if (sendEmoji) {
    sendEmoji(emoji)
  }
}

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
  txt.className = `text-center text-base font-bold ${isSelf ? 'bg-white/80 px-2 rounded' : ''}`
  txt.innerText = peerNames[id] || id.slice(0, 4)
  txt.style.color = peerColors[id] || '#ffffff'
  el.appendChild(img)
  el.appendChild(txt)
  el.id = `cursor-${id}`
  canvas.appendChild(el)
  cursors[id] = el

  return el
}

export function removeCursor(id) {
  if (cursors[id]) {
    canvas.removeChild(cursors[id])
    delete cursors[id]
  }
}

export function moveCursor([x, y], id) {
  const el = cursors[id]

  if (el && typeof x === 'number' && typeof y === 'number') {
    el.style.left = x * window.innerWidth + 'px'
    el.style.top = y * window.innerHeight + 'px'
  }
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
  rollEl.className = `bg-black/40 rounded-xl p-8 animate-[slideIn_0.3s_ease-out] ${
    isYou ? 'ring-2 ring-white/30' : ''
  }`

  const header = document.createElement('div')
  header.className = 'flex justify-between mb-6 text-base items-start'

  const leftInfo = document.createElement('div')
  leftInfo.className = 'flex flex-col'

  const player = document.createElement('span')
  player.className = `font-bold text-xl ${isYou ? 'text-orange-400' : 'text-white'}`
  player.textContent = playerName

  leftInfo.appendChild(player)

  const rightInfo = document.createElement('div')
  rightInfo.className = 'flex flex-col items-end gap-2'

  const time = document.createElement('span')
  time.className = 'text-gray-500 text-base'
  time.textContent = new Date(timestamp).toLocaleTimeString()

  const totalEl = document.createElement('div')
  totalEl.className = 'text-2xl font-bold text-white'
  totalEl.textContent = `Total: ${total}`

  rightInfo.appendChild(time)
  rightInfo.appendChild(totalEl)

  header.appendChild(leftInfo)
  header.appendChild(rightInfo)

  const diceContainer = document.createElement('div')
  diceContainer.className = 'flex gap-1 flex-wrap'

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
    die.className = `min-w-[60px] h-[60px] px-4 flex items-center justify-center text-2xl font-bold rounded-lg shadow-[0_4px_6px_rgb(0_0_0/0.3)] relative border-[3px] ${diceColors[result.sides]}`
    die.textContent = result.value

    const label = document.createElement('span')
    label.className =
      'absolute bottom-[2px] right-1 text-base text-black/40 font-normal'
    label.textContent = `d${result.sides}`
    die.appendChild(label)

    diceContainer.appendChild(die)
  })

  rollEl.appendChild(header)
  rollEl.appendChild(diceContainer)

  rollHistory.insertBefore(rollEl, rollHistory.firstChild)

  const maxRolls = 50
  while (rollHistory.children.length > maxRolls) {
    rollHistory.removeChild(rollHistory.lastChild)
  }
}
