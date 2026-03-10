import { setStyleVar } from '../../engine/layers/dom-layer-utils.js';

export const INTERACTION_MODAL_CLOSED_EVENT = 'interaction-modal-closed';

const INTERACTION_MODAL_TAG = 'interaction-modal';

function showDialog(dialog) {
  if (typeof dialog?.showModal === 'function') {
    try {
      dialog.showModal();
      return;
    } catch {}
  }

  dialog?.setAttribute?.('open', '');
}

function closeDialog(dialog) {
  if (typeof dialog?.close === 'function') {
    try {
      dialog.close();
      return;
    } catch {}
  }

  dialog?.removeAttribute?.('open');
}

function clampTransitionMs(value) {
  return Math.max(0, Number(value) || 0);
}

function ensureModalContent(host) {
  if (host._dialog) {
    return;
  }

  host.innerHTML = `
    <dialog class="interaction-modal" closedby="none">
      <article class="interaction-modal__surface">
        <h3 class="interaction-modal__title">Interaction</h3>
        <p class="interaction-modal__message"></p>
        <div class="interaction-modal__actions">
          <button class="interaction-modal__ok-button" type="button">OK</button>
        </div>
      </article>
    </dialog>
  `;

  host._dialog = host.querySelector('dialog.interaction-modal');
  host._titleEl = host.querySelector('.interaction-modal__title');
  host._messageEl = host.querySelector('.interaction-modal__message');
  host._surfaceEl = host.querySelector('.interaction-modal__surface');
  host._okButtonEl = host.querySelector('.interaction-modal__ok-button');

  host.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  host.addEventListener('cancel', (event) => {
    event.preventDefault();
  });

  host._dialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
  });

  host._dialog?.addEventListener('close', () => {
    if (host._isFinalizingClose || !host.isConnected) {
      return;
    }

    host._finalizeClose({ closeDialogElement: false });
  });

  host._dialog?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  host._dialog?.addEventListener('transitionend', (event) => {
    if (!host._isClosing) {
      return;
    }

    if (event.target !== host._dialog && event.target !== host._surfaceEl) {
      return;
    }

    host._finalizeClose();
  });

  host._okButtonEl?.addEventListener('click', (event) => {
    event.stopPropagation();
    host.closeInteraction();
  });
}

function applyTransitionMs(host) {
  setStyleVar(
    host._dialog,
    '--interaction-modal-transition-duration',
    `${host._transitionMs}ms`
  );
}

function configureModalHost(host, { transitionMs = 260 } = {}) {
  ensureModalContent(host);
  host._transitionMs = clampTransitionMs(transitionMs);
  applyTransitionMs(host);
}

function defineInteractionModalElement(window) {
  const customElementsRegistry = window?.customElements;
  const HTMLElementCtor = window?.HTMLElement;
  if (!customElementsRegistry || !HTMLElementCtor) {
    return null;
  }

  const existingCtor = customElementsRegistry.get(INTERACTION_MODAL_TAG);
  if (existingCtor) {
    return existingCtor;
  }

  class InteractionModalElement extends HTMLElementCtor {
    constructor() {
      super();
      this._closeTimer = null;
      this._dialog = null;
      this._titleEl = null;
      this._messageEl = null;
      this._surfaceEl = null;
      this._okButtonEl = null;
      this._isClosing = false;
      this._isFinalizingClose = false;
      this._transitionMs = 260;
    }

    connectedCallback() {
      configureModalHost(this, { transitionMs: this._transitionMs });
    }

    disconnectedCallback() {
      this._clearCloseTimer();
    }

    initialize({ transitionMs = 260 } = {}) {
      configureModalHost(this, { transitionMs });
    }

    _clearCloseTimer() {
      if (this._closeTimer === null) {
        return;
      }

      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }

    _finalizeClose({ closeDialogElement = true } = {}) {
      if (this._isFinalizingClose) {
        return;
      }

      this._isFinalizingClose = true;

      try {
        this._clearCloseTimer();
        this._isClosing = false;
        this.dataset.state = 'closed';
        if (this._dialog) {
          this._dialog.dataset.state = 'closed';
        }
        if (closeDialogElement) {
          closeDialog(this._dialog);
        }
        this.dispatchEvent(
          new this.ownerDocument.defaultView.CustomEvent(INTERACTION_MODAL_CLOSED_EVENT, {
            bubbles: true
          })
        );
        this.remove();
      } finally {
        this._isFinalizingClose = false;
      }
    }

    closeInteraction() {
      if (!this._dialog?.hasAttribute('open') || this._isClosing) {
        return;
      }

      if (this._transitionMs <= 0) {
        this._finalizeClose();
        return;
      }

      this._isClosing = true;
      this.dataset.state = 'closing';
      this._dialog.dataset.state = 'closing';
      this._closeTimer = setTimeout(() => {
        this._finalizeClose();
      }, this._transitionMs);
    }

    showInteraction({ title = 'Interaction', message = '' } = {}) {
      configureModalHost(this, { transitionMs: this._transitionMs });
      this._clearCloseTimer();
      this._isClosing = false;
      this.dataset.state = 'open';
      this._dialog.dataset.state = 'open';

      if (this._titleEl) {
        this._titleEl.textContent = title;
      }

      if (this._messageEl) {
        this._messageEl.textContent = message;
      }

      showDialog(this._dialog);
    }
  }

  customElementsRegistry.define(INTERACTION_MODAL_TAG, InteractionModalElement);
  return InteractionModalElement;
}

export function createInteractionModalElement({ document, transitionMs = 260 } = {}) {
  const window = document?.defaultView ?? globalThis.window;
  const InteractionModalElement = defineInteractionModalElement(window);
  const modal = document?.createElement?.(INTERACTION_MODAL_TAG);
  if (!modal) {
    return null;
  }

  if (typeof modal.initialize === 'function') {
    modal.initialize({ transitionMs });
    return modal;
  }

  configureModalHost(modal, { transitionMs });
  return modal;
}
