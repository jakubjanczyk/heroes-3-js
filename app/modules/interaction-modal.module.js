import {
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';
import {
  ensureInteractionModalElement,
  INTERACTION_MODAL_CLOSED_EVENT,
  INTERACTION_MODAL_TAG_NAME
} from '../ui/interaction-modal.element.js';

export function registerInteractionModalModule({ bus, env, config }) {
  const viewport = env.document?.querySelector('.viewport');
  const modalTransitionMs = config?.interactionModalTransitionMs ?? 260;
  let activeModal = null;

  function openModal(payload) {
    if (!viewport || !env.document) {
      return;
    }

    if (!ensureInteractionModalElement(env.window)) {
      return;
    }

    if (activeModal) {
      activeModal.remove();
      activeModal = null;
    }

    const modalElement = env.document.createElement(INTERACTION_MODAL_TAG_NAME);
    modalElement.transitionMs = modalTransitionMs;
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
    modalElement.open?.(payload);
    activeModal = modalElement;
  }

  bus.addEventListener(APP_UI_INTERACTION_MODAL_OPENED, (event) => {
    openModal(event.detail);
  });
}
