import { createInteractionSystem as createInteractionSystemDefault } from '../../game/systems/interaction-system.js';
import { findHero } from '../../game/domain/entity-queries.js';
import { sameTile } from '../../engine/tile-utils.js';
import { getInteractionEffects } from './shared/interaction-outcomes.js';
import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerInteractionModule = defineModule((
  { emit },
  {
    createInteractionSystem = createInteractionSystemDefault
  } = {}
) => {
  let hero = null;
  let interactions = null;
  let factsOnModalClosed = [];

  function emitFacts(facts) {
    for (const fact of facts ?? []) {
      emit(fact.type, fact.detail);
    }
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          const world = event.detail;
          hero = findHero(world.scenario.entities);
          factsOnModalClosed = [];
          interactions = createInteractionSystem({
            entities: world.scenario.entities,
            definitions: world.definitions
          });
        }
      },
      {
        type: APP_FACT_MOVE_FINISHED,
        handler: (event) => {
          if (!interactions || !hero) {
            return;
          }

          const destinationTile = event.detail.targetTile;
          if (!destinationTile) {
            return;
          }

          const didTriggerArrivalInteraction = Boolean(event.detail.interaction?.kind);
          if (!didTriggerArrivalInteraction && !sameTile(hero.tile, destinationTile)) {
            return;
          }

          const outcome = interactions.resolveArrivalAtDestination({
            destinationTile,
            arrivingEntityId: hero.id
          });
          const effects = getInteractionEffects(outcome);
          if (!effects) {
            return;
          }

          emitFacts(effects.facts);

          if (effects.modal) {
            factsOnModalClosed = effects.factsOnModalClosed ?? [];
            emit(APP_UI_INTERACTION_MODAL_OPENED, effects.modal);
          }
        }
      },
      {
        type: APP_UI_INTERACTION_MODAL_CLOSED,
        handler: () => {
          const facts = factsOnModalClosed;
          factsOnModalClosed = [];
          emitFacts(facts);
        }
      }
    ]
  };
}, {
  id: 'interaction',
  phase: 'domain',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_FACT_MOVE_FINISHED,
    APP_UI_INTERACTION_MODAL_CLOSED
  ],
  produces: [
    APP_UI_INTERACTION_MODAL_OPENED,
    APP_FACT_MONSTER_DEFEATED,
    APP_FACT_RESOURCE_COLLECTED,
    APP_FACT_TOWN_VISITED
  ]
});
