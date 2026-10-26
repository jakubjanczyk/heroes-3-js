import {
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_CONFIRMED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_NOTICE_OPENED
} from '../events.js'
import {
  createInteractionModalElement,
  INTERACTION_MODAL_CLOSED_EVENT
} from '../ui/interaction-modal.element.js'
import { defineModule } from './shared/module-runtime.js'

export const registerInteractionModalModule = defineModule(
  ({ emit, env, config }) => {
    const viewport = env.document?.querySelector('.viewport')
    const modalTransitionMs = config?.interactionModalTransitionMs ?? 260
    let activeModal = null
    let isClosing = false
    // Modals opened while one is showing wait their turn, e.g. one level-up popup per level.
    const waitingModals = []

    function openModal(payload) {
      waitingModals.push(payload)
      if (!activeModal && !isClosing) {
        showNextModal()
      }
    }

    function showNextModal() {
      const payload = waitingModals.shift()
      if (!payload || !viewport || !env.document) {
        return
      }

      const modalElement = createInteractionModalElement({
        document: env.document,
        transitionMs: modalTransitionMs
      })
      if (!modalElement) {
        return
      }

      modalElement.addEventListener(
        INTERACTION_MODAL_CLOSED_EVENT,
        (event) => {
          if (activeModal === modalElement) {
            activeModal = null
          }
          // Modals opened in reaction to this one closing queue up behind those already waiting.
          isClosing = true
          try {
            const choice = event.detail?.choice ?? null
            // Confirmed goes first so a popup it opens (the next level-up) is queued before
            // anything waiting for every popup to close sees them all closed.
            emit(APP_UI_INTERACTION_MODAL_CONFIRMED, { choice, subject: payload.subject ?? null })
            emit(APP_UI_INTERACTION_MODAL_CLOSED, { choice })
          } finally {
            isClosing = false
          }
          showNextModal()
        },
        { once: true }
      )

      viewport.appendChild(modalElement)
      modalElement.showInteraction?.(payload)
      activeModal = modalElement
    }

    return {
      subscriptions: [
        {
          type: APP_UI_INTERACTION_MODAL_OPENED,
          handler: (event) => {
            openModal(event.detail)
          }
        },
        {
          type: APP_UI_NOTICE_OPENED,
          handler: (event) => {
            openModal(event.detail)
          }
        }
      ]
    }
  },
  {
    id: 'interaction-modal',
    phase: 'view',
    consumes: [APP_UI_INTERACTION_MODAL_OPENED, APP_UI_NOTICE_OPENED],
    produces: [APP_UI_INTERACTION_MODAL_CONFIRMED, APP_UI_INTERACTION_MODAL_CLOSED]
  }
)
