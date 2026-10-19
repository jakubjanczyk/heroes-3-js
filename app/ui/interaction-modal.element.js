import { setStyleVar } from '../../engine/layers/dom-layer-utils.js'

export const INTERACTION_MODAL_CLOSED_EVENT = 'interaction-modal-closed'

const INTERACTION_MODAL_TAG = 'interaction-modal'

let nextTitleId = 1

function showDialog(dialog) {
  if (typeof dialog?.showModal === 'function') {
    try {
      dialog.showModal()
      return
    } catch {}
  }

  dialog?.setAttribute?.('open', '')
}

function closeDialog(dialog) {
  if (typeof dialog?.close === 'function') {
    try {
      dialog.close()
      return
    } catch {}
  }

  dialog?.removeAttribute?.('open')
}

function clampTransitionMs(value) {
  return Math.max(0, Number(value) || 0)
}

function ensureModalContent(host) {
  if (host._dialog) {
    return
  }

  const titleId = `interaction-modal-title-${nextTitleId++}`
  host.innerHTML = `
    <dialog class="interaction-modal" closedby="none" aria-labelledby="${titleId}">
      <article class="interaction-modal__surface message-box">
        <h3 class="interaction-modal__title" id="${titleId}">Interaction</h3>
        <p class="interaction-modal__message"></p>
        <div class="interaction-modal__details"></div>
        <div class="interaction-modal__choices"></div>
        <div class="interaction-modal__actions">
          <button class="interaction-modal__ok-button" type="button" aria-label="OK"></button>
        </div>
      </article>
    </dialog>
  `

  host._dialog = host.querySelector('dialog.interaction-modal')
  host._titleEl = host.querySelector('.interaction-modal__title')
  host._messageEl = host.querySelector('.interaction-modal__message')
  host._detailsEl = host.querySelector('.interaction-modal__details')
  host._choicesEl = host.querySelector('.interaction-modal__choices')
  host._surfaceEl = host.querySelector('.interaction-modal__surface')
  host._okButtonEl = host.querySelector('.interaction-modal__ok-button')

  host.addEventListener('click', (event) => {
    event.stopPropagation()
  })

  host.addEventListener('cancel', (event) => {
    event.preventDefault()
  })

  host._dialog?.addEventListener('cancel', (event) => {
    event.preventDefault()
  })

  host._dialog?.addEventListener('close', () => {
    if (host._isFinalizingClose || !host.isConnected) {
      return
    }

    host._finalizeClose({ closeDialogElement: false })
  })

  host._dialog?.addEventListener('click', (event) => {
    event.stopPropagation()
  })

  host._dialog?.addEventListener('transitionend', (event) => {
    if (!host._isClosing) {
      return
    }

    if (event.target !== host._dialog && event.target !== host._surfaceEl) {
      return
    }

    host._finalizeClose()
  })

  host._okButtonEl?.addEventListener('click', (event) => {
    event.stopPropagation()
    host.closeInteraction()
  })
}

// Extra lines under the message, e.g. what a level-up gave ('+1 Defense').
function renderDetails(host, details) {
  const document = host.ownerDocument
  host._detailsEl.replaceChildren(
    ...details.map((detail) => {
      const line = document.createElement('p')
      line.className = 'interaction-modal__detail'
      line.textContent = detail
      return line
    })
  )
}

// Rewards to pick from, as in Heroes 3: a picture each with the amount under it and "or" between
// them; the picked one gets a gold frame. OK stays disabled until one is picked.
function renderChoices(host, choices) {
  const document = host.ownerDocument
  host._choice = null
  host._choicesEl.hidden = choices.length === 0
  host._okButtonEl.disabled = choices.length > 0

  const buttons = choices.map(({ id, amount, label, picture }) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'interaction-modal__choice'
    button.dataset.choice = id
    button.setAttribute('aria-label', label)
    button.setAttribute('aria-pressed', 'false')

    const icon = document.createElement('span')
    icon.className = 'interaction-modal__choice-picture'
    icon.setAttribute('aria-hidden', 'true')
    if (picture) {
      icon.style.backgroundImage = `url('${picture}')`
    }

    const amountLabel = document.createElement('span')
    amountLabel.className = 'interaction-modal__choice-amount'
    amountLabel.textContent = String(amount)

    button.append(icon, amountLabel)
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      host._choice = id
      host._okButtonEl.disabled = false
      for (const other of buttons) {
        other.setAttribute('aria-pressed', String(other === button))
      }
    })
    return button
  })

  host._choicesEl.replaceChildren(
    ...buttons.flatMap((button, index) => {
      if (index === 0) {
        return [button]
      }

      const or = document.createElement('span')
      or.className = 'interaction-modal__choice-or'
      or.textContent = 'or'
      return [or, button]
    })
  )
}

