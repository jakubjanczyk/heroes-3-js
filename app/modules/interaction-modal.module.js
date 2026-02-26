import {
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';

export function registerInteractionModalModule({ bus, env, config }) {
  const viewport = env.document?.querySelector('.viewport');
  const createElement = env.document?.createElement?.bind(env.document);
  const modalTransitionMs = config?.interactionModalTransitionMs ?? 180;

  let modalRoot = null;
  let escapeKeyHandler = null;
  let closeTimerId = null;

  function setModalVisibility(root, isVisible) {
    if (!root) {
      return;
    }

    root.className = isVisible ? 'interaction-modal interaction-modal--visible' : 'interaction-modal';
  }

  function clearCloseTimer() {
    if (closeTimerId === null) {
      return;
    }

    clearTimeout(closeTimerId);
    closeTimerId = null;
  }

  function removeModalNow({ emitClosed = true } = {}) {
    if (!modalRoot) {
      return;
    }

    const root = modalRoot;

    if (typeof root.remove === 'function') {
      root.remove();
    } else {
      viewport?.removeChild?.(root);
    }
    modalRoot = null;

    if (escapeKeyHandler) {
      env.window?.removeEventListener?.('keydown', escapeKeyHandler);
      escapeKeyHandler = null;
    }

    if (emitClosed) {
      bus.emit(APP_UI_INTERACTION_MODAL_CLOSED, {});
    }
  }

  function closeModal({ emitClosed = true } = {}) {
    if (!modalRoot) {
      return;
    }

    clearCloseTimer();

    if (modalTransitionMs <= 0) {
      removeModalNow({ emitClosed });
      return;
    }

    setModalVisibility(modalRoot, false);
    closeTimerId = setTimeout(() => {
      closeTimerId = null;
      removeModalNow({ emitClosed });
    }, modalTransitionMs);
  }

  function stopEvent(event) {
    event?.stopPropagation?.();
  }

  function openModal({ title, message }) {
    if (!viewport || !createElement) {
      return;
    }

    clearCloseTimer();
    removeModalNow({ emitClosed: false });

    const root = createElement('div');
    root.className = 'interaction-modal';

    const dialog = createElement('div');
    dialog.className = 'interaction-modal__dialog';
    dialog.setAttribute?.('role', 'dialog');
    dialog.setAttribute?.('aria-modal', 'true');

    const titleEl = createElement('h3');
    titleEl.className = 'interaction-modal__title';
    titleEl.textContent = title ?? 'Interaction';

    const messageEl = createElement('p');
    messageEl.className = 'interaction-modal__message';
    messageEl.textContent = message ?? '';

    const actions = createElement('div');
    actions.className = 'interaction-modal__actions';

    const okButton = createElement('button');
    okButton.className = 'interaction-modal__ok-button';
    okButton.type = 'button';
    okButton.textContent = 'OK';
    okButton.addEventListener?.('click', (event) => {
      stopEvent(event);
      closeModal();
    });

    actions.appendChild(okButton);
    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    dialog.appendChild(actions);
    root.appendChild(dialog);

    root.addEventListener?.('click', stopEvent);
    dialog.addEventListener?.('click', stopEvent);

    viewport.appendChild(root);
    modalRoot = root;

    if (modalTransitionMs <= 0) {
      setModalVisibility(root, true);
    } else {
      const schedule = env.window?.requestAnimationFrame ?? ((handler) => setTimeout(handler, 0));
      schedule(() => {
        if (modalRoot !== root) {
          return;
        }
        setModalVisibility(root, true);
      });
    }

    if (!escapeKeyHandler) {
      escapeKeyHandler = (event) => {
        if (event.key !== 'Escape' || !modalRoot) {
          return;
        }

        event.preventDefault?.();
        stopEvent(event);
        closeModal();
      };
      env.window?.addEventListener?.('keydown', escapeKeyHandler);
    }
  }

  bus.addEventListener(APP_UI_INTERACTION_MODAL_OPENED, (event) => {
    openModal(event.detail);
  });
}
