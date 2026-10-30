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
  APP_FACT_HERO_ARTIFACTS_CHANGED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

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
      APP_COMMAND_HERO_BACKPACK_SCROLL_REQUESTED
    ],
    produces: [APP_FACT_HERO_ARTIFACTS_CHANGED]
  }
)
