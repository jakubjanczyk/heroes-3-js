import {
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';
import {
  createInteractionModalElement,
  INTERACTION_MODAL_CLOSED_EVENT,
} from '../ui/interaction-modal.element.js';

export function registerInteractionModalModule({ bus, env, config }) {
  const viewport = env.document?.querySelector('.viewport');
  const modalTransitionMs = config?.interactionModalTransitionMs ?? 260;
  let activeModal = null;

  function openModal(payload) {
    if (!viewport || !env.document) {
      return;
    }

    if (activeModal) {
      bus.emit(APP_UI_INTERACTION_MODAL_CLOSED, {});
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
        bus.emit(APP_UI_INTERACTION_MODAL_CLOSED, {});
      },
      { once: true }
    );

    viewport.appendChild(modalElement);
    modalElement.showInteraction?.(payload);
    activeModal = modalElement;
  }

  bus.addEventListener(APP_UI_INTERACTION_MODAL_OPENED, (event) => {
    openModal(event.detail);
  });
}
