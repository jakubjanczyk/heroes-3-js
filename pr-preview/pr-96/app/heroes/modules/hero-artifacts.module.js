import {
  putBackHeldArtifacts,
  putHeldArtifactOn,
  scrollBackpackOf,
  sendAllArtifacts,
  swapAllArtifacts,
  takeArtifactFrom
} from '../../../game/heroes/artifact-exchange.js'
import {
  putBackHeldArtifact,
  putHeldArtifact,
  scrollBackpack,
  takeArtifact
} from '../../../game/heroes/artifacts.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { selectedHeroIdOf, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_HERO_ARTIFACT_PUT_BACK_REQUESTED,
  APP_COMMAND_HERO_ARTIFACT_PUT_REQUESTED,
  APP_COMMAND_HERO_ARTIFACT_TAKE_REQUESTED,
  APP_COMMAND_HERO_BACKPACK_SCROLL_REQUESTED,
  APP_COMMAND_HEROES_ARTIFACT_PUT_BACK_REQUESTED,
  APP_COMMAND_HEROES_ARTIFACT_PUT_REQUESTED,
  APP_COMMAND_HEROES_ARTIFACT_TAKE_REQUESTED,
  APP_COMMAND_HEROES_ARTIFACTS_SEND_REQUESTED,
  APP_COMMAND_HEROES_ARTIFACTS_SWAP_REQUESTED,
  APP_COMMAND_HEROES_BACKPACK_SCROLL_REQUESTED,
  APP_FACT_HERO_ARTIFACTS_CHANGED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const SIDES = ['left', 'right']

export const registerHeroArtifactsModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}

    function rearrange(rearrangeArtifacts) {
      const heroId = selectedHeroIdOf(state.get(), viewingPlayer(state.get()))
      const hero = heroById(state.get(), heroId)
      const artifacts = hero && rearrangeArtifacts(hero.artifacts)
      if (artifacts) {
        emit(APP_FACT_HERO_ARTIFACTS_CHANGED, { heroId, artifacts })
      }
    }

    function exchange(heroIds, exchangeArtifacts) {
      const heroes = SIDES.map((side) => heroById(state.get(), heroIds?.[side]))
      if (heroes.some((hero) => !hero) || heroes[0].id === heroes[1].id) {
        return
      }

      const artifacts = { left: heroes[0].artifacts, right: heroes[1].artifacts }
      const changed = exchangeArtifacts(artifacts)
      if (!changed) {
        return
      }
      SIDES.forEach((side, index) => {
        if (changed[side] !== artifacts[side]) {
          emit(APP_FACT_HERO_ARTIFACTS_CHANGED, {
            heroId: heroes[index].id,
            artifacts: changed[side]
          })
        }
      })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions
          }
        },
        {
          type: APP_COMMAND_HERO_ARTIFACT_TAKE_REQUESTED,
          handler: ({ detail: { place } }) =>
            rearrange((artifacts) => takeArtifact(artifacts, place))
        },
        {
          type: APP_COMMAND_HERO_ARTIFACT_PUT_REQUESTED,
          handler: ({ detail: { place } }) =>
            rearrange((artifacts) => putHeldArtifact(artifacts, place, definitions))
        },
        {
          type: APP_COMMAND_HERO_ARTIFACT_PUT_BACK_REQUESTED,
          handler: () => rearrange((artifacts) => putBackHeldArtifact(artifacts, definitions))
        },
        {
          type: APP_COMMAND_HERO_BACKPACK_SCROLL_REQUESTED,
          handler: ({ detail: { direction } }) =>
            rearrange((artifacts) => scrollBackpack(artifacts, direction))
        },
        {
          type: APP_COMMAND_HEROES_ARTIFACT_TAKE_REQUESTED,
          handler: ({ detail: { heroIds, side, place } }) =>
            exchange(heroIds, (artifacts) => takeArtifactFrom(artifacts, side, place))
        },
        {
          type: APP_COMMAND_HEROES_ARTIFACT_PUT_REQUESTED,
          handler: ({ detail: { heroIds, side, place } }) =>
            exchange(heroIds, (artifacts) => putHeldArtifactOn(artifacts, side, place, definitions))
        },
        {
          type: APP_COMMAND_HEROES_ARTIFACT_PUT_BACK_REQUESTED,
          handler: ({ detail: { heroIds } }) =>
            exchange(heroIds, (artifacts) => putBackHeldArtifacts(artifacts, definitions))
        },
        {
          type: APP_COMMAND_HEROES_BACKPACK_SCROLL_REQUESTED,
          handler: ({ detail: { heroIds, side, direction } }) =>
            exchange(heroIds, (artifacts) => scrollBackpackOf(artifacts, side, direction))
        },
        {
          type: APP_COMMAND_HEROES_ARTIFACTS_SEND_REQUESTED,
          handler: ({ detail: { heroIds, fromSide } }) =>
            exchange(heroIds, (artifacts) => sendAllArtifacts(artifacts, fromSide, definitions))
        },
        {
          type: APP_COMMAND_HEROES_ARTIFACTS_SWAP_REQUESTED,
          handler: ({ detail: { heroIds } }) => exchange(heroIds, swapAllArtifacts)
        }
      ]
    }
  },
  {
    id: 'hero-artifacts',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_HERO_ARTIFACT_TAKE_REQUESTED,
      APP_COMMAND_HERO_ARTIFACT_PUT_REQUESTED,
      APP_COMMAND_HERO_ARTIFACT_PUT_BACK_REQUESTED,
      APP_COMMAND_HERO_BACKPACK_SCROLL_REQUESTED,
      APP_COMMAND_HEROES_ARTIFACT_TAKE_REQUESTED,
      APP_COMMAND_HEROES_ARTIFACT_PUT_REQUESTED,
      APP_COMMAND_HEROES_ARTIFACT_PUT_BACK_REQUESTED,
      APP_COMMAND_HEROES_BACKPACK_SCROLL_REQUESTED,
      APP_COMMAND_HEROES_ARTIFACTS_SEND_REQUESTED,
      APP_COMMAND_HEROES_ARTIFACTS_SWAP_REQUESTED
    ],
    produces: [APP_FACT_HERO_ARTIFACTS_CHANGED]
  }
)
