import { isMine } from '../../../game/domain/entity-queries.js'
import { dailyIncomeOfMines } from '../../../game/heroes/mine-income.js'
import {
  APP_FACT_INCOME_COLLECTED,
  APP_FACT_INTERACTION_REACHED,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerMinesModule = defineModule(
  ({ emit }) => {
    let minesById = new Map()
    let definitions = {}
    let ownedMineIds = new Set()

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const entities = event.detail.scenario?.entities ?? []
            minesById = new Map(entities.filter(isMine).map((mine) => [mine.id, mine]))
            definitions = event.detail.definitions ?? {}
            ownedMineIds = new Set()
          }
        },
        {
          type: APP_FACT_INTERACTION_REACHED,
          handler: (event) => {
            const mine = minesById.get(event.detail.entityId)
            if (!mine || ownedMineIds.has(mine.id)) {
              return
            }

            emit(APP_FACT_MINE_CAPTURED, { entityId: mine.id, entityType: mine.type })
          }
        },
        {
          type: APP_FACT_MINE_CAPTURED,
          handler: (event) => {
            if (minesById.has(event.detail.entityId)) {
              ownedMineIds.add(event.detail.entityId)
            }
          }
        },
        {
          // Income follows from the persisted captures and turn ends, so it is not logged itself:
          // replaying the log pays it again in the same order.
          type: APP_FACT_TURN_ENDED,
          handler: () => {
            const mines = [...ownedMineIds].map((mineId) => minesById.get(mineId))
            const income = dailyIncomeOfMines({ mines, definitions })
            if (Object.keys(income).length === 0) {
              return
            }

            emit(APP_FACT_INCOME_COLLECTED, { income }, { log: false })
          }
        }
      ]
    }
  },
  {
    id: 'mines',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_INTERACTION_REACHED,
      APP_FACT_MINE_CAPTURED,
      APP_FACT_TURN_ENDED
    ],
    produces: [APP_FACT_MINE_CAPTURED, APP_FACT_INCOME_COLLECTED]
  }
)
