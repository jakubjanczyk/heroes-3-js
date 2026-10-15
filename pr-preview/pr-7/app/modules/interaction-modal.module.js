import {
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';
import {
  createInteractionModalElement,
  INTERACTION_MODAL_CLOSED_EVENT,
} from '../ui/interaction-modal.element.js';
import { defineModule } from './shared/module-runtime.js';

export const registerInteractionModalModule = defineModule(({ emit, env, config }) => {
  const viewport = env.document?.querySelector('.viewport');
  const modalTransitionMs = config?.interactionModalTransitionMs ?? 260;
  let activeModal = null;

  function openModal(payload) {
    if (!viewport || !env.document) {
      return;
    }

    if (activeModal) {
      emit(APP_UI_INTERACTION_MODAL_CLOSED, {});
      activeModal.remove();
      activeModal = null;
    }

    const modalElement = createInteractionModalElement({
      document: env.document,
      transitionMs: modalTransitionMs
    });
    if (!modalElement) {
      return;
    }

    modalElement.addEventListener(
      INTERACTION_MODAL_CLOSED_EVENT,
      () => {
        if (activeModal === modalElement) {
          activeModal = null;
        }
        emit(APP_UI_INTERACTION_MODAL_CLOSED, {});
      },
      { once: true }
    );

    viewport.appendChild(modalElement);
    modalElement.showInteraction?.(payload);
    activeModal = modalElement;
  }

  return {
    subscriptions: [
      {
        type: APP_UI_INTERACTION_MODAL_OPENED,
        handler: (event) => {
          openModal(event.detail);
        }
      }
    ]
  };
}, {
  id: 'interaction-modal',
  phase: 'view',
  consumes: [
    APP_UI_INTERACTION_MODAL_OPENED
  ],
  produces: [
    APP_UI_INTERACTION_MODAL_CLOSED
  ]
});
