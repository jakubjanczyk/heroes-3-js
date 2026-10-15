import { createWorldReplica } from '../../../game/world-replica.js';
import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY
} from '../../events.js';

export const WORLD_REPLICA_EVENTS = Object.freeze([
  APP_FACT_WORLD_READY,
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED
]);

// Keeps a module's private world replica in sync with world facts.
// Spread `subscriptions` before the module's own entries so the replica is current
// by the time the module handles the same event.
export function createWorldReplicaTracker() {
  let replica = null;

  return {
    get: () => replica,
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          replica = createWorldReplica(event.detail);
        }
      },
      {
        type: APP_FACT_HERO_MOVED,
        handler: (event) => {
          replica?.applyHeroMoved(event.detail);
        }
      },
      {
        type: APP_FACT_MONSTER_DEFEATED,
        handler: (event) => {
          replica?.removeEntity(event.detail?.entityId);
        }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTED,
        handler: (event) => {
          replica?.removeEntity(event.detail?.entityId);
        }
      }
    ]
  };
}
