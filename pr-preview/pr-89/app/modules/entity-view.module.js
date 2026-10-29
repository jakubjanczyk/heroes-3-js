import { setStyleVar } from '../../engine/layers/dom-layer-utils.js'
import { renderEntityLayer } from '../../engine/layers/entity-layer.js'
import { getMapCenteredOrigin, getTileCenter } from '../../engine/layers/layout.js'
import { heroEntity, isRemoved } from '../../game/state/queries.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_HIRED,
  APP_FACT_HERO_MOVED,
  APP_FACT_WORLD_READY,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerEntityViewModule = defineModule(
  ({ env, config, state }) => {
    const presentation = config?.content?.entityPresentation
    const getEntityStyle = presentation?.getEntityStyle ?? (() => null)
    const entityLayer = env.document?.querySelector('.entity-layer')
    const createElement = env.document?.createElement?.bind(env.document)
    const configuredStepDurationMs = Number(config?.movementStepDelayMs ?? 220)
    const heroStepDurationMs = Number.isFinite(configuredStepDurationMs)
      ? Math.max(0, configuredStepDurationMs)
      : 220
    const fadeOutTimers = new Set()

    let map = null
    let definitions = {}
    let scenarioEntities = null
    let isRestoring = false

    function applyHeroRestoreMotionOverride() {
      if (!entityLayer || !isRestoring) {
        return
      }

      const heroEntities = entityLayer.querySelectorAll?.('.entity--hero') ?? []
      heroEntities.forEach((heroEntity) => {
        heroEntity.style.transition = 'none'
      })
    }

    function updateHeroPosition({ heroId, tile }) {
      if (!entityLayer || !map || !tile) {
        return false
      }

      const heroElement = entityLayer.querySelector?.(`.entity--hero[data-entity-id="${heroId}"]`)
      if (!heroElement) {
        return false
      }

      const origin = getMapCenteredOrigin()
      const center = getTileCenter({
        map,
        tile,
        origin
      })

      heroElement.dataset.tileX = String(tile.x)
      heroElement.dataset.tileY = String(tile.y)
      if (isRestoring) {
        heroElement.style.transition = 'none'
      }
      const hero = heroEntity(state.get(), heroId)
      const heroStyle = hero ? getEntityStyle({ entity: hero, map }) : null
      const offsetX = Number(heroStyle?.offsetX)
      const offsetY = Number(heroStyle?.offsetY)
      const resolvedOffsetX = Number.isFinite(offsetX) ? offsetX : -12
      const resolvedOffsetY = Number.isFinite(offsetY) ? offsetY : -12

      heroElement.style.transform = `translate(${center.x + resolvedOffsetX}px, ${center.y + resolvedOffsetY}px)`
      return true
    }

    // Heroes stand where the state has them, and those who came onto the map during play too.
    function entitiesOnMap() {
      const current = state.get()
      const scenarioIds = new Set(scenarioEntities.map((entity) => entity.id))
      const heroesAdded = Object.keys(current.heroes)
        .filter((heroId) => !scenarioIds.has(heroId))
        .map((heroId) => heroEntity(current, heroId))
      return [...scenarioEntities, ...heroesAdded]
        .filter((entity) => !isRemoved(current, entity.id))
        .map((entity) =>
          current.heroes[entity.id] ? { ...entity, tile: current.heroes[entity.id].tile } : entity
        )
    }

    function render() {
      if (!entityLayer || !map || !scenarioEntities) {
        return
      }

      renderEntityLayer({
        container: entityLayer,
        map,
        entities: entitiesOnMap(),
        createElement,
        getEntityStyle: (args) => getEntityStyle({ ...args, definitions })
      })
      applyHeroRestoreMotionOverride()
    }

    function removeEntityElement(entityId) {
      if (!entityLayer || typeof entityId !== 'string' || entityId.length === 0) {
        return
      }

      const el = entityLayer.querySelector?.(`[data-entity-id="${entityId}"]`)
      if (!el) {
        return
      }

      const entityKind = scenarioEntities?.find((entity) => entity.id === entityId)?.kind
      const fadeOutSpec = presentation?.getFadeOutSpec?.({ entityKind }) ?? null
      const durationMs = Number(
        config?.fadeOutMsByKind?.[entityKind] ?? fadeOutSpec?.durationMs ?? 0
      )
      if (isRestoring || !fadeOutSpec || durationMs <= 0) {
        el.remove()
        return
      }

      el.classList.add(fadeOutSpec.className)
      const timer = setTimeout(() => {
        fadeOutTimers.delete(timer)
        el.remove()
      }, durationMs)
      fadeOutTimers.add(timer)
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            map = event.detail.map
            definitions = event.detail.definitions ?? {}
            scenarioEntities = event.detail.scenario.entities
            setStyleVar(entityLayer, '--hero-step-duration', `${heroStepDurationMs}ms`)
            render()
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            const heroId = event.detail?.heroId
            const toTile = event.detail?.to
            if (updateHeroPosition({ heroId, tile: toTile })) {
              return
            }

            render()
            updateHeroPosition({ heroId, tile: toTile })
          }
        },
        { type: APP_FACT_HERO_HIRED, handler: render },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            removeEntityElement(event.detail?.entityId)
          }
        },
        {
          type: APP_UI_RESTORE_STARTED,
          handler: () => {
            isRestoring = true
            applyHeroRestoreMotionOverride()
          }
        },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            isRestoring = false
            if (!entityLayer) {
              return
            }

            const heroEntities = entityLayer.querySelectorAll?.('.entity--hero') ?? []
            heroEntities.forEach((heroEntity) => {
              heroEntity.style.transition = ''
            })
          }
        }
      ],
      dispose: () => {
        for (const timer of fadeOutTimers) {
          clearTimeout(timer)
        }
        fadeOutTimers.clear()
      }
    }
  },
  {
    id: 'entity-view',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_HERO_HIRED,
      APP_FACT_ENTITY_REMOVED,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED
    ],
    produces: []
  }
)
