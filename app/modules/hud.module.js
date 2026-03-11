import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_COMMAND_RESET_SESSION_REQUESTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerHudModule = defineModule(({ on, onDom, emit, env }) => {
  const uiLayer = env.document?.querySelector('.ui-layer');
  const movementPointsStatus = env.document?.getElementById('movement-points-status');
  const resourceTotalsStatus = env.document?.getElementById('resource-totals-status');
  const endTurnButton = env.document?.getElementById('end-turn-button');
  const resetSessionButton = env.document?.getElementById('reset-session-button');
  const musicToggleButton = env.document?.getElementById('music-toggle-button');
  const bootStatus = env.document?.getElementById('boot-status');
  let resourceTypeOrder = [];
  let resourceNamesByType = {};
  let resourceTotalsByType = {};

  function renderResourceTotals() {
    if (!resourceTotalsStatus) {
      return;
    }

    if (resourceTypeOrder.length === 0) {
      resourceTotalsStatus.textContent = 'Resources: none';
      return;
    }

    const parts = resourceTypeOrder.map(
      (resourceType) =>
        `${resourceNamesByType[resourceType] ?? resourceType}: ${resourceTotalsByType[resourceType] ?? 0}`
    );
    resourceTotalsStatus.textContent = `Resources: ${parts.join(' | ')}`;
  }

  onDom(endTurnButton, 'click', (event) => {
    event?.stopPropagation?.();
    emit(APP_COMMAND_END_TURN_REQUESTED, {});
  });

  onDom(musicToggleButton, 'click', (event) => {
    event?.stopPropagation?.();
    emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {});
  });

  onDom(resetSessionButton, 'click', (event) => {
    event?.stopPropagation?.();
    emit(APP_COMMAND_RESET_SESSION_REQUESTED, {});
  });

  onDom(uiLayer, 'click', (event) => {
    event?.stopPropagation?.();
  });

  on(APP_FACT_MOVEMENT_POINTS_CHANGED, (event) => {
    if (!movementPointsStatus) {
      return;
    }

    const { value, max } = event.detail;
    movementPointsStatus.textContent = `MP: ${value} / ${max}`;
  });

  on(APP_UI_MUSIC_STATE_CHANGED, (event) => {
    if (!musicToggleButton) {
      return;
    }

    const enabled = Boolean(event.detail.enabled);
    musicToggleButton.textContent = enabled ? 'Music: On' : 'Music: Off';
    musicToggleButton.setAttribute?.('aria-pressed', enabled ? 'true' : 'false');
  });

  on(APP_FACT_WORLD_READY, (event) => {
    const definitions = event.detail.definitions?.resources ?? {};
    resourceTypeOrder = Object.keys(definitions);
    resourceNamesByType = {};
    resourceTotalsByType = {};

    for (const resourceType of resourceTypeOrder) {
      resourceNamesByType[resourceType] = definitions[resourceType]?.name ?? resourceType;
      resourceTotalsByType[resourceType] = 0;
    }

    renderResourceTotals();

    if (!bootStatus) {
      return;
    }

    bootStatus.textContent = `Boot ok: ${event.detail.scenario.meta.id}`;
  });

  on(APP_FACT_RESOURCE_COLLECTED, (event) => {
    const resourceType = event.detail.entityType;
    if (!resourceType) {
      return;
    }

    if (!resourceTypeOrder.includes(resourceType)) {
      resourceTypeOrder.push(resourceType);
    }

    if (!(resourceType in resourceNamesByType)) {
      resourceNamesByType[resourceType] = resourceType;
    }

    const amount = Number(event.detail.amount);
    const collectedAmount = Number.isFinite(amount) ? amount : 0;
    resourceTotalsByType[resourceType] = (resourceTotalsByType[resourceType] ?? 0) + collectedAmount;
    renderResourceTotals();
  });
});
