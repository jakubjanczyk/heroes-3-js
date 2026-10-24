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

// Rearranging armies on a screen as in Heroes 3, shared by the town screen and the hero screen:
// the first click frames a stack, the second moves it onto the clicked slot (or unframes it,
// clicked again). With Split pressed or Shift held, a click on an empty slot or the same creature
// opens the split window. `slotLists` are the screen's army lists, each with `data-army` naming
// its army; `container` holds the split window. `onMove` and `onSplit` ask for the change, which
// comes back through `showArmies`; a refused move leaves the stack framed.
export function createArmyRearranging({
  document,
  container,
  slotLists,
  splitButton,
  selectText,
  showStatus,
  onMove,
  onSplit
}) {
  // The stack framed for moving, as `{ army, slot }`.
  let selectedStack = null
  let hoveredSlot = null
  // With Split pressed, the next slot clicked splits the framed stack rather than moving it.
  let splitMode = false
  // The stacks shown, by army, as the screen shows them.
  let armies = {}

  function showSlotStatus(slot) {
    hoveredSlot = slot
    showStatus(describeSlotHover(armies, selectedStack, slotPosition(slot), selectText))
  }

  // The framed stack, and with Split pressed, every slot it can be split onto.
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
    splitButton.disabled = !selectedStack
    splitButton.setAttribute('aria-pressed', String(splitMode))
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
    // Any new armies unframe the stack.
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
      const wantsSplit = (splitMode || shiftKey) && canSplitStack(armies, selectedStack, clicked)
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