function applyTransitionMs(host) {
  setStyleVar(host._dialog, '--interaction-modal-transition-duration', `${host._transitionMs}ms`)
}

function configureModalHost(host, { transitionMs = 260 } = {}) {
  ensureModalContent(host)
  host._transitionMs = clampTransitionMs(transitionMs)
  applyTransitionMs(host)
}

function defineInteractionModalElement(window) {
  const customElementsRegistry = window?.customElements
  const HTMLElementCtor = window?.HTMLElement
  if (!customElementsRegistry || !HTMLElementCtor) {
    return null
  }

  const existingCtor = customElementsRegistry.get(INTERACTION_MODAL_TAG)
  if (existingCtor) {
    return existingCtor
  }

  class InteractionModalElement extends HTMLElementCtor {
    constructor() {
      super()
      this._closeTimer = null
      this._dialog = null
      this._titleEl = null
      this._messageEl = null
      this._detailsEl = null
      this._choicesEl = null
      this._choice = null
      this._surfaceEl = null
      this._okButtonEl = null
      this._isClosing = false
      this._isFinalizingClose = false
      this._transitionMs = 260
    }

    connectedCallback() {
      configureModalHost(this, { transitionMs: this._transitionMs })
    }

    disconnectedCallback() {
      this._clearCloseTimer()
    }

    initialize({ transitionMs = 260 } = {}) {
      configureModalHost(this, { transitionMs })
    }

    _clearCloseTimer() {
      if (this._closeTimer === null) {
        return
      }

      clearTimeout(this._closeTimer)
      this._closeTimer = null
    }

    _finalizeClose({ closeDialogElement = true } = {}) {
      if (this._isFinalizingClose) {
        return
      }

      this._isFinalizingClose = true

      try {
        this._clearCloseTimer()
        this._isClosing = false
        this.dataset.state = 'closed'
        if (this._dialog) {
          this._dialog.dataset.state = 'closed'
        }
        if (closeDialogElement) {
          closeDialog(this._dialog)
        }
        this.dispatchEvent(
          new this.ownerDocument.defaultView.CustomEvent(INTERACTION_MODAL_CLOSED_EVENT, {
            bubbles: true,
            detail: { choice: this._choice }
          })
        )
        this.remove()
      } finally {
        this._isFinalizingClose = false
      }
    }

    closeInteraction() {
      if (!this._dialog?.hasAttribute('open') || this._isClosing) {
        return
      }

      if (this._transitionMs <= 0) {
        this._finalizeClose()
        return
      }

      this._isClosing = true
      this.dataset.state = 'closing'
      this._dialog.dataset.state = 'closing'
      this._closeTimer = setTimeout(() => {
        this._finalizeClose()
      }, this._transitionMs)
    }

    showInteraction({ title = 'Interaction', message = '', details = [], choices = [] } = {}) {
      configureModalHost(this, { transitionMs: this._transitionMs })
      this._clearCloseTimer()
      this._isClosing = false
      this.dataset.state = 'open'
      this._dialog.dataset.state = 'open'

      if (this._titleEl) {
        this._titleEl.textContent = title
      }

      if (this._messageEl) {
        this._messageEl.textContent = message
      }

      renderDetails(this, details)
      renderChoices(this, choices)

      showDialog(this._dialog)
    }
  }

  customElementsRegistry.define(INTERACTION_MODAL_TAG, InteractionModalElement)
  return InteractionModalElement
}

export function createInteractionModalElement({ document, transitionMs = 260 } = {}) {
  const window = document?.defaultView ?? globalThis.window
  defineInteractionModalElement(window)
  const modal = document?.createElement?.(INTERACTION_MODAL_TAG)
  if (!modal) {
    return null
  }

  if (typeof modal.initialize === 'function') {
    modal.initialize({ transitionMs })
    return modal
  }

  configureModalHost(modal, { transitionMs })
  return modal
}
