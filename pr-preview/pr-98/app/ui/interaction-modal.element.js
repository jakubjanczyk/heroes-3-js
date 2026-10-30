import { setStyleVar } from '../../engine/layers/dom-layer-utils.js'

export const INTERACTION_MODAL_CLOSED_EVENT = 'interaction-modal-closed'

const INTERACTION_MODAL_TAG = 'interaction-modal'

let nextTitleId = 1

const MEDAL_SVG = `
  <svg class="interaction-modal__medal" viewBox="0 0 40 42" aria-hidden="true">
    <path class="interaction-modal__medal-ribbon" d="M7 1h26v15l-5 5-8-4-8 4-5-5z" />
    <path class="interaction-modal__medal-stripes" d="M14 1v16M20 1v15M26 1v16" />
    <circle class="interaction-modal__medal-rim" cx="20" cy="27" r="13" />
    <circle class="interaction-modal__medal-face" cx="20" cy="27" r="10" />
    <path
      class="interaction-modal__medal-star"
      d="M20 18.5L22.1 24.2L28.1 24.4L23.3 28.1L25 33.9L20 30.5L15 33.9L16.7 28.1L11.9 24.4L17.9 24.2z"
    />
  </svg>
`

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

  const titleId = `interaction-modal-title-${nextTitleId}`
  const messageId = `interaction-modal-message-${nextTitleId++}`
  host.innerHTML = `
    <dialog class="interaction-modal" closedby="none" aria-labelledby="${titleId}">
      <article class="interaction-modal__surface message-box">
        <h3 class="interaction-modal__title" id="${titleId}">Interaction</h3>
        <div class="interaction-modal__hero" hidden>
          ${MEDAL_SVG}
          <span class="interaction-modal__portrait" role="img"></span>
          ${MEDAL_SVG}
        </div>
        <p class="interaction-modal__message" id="${messageId}"></p>
        <svg class="interaction-modal__details-picture" role="img" hidden><path /></svg>
        <div class="interaction-modal__details"></div>
        <div class="interaction-modal__choices"></div>
        <div class="interaction-modal__choices interaction-modal__rewards"></div>
        <div class="interaction-modal__actions">
          <button class="interaction-modal__ok-button" type="button" aria-label="OK">
            <svg class="interaction-modal__ok-check" viewBox="0 0 24 16" aria-hidden="true">
              <path d="M5 8.5 L9.5 13 L19 3" />
            </svg>
          </button>
          <button class="interaction-modal__ok-button interaction-modal__no-button" type="button" aria-label="No" aria-keyshortcuts="Escape" hidden>
            <svg class="interaction-modal__ok-check" viewBox="0 0 24 16" aria-hidden="true">
              <path d="M7 2 L17 14 M17 2 L7 14" />
            </svg>
          </button>
        </div>
      </article>
    </dialog>
  `

  host._dialog = host.querySelector('dialog.interaction-modal')
  host._titleEl = host.querySelector('.interaction-modal__title')
  host._messageEl = host.querySelector('.interaction-modal__message')
  host._detailsEl = host.querySelector('.interaction-modal__details')
  host._heroEl = host.querySelector('.interaction-modal__hero')
  host._portraitEl = host.querySelector('.interaction-modal__portrait')
  host._detailsPictureEl = host.querySelector('.interaction-modal__details-picture')
  host._choicesEl = host.querySelector('.interaction-modal__choices')
  host._rewardsEl = host.querySelector('.interaction-modal__rewards')
  host._surfaceEl = host.querySelector('.interaction-modal__surface')
  host._okButtonEl = host.querySelector('.interaction-modal__ok-button')
  host._noButtonEl = host.querySelector('.interaction-modal__no-button')

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
    if (host._isQuestion) {
      host._choice = 'yes'
    }
    host.closeInteraction()
  })

  host._noButtonEl?.addEventListener('click', (event) => {
    event.stopPropagation()
    host._choice = host._isQuestion ? 'no' : null
    host.closeInteraction()
  })
}

function renderHero(host, heroName) {
  host._heroEl.hidden = !heroName
  host._portraitEl.setAttribute('aria-label', heroName ?? '')
  host._portraitEl.textContent = heroName?.charAt(0) ?? ''
}

