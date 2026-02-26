export const INTERACTION_MODAL_TAG_NAME = 'interaction-modal';
const INTERACTION_MODAL_CLOSED_EVENT = 'interaction-modal-closed';

function createTemplate(document) {
  const template = document.createElement('template');
  template.innerHTML = `
    <div class="interaction-modal__dialog" role="dialog" aria-modal="true">
      <h3 class="interaction-modal__title">Interaction</h3>
      <p class="interaction-modal__message"></p>
      <div class="interaction-modal__actions">
        <button class="interaction-modal__ok-button" type="button">OK</button>
      </div>
    </div>
  `;
  return template;
}

function defineInteractionModalClass(windowLike) {
  const BaseElement = windowLike.HTMLElement;

  return class InteractionModalElement extends BaseElement {
    constructor() {
      super();
      this.transitionMs = 260;
      this._closeTimer = null;
      this._isOpen = false;
      this._isInitialized = false;

      this._onRootClick = (event) => {
        event.stopPropagation();
      };
      this._onDialogClick = (event) => {
        event.stopPropagation();
      };
      this._onOkButtonClick = (event) => {
        event.stopPropagation();
        this.close();
      };
      this._onWindowKeyDown = (event) => {
        if (event.key !== 'Escape' || !this._isOpen) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.close();
      };
    }

    connectedCallback() {
      this._ensureInitialized();
      this.className = 'interaction-modal';
      this.ownerDocument.defaultView?.addEventListener('keydown', this._onWindowKeyDown);
    }

    disconnectedCallback() {
      this.ownerDocument.defaultView?.removeEventListener('keydown', this._onWindowKeyDown);
      this._clearCloseTimer();
    }

    open({ title = 'Interaction', message = '' } = {}) {
      this._ensureInitialized();

      this._isOpen = true;
      this._clearCloseTimer();

      this.className = 'interaction-modal';
      if (this._titleEl) {
        this._titleEl.textContent = title;
      }
      if (this._messageEl) {
        this._messageEl.textContent = message;
      }

      if (this.transitionMs <= 0) {
        this.className = 'interaction-modal interaction-modal--visible';
        return;
      }

      const schedule =
        this.ownerDocument.defaultView?.requestAnimationFrame ?? ((handler) => setTimeout(handler, 0));
      schedule(() => {
        if (!this._isOpen || !this.isConnected) {
          return;
        }

        this.className = 'interaction-modal interaction-modal--visible';
      });
    }

    close() {
      if (!this._isOpen) {
        return;
      }

      this._isOpen = false;
      this._clearCloseTimer();

      if (this.transitionMs <= 0) {
        this._finalizeClose();
        return;
      }

      this.className = 'interaction-modal';
      this._closeTimer = setTimeout(() => {
        this._closeTimer = null;
        this._finalizeClose();
      }, this.transitionMs);
    }

    _ensureInitialized() {
      if (this._isInitialized) {
        return;
      }

      const template = createTemplate(this.ownerDocument);
      const content = this.ownerDocument.importNode(template.content, true);
      this.replaceChildren(content);

      this._titleEl = this.querySelector('.interaction-modal__title');
      this._messageEl = this.querySelector('.interaction-modal__message');
      this._dialogEl = this.querySelector('.interaction-modal__dialog');
      this._okButtonEl = this.querySelector('.interaction-modal__ok-button');

      this.addEventListener('click', this._onRootClick);
      this._dialogEl?.addEventListener('click', this._onDialogClick);
      this._okButtonEl?.addEventListener('click', this._onOkButtonClick);

      this._isInitialized = true;
    }

    _clearCloseTimer() {
      if (this._closeTimer === null) {
        return;
      }

      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }

    _finalizeClose() {
      this.dispatchEvent(
        new this.ownerDocument.defaultView.CustomEvent(INTERACTION_MODAL_CLOSED_EVENT, {
          bubbles: true
        })
      );
      this.remove();
    }
  };
}

export function ensureInteractionModalElement(windowLike) {
  const registry = windowLike?.customElements;
  if (!registry) {
    return false;
  }

  if (!registry.get(INTERACTION_MODAL_TAG_NAME)) {
    const InteractionModalElement = defineInteractionModalClass(windowLike);
    registry.define(INTERACTION_MODAL_TAG_NAME, InteractionModalElement);
  }

  return true;
}

export { INTERACTION_MODAL_CLOSED_EVENT };
