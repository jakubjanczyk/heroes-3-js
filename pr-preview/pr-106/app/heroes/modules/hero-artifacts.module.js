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
import {
  assembleCombination,
  combinationQuestionAt,
  combinationToAssemble,
  disassembleCombination
} from '../../../game/heroes/combination-artifacts.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { selectedHeroIdOf, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_HERO_ARTIFACT_COMBINATION_REQUESTED,
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
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_HERO_ARTIFACTS_CHANGED,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CONFIRMED,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const SIDES = ['left', 'right']
const COMBINATION_SUBJECT = 'hero.artifactCombination'

const QUESTIONS = Object.freeze({
  assemble: (name) =>
    `You possess all of the components needed to assemble the ${name}.  Do you wish to assemble this artifact?`,
  disassemble: () => 'Do you wish to disassemble this artifact?'
})

export const registerHeroArtifactsModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}
    let isRestoring = false

    const selectedHeroId = () => selectedHeroIdOf(state.get(), viewingPlayer(state.get()))

    function rearrange(rearrangeArtifacts, heroId = selectedHeroId()) {
      const hero = heroById(state.get(), heroId)
      const artifacts = hero && rearrangeArtifacts(hero.artifacts)
      if (artifacts) {
        emit(APP_FACT_HERO_ARTIFACTS_CHANGED, { heroId, artifacts })
      }
      return Boolean(artifacts)
    }

    // The question names the combination to assemble, or the place of the one to take apart.
    function ask(heroId, question) {
      const artifact = definitions?.artifacts?.[question.artifact] ?? {}
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: artifact.description ?? '',
        details: [QUESTIONS[question.action](artifact.name)],
        rewards: [{ label: artifact.name, caption: [artifact.name] }],
        isQuestion: true,
        subject: { kind: COMBINATION_SUBJECT, heroId, question }
      })
    }

    // Asked when an artifact goes on a worn slot and with it every part of a combination is worn.
    function offerToAssemble(heroId, artifactId) {
      const artifacts = heroById(state.get(), heroId)?.artifacts
      const combination = artifacts && combinationToAssemble(artifacts, artifactId, definitions)
      if (!isRestoring && combination) {
        ask(heroId, { action: 'assemble', artifact: combination })
      }
    }

    function offerAfterPickUp({ heroId, artifact }) {
      const backpack = heroById(state.get(), heroId)?.artifacts?.backpack ?? []
      if (artifact && backpack.at(-1) !== artifact) {
        offerToAssemble(heroId, artifact)
      }
    }

    function putOnSelectedHero(place) {
      const heroId = selectedHeroId()
      const held = heroById(state.get(), heroId)?.artifacts?.held
      const isPut = rearrange((artifacts) => putHeldArtifact(artifacts, place, definitions), heroId)
      if (isPut && place.slot) {
        offerToAssemble(heroId, held)
      }
    }

    function answer({ heroId, question }) {
      rearrange(
        (artifacts) =>
          question.action === 'assemble'
            ? assembleCombination(artifacts, question.artifact, definitions)
            : disassembleCombination(artifacts, question.place, definitions),
        heroId
      )
    }

    function askAbout({ heroId, place }) {
      const artifacts = heroById(state.get(), heroId)?.artifacts
      const question = combinationQuestionAt(artifacts, place, definitions)
      if (question) {
        ask(heroId, { ...question, place })
      }
    }

    function exchange(heroIds, exchangeArtifacts) {
      const heroes = SIDES.map((side) => heroById(state.get(), heroIds?.[side]))
      if (heroes.some((hero) => !hero) || heroes[0].id === heroes[1].id) {
        return false
      }

      const artifacts = { left: heroes[0].artifacts, right: heroes[1].artifacts }
      const changed = exchangeArtifacts(artifacts)
      if (!changed) {
        return false
      }
      SIDES.forEach((side, index) => {
        if (changed[side] !== artifacts[side]) {
          emit(APP_FACT_HERO_ARTIFACTS_CHANGED, {
            heroId: heroes[index].id,
            artifacts: changed[side]
          })
        }
      })
      return true
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
          handler: ({ detail: { place } }) => putOnSelectedHero(place)
        },
        {
          type: APP_COMMAND_HERO_ARTIFACT_COMBINATION_REQUESTED,
          handler: ({ detail }) => askAbout(detail)
        },
        {
          type: APP_FACT_ARTIFACT_PICKED_UP,
          handler: ({ detail }) => offerAfterPickUp(detail)
        },
        {
          type: APP_FACT_TREASURE_CHEST_OPENED,
          handler: ({ detail }) => offerAfterPickUp(detail)
        },
        {
          type: APP_UI_INTERACTION_MODAL_CONFIRMED,
          handler: ({ detail: { choice, subject } }) => {
            if (subject?.kind === COMBINATION_SUBJECT && choice === 'yes') {
              answer(subject)
            }
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        { type: APP_UI_RESTORE_COMPLETED, handler: () => (isRestoring = false) },
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
          handler: ({ detail: { heroIds, side, place } }) => {
            const held = SIDES.map((each) => heroById(state.get(), heroIds?.[each]))
              .map((hero) => hero?.artifacts?.held)
              .find(Boolean)
            const isPut = exchange(heroIds, (artifacts) =>
              putHeldArtifactOn(artifacts, side, place, definitions)
            )
            if (isPut && place.slot) {
              offerToAssemble(heroIds[side], held)
            }
          }
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
      APP_FACT_ARTIFACT_PICKED_UP,
      APP_FACT_TREASURE_CHEST_OPENED,
      APP_UI_INTERACTION_MODAL_CONFIRMED,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_COMMAND_HERO_ARTIFACT_COMBINATION_REQUESTED,
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
    produces: [APP_FACT_HERO_ARTIFACTS_CHANGED, APP_UI_NOTICE_OPENED]
  }
)
