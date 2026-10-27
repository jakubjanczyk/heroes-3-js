import {
  canSplitStack,
  describeSlotHover,
  mustSplitStack,
  splitStackLimits
} from '../../../game/heroes/army-exchange.js'
import { openSplitWindow } from './split-window.js'

function slotPosition(slot) {
  const list = slot.parentElement
  return { army: list.dataset.army, slot: [...list.children].indexOf(slot) }
}

export function createArmyRearranging({
  document,
  container,
  slotLists,
  splitButton,
  selectText,
  canSplit = true,
  showStatus,
  onMove,
  onSplit
}) {
  let selectedStack = null
  let hoveredSlot = null
  let splitMode = false
  let armies = {}

  function showSlotStatus(slot) {
    hoveredSlot = slot
    showStatus(describeSlotHover(armies, selectedStack, slotPosition(slot), selectText))
  }

  function showSplitTargets() {
    for (const list of slotLists) {
      for (const slot of list.children) {
        const position = slotPosition(slot)
        const isSelected =
          position.army === selectedStack?.army && position.slot === selectedStack?.slot
        if (isSelected) {
          slot.setAttribute('aria-current', 'true')
        } else {
          slot.removeAttribute('aria-current')
        }
        slot.classList.toggle(
          'army-slot--split-target',
          splitMode && !isSelected && canSplitStack(armies, selectedStack, position)
        )
      }
    }
    if (splitButton) {
      splitButton.disabled = !selectedStack
      splitButton.setAttribute('aria-pressed', String(splitMode))
    }
  }

  function selectStack(stack) {
    selectedStack = stack
    if (!stack) {
      splitMode = false
    }
    showSplitTargets()
    if (hoveredSlot) {
      showSlotStatus(hoveredSlot)
    }
  }

  function openSplit(to) {
    const from = selectedStack
    splitMode = false
    showSplitTargets()
    openSplitWindow({
      document,
      container,
      pluralName: armies[from.army][from.slot].pluralName,
      limits: splitStackLimits(armies, from, to),
      onSplit: (count) => onSplit({ from, to, count }),
      onClose: () => selectStack(null)
    })
  }

  return {
    showArmies(shown) {
      armies = shown
      selectStack(null)
    },
    unselect() {
      selectStack(null)
    },
    toggleSplitMode() {
      if (selectedStack) {
        splitMode = !splitMode
        showSplitTargets()
      }
    },
    clickSlot(slot, { shiftKey }) {
      const clicked = slotPosition(slot)
      if (!selectedStack) {
        if (slot.querySelector('.army-slot__creature')) {
          selectStack(clicked)
        }
        return
      }

      if (selectedStack.army === clicked.army && selectedStack.slot === clicked.slot) {
        selectStack(null)
        return
      }
      const wantsSplit =
        canSplit && (splitMode || shiftKey) && canSplitStack(armies, selectedStack, clicked)
      if (wantsSplit || mustSplitStack(armies, selectedStack, clicked)) {
        openSplit(clicked)
        return
      }
      onMove({ from: selectedStack, to: clicked })
    },
    hoverSlot: showSlotStatus,
    leaveSlot() {
      hoveredSlot = null
      showStatus('')
    }
  }
}
