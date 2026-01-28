import { createClient } from '@supabase/supabase-js';
import PubSub from 'pubsub-js';

const SUPABASE_URL = 'https://qedpxdusplakbbdmkqke.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHB4ZHVzcGxha2JiZG1rcWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MTc1NDgsImV4cCI6MjA3NzM5MzU0OH0.pM8IdSC8oFb1IxDYm84yLBigG-CiRTcK8A58XtGqLb0';

export const selfId = crypto.randomUUID();

class NetworkManager {
  constructor() {
    this.selfId = selfId;
    this.peers = new Map();
    this.channel = null;
    this.supabase = null;
  }

  async connect(roomName) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    this.channel = this.supabase.channel(`room:${roomName}`, {
      config: { broadcast: { self: true }, presence: { key: this.selfId } },
    });

    this.channel.on('broadcast', { event: 'roll' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      PubSub.publish('roll:received', {
        peerId: payload.peerId,
        rollData: payload,
      });
    });

    this.channel.on('broadcast', { event: 'settings' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      this.updatePeer(payload.peerId, payload);
      PubSub.publish('peer:updated', { peerId: payload.peerId });
    });

    this.channel.on('broadcast', { event: 'emoji' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      PubSub.publish('emoji:received', {
        peerId: payload.peerId,
        emoji: payload.emoji,
      });
    });

    this.channel.on('broadcast', { event: 'pool:add' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      PubSub.publish('pool:add', payload.die);
    });

    this.channel.on('broadcast', { event: 'pool:remove' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      PubSub.publish('pool:remove', { dieId: payload.dieId, peerId: payload.peerId });
    });

    this.channel.on('broadcast', { event: 'pool:clear' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      PubSub.publish('pool:clear', { peerId: payload.peerId });
    });

    this.channel.on('broadcast', { event: 'pool:sync:request' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      PubSub.publish('pool:sync:requested');
    });

    this.channel.on('broadcast', { event: 'pool:sync' }, ({ payload }) => {
      if (payload.peerId === this.selfId) return;
      PubSub.publish('pool:sync:received', payload.dice);
    });

    this.channel.on('presence', { event: 'sync' }, () => {
      this.handlePresenceSync(this.channel.presenceState());
    });

    PubSub.subscribe('roll:send', (_, data) => {
      this.channel.send({
        type: 'broadcast',
        event: 'roll',
        payload: { peerId: this.selfId, ...data },
      });
    });

    PubSub.subscribe('settings:send', (_, data) => {
      this.channel.send({
        type: 'broadcast',
        event: 'settings',
        payload: { peerId: this.selfId, ...data },
      });
    });

    PubSub.subscribe('emoji:send', (_, emoji) => {
      this.channel.send({
        type: 'broadcast',
        event: 'emoji',
        payload: { peerId: this.selfId, emoji },
      });
    });

    PubSub.subscribe('pool:add:broadcast', (_, die) => {
      this.channel.send({
        type: 'broadcast',
        event: 'pool:add',
        payload: { peerId: this.selfId, die },
      });
    });

    PubSub.subscribe('pool:remove:broadcast', (_, { dieId, peerId }) => {
      this.channel.send({
        type: 'broadcast',
        event: 'pool:remove',
        payload: { peerId, dieId },
      });
    });

    PubSub.subscribe('pool:clear:broadcast', () => {
      this.channel.send({
        type: 'broadcast',
        event: 'pool:clear',
        payload: { peerId: this.selfId },
      });
    });

    PubSub.subscribe('pool:sync:request', () => {
      this.channel.send({
        type: 'broadcast',
        event: 'pool:sync:request',
        payload: { peerId: this.selfId },
      });
    });

    PubSub.subscribe('pool:sync:send', (_, dice) => {
      this.channel.send({
        type: 'broadcast',
        event: 'pool:sync',
        payload: { peerId: this.selfId, dice },
      });
    });

    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({ online_at: new Date().toISOString() });
        PubSub.publish('room:connected', { roomName });
      }
    });
  }

  updatePeer(peerId, data) {
    let peer = this.peers.get(peerId);

    if (!peer) {
      peer = {
        id: peerId,
        name: data.name || peerId.slice(0, 8),
        color: data.color || '#ffffff',
        diceSettings: data.diceSettings || {},
      };
      this.peers.set(peerId, peer);
    } else {
      if (data.name !== undefined) peer.name = data.name;
      if (data.color !== undefined) peer.color = data.color;
      if (data.diceSettings !== undefined) {
        peer.diceSettings = { ...peer.diceSettings, ...data.diceSettings };
      }
    }
  }

  handlePresenceSync(state) {
    const currentPeerIds = new Set(Object.keys(state));

    for (const [peerId] of this.peers) {
      if (peerId !== this.selfId && !currentPeerIds.has(peerId)) {
        this.peers.delete(peerId);
        PubSub.publish('peer:left', { peerId });
      }
    }

    for (const peerId of currentPeerIds) {
      if (peerId !== this.selfId && !this.peers.has(peerId)) {
        this.updatePeer(peerId, {});
        PubSub.publish('peer:joined', { peerId });
      }
    }

    const self = this.peers.get(this.selfId);
    if (self) {
      this.channel.send({
        type: 'broadcast',
        event: 'settings',
        payload: {
          peerId: this.selfId,
          name: self.name,
          color: self.color,
          diceSettings: self.diceSettings,
        },
      });
    }
  }

  getPeer(peerId) {
    return this.peers.get(peerId) || null;
  }

  getAllPeers() {
    return Array.from(this.peers.values());
  }

  countOtherPeers() {
    return this.peers.size - (this.peers.has(this.selfId) ? 1 : 0);
  }
}

export const network = new NetworkManager();