function renderDetailsPicture(host, picture) {
  const svg = host._detailsPictureEl
  svg.toggleAttribute('hidden', !picture)
  svg.setAttribute('aria-label', picture?.label ?? '')
  svg.setAttribute('viewBox', picture?.viewBox ?? '0 0 24 24')
  svg.querySelector('path').setAttribute('d', picture?.path ?? '')
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

function renderQuestionButtons(host, { isQuestion, canCancel }) {
  host._isQuestion = isQuestion
  host._noButtonEl.hidden = !isQuestion && !canCancel
  host._noButtonEl.setAttribute('aria-label', isQuestion ? 'No' : 'Cancel')
  host._okButtonEl.setAttribute('aria-label', isQuestion ? 'Yes' : 'OK')
  if (isQuestion) {
    host._okButtonEl.setAttribute('aria-keyshortcuts', 'Enter')
  } else {
    host._okButtonEl.removeAttribute('aria-keyshortcuts')
  }
}

function renderChoicePicture(document, { picture, initials }) {
  const icon = document.createElement('span')
  icon.className = 'interaction-modal__choice-picture'
  icon.setAttribute('aria-hidden', 'true')
  if (picture) {
    icon.style.backgroundImage = `url('${picture}')`
  }
  if (initials) {
    icon.dataset.initials = initials
  }
  return icon
}

function renderChoiceCaption(document, { amount, caption }) {
  const lines = caption ?? [String(amount)]
  return lines.map((text) => {
    const line = document.createElement('span')
    line.className = 'interaction-modal__choice-amount'
    line.textContent = text
    return line
  })
}

function pickChoice(host, buttons, button) {
  host._choice = button.dataset.choice
  host._okButtonEl.disabled = false
  for (const other of buttons) {
    other.setAttribute('aria-pressed', String(other === button))
  }
}

function renderChoices(host, choices) {
  const document = host.ownerDocument
  host._choice = null
  host._choicesEl.hidden = choices.length === 0
  host._okButtonEl.disabled = choices.length > 0

  const buttons = choices.map((choice) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'interaction-modal__choice'
    button.dataset.choice = choice.id
    button.setAttribute('aria-label', choice.label)
    button.setAttribute('aria-pressed', 'false')
    button.append(renderChoicePicture(document, choice), ...renderChoiceCaption(document, choice))
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      pickChoice(host, buttons, button)
    })
    return button
  })

  if (buttons.length === 1) {
    pickChoice(host, buttons, buttons[0])
  }

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

// What the message gives, e.g. a pile of ore with its amount; nothing to pick, unlike choices.
function renderRewards(host, rewards) {
  const document = host.ownerDocument
  host._rewardsEl.hidden = rewards.length === 0
  host._rewardsEl.replaceChildren(
    ...rewards.map((reward) => {
      const item = document.createElement('span')
      item.className = 'interaction-modal__choice'
      item.setAttribute('role', 'img')
      item.setAttribute('aria-label', reward.label)
      item.append(renderChoicePicture(document, reward), ...renderChoiceCaption(document, reward))
      return item
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
      this._rewardsEl = null
      this._choice = null
      this._surfaceEl = null
      this._okButtonEl = null
      this._noButtonEl = null
      this._isQuestion = false
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

    showInteraction({
      variant = null,
      title = 'Interaction',
      heroName = null,
      message = '',
      detailsPicture = null,
      details = [],
      choices = [],
      rewards = [],
      isQuestion = false,
      canCancel = false
    } = {}) {
      configureModalHost(this, { transitionMs: this._transitionMs })
      this._clearCloseTimer()
      this._isClosing = false
      this.dataset.state = 'open'
      this._dialog.dataset.state = 'open'

      // A message without a title names the dialog itself.
      this._titleEl.hidden = !title
      this._titleEl.textContent = title ?? ''
      this._dialog.setAttribute('aria-labelledby', (title ? this._titleEl : this._messageEl).id)

      if (this._messageEl) {
        this._messageEl.textContent = message
      }

      if (variant) {
        this._surfaceEl.dataset.variant = variant
      } else {
        delete this._surfaceEl.dataset.variant
      }

      renderHero(this, heroName)
      renderDetailsPicture(this, detailsPicture)
      renderDetails(this, details)
      renderChoices(this, choices)
      renderRewards(this, rewards)
      renderQuestionButtons(this, { isQuestion, canCancel })

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
