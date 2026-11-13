import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { dailyIncomeOfPlayer, resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { builtIn, tavernCountOf, townIdsOf, townOwner } from '../../../game/heroes/state/towns.js'
import { thievesGuildReport } from '../../../game/heroes/thieves-guild.js'
import { heroIdsOf, playerColors, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_THIEVES_GUILD_OPEN_REQUESTED,
  APP_FACT_WORLD_READY,
  APP_UI_THIEVES_GUILD_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerThievesGuildModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}

    function heroOf(current, heroId) {
      const hero = heroById(current, heroId)
      return {
        name: hero.name,
        level: hero.level,
        experience: hero.experience,
        skills: getHeroPrimarySkills({ entity: hero, definitions }).map(({ name, value }) => ({
          name,
          value
        })),
        army: hero.army,
        artifacts: hero.artifacts
      }
    }

    function kingdomOf(current, player) {
      return {
        player,
        isHuman: player === viewingPlayer(current),
        towns: townIdsOf(current, player).length,
        heroes: heroIdsOf(current, player).map((heroId) => heroOf(current, heroId)),
        resources: resourcesOf(current, player),
        income: dailyIncomeOfPlayer(current, player, definitions).GOLD_PILE ?? 0
      }
    }

    function open(townId) {
      const current = state.get()
      const player = townOwner(current, townId)
      if (player !== viewingPlayer(current) || !builtIn(current, townId).has('TAVERN')) {
        return
      }
      emit(
        APP_UI_THIEVES_GUILD_UPDATED,
        thievesGuildReport({
          kingdoms: playerColors(current).map((color) => kingdomOf(current, color)),
          taverns: tavernCountOf(current, player),
          monsters: definitions.monsters
        })
      )
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
          }
        },
        {
          type: APP_COMMAND_THIEVES_GUILD_OPEN_REQUESTED,
          handler: (event) => open(event.detail.entityId)
        }
      ]
    }
  },
  {
    id: 'thieves-guild',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_THIEVES_GUILD_OPEN_REQUESTED],
    produces: [APP_UI_THIEVES_GUILD_UPDATED]
  }
)
