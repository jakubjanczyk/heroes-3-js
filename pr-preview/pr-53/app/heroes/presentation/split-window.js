// The split window, as Heroes 3's (VCMI's CSplitWindow): the framed stack's creatures shared out
// between it (left) and the clicked slot (right). The slider counts the right-hand stack; each box
// can be typed into, and the other box takes the rest. `limits` are the counts both stacks start
// with and the least each may keep (army-exchange's `splitStackLimits`). OK calls `onSplit` with
// the right-hand count; OK and Cancel both close the window and call `onClose`.
export function openSplitWindow({ document, container, pluralName, limits, onSplit, onClose }) {
  const { leftCount, rightCount, leftMin, rightMin } = limits
  const total = leftCount + rightCount
  const backdrop = document.getElementById('split-window-template').content.firstElementChild
  const splitWindow = backdrop.cloneNode(true)
  const dialog = splitWindow.querySelector('.split-window')
  const slider = splitWindow.querySelector('.count-slider__range')
  const boxes = {
    left: splitWindow.querySelector('[data-split-side="left"]'),
    right: splitWindow.querySelector('[data-split-side="right"]')
  }
  let right = rightCount

  const title = `Split ${pluralName}`
  dialog.setAttribute('aria-label', title)
  splitWindow.querySelector('.window-title').textContent = title
  for (const name of splitWindow.querySelectorAll('.creature-picture__name')) {
    name.textContent = pluralName
  }
  slider.min = String(rightMin)
  slider.max = String(total - leftMin)

  const clampRight = (count) => Math.min(Math.max(count, rightMin), total - leftMin)

  // `typedSide` is the box being typed into, left as typed unless its number had to change.
  function setRight(count, typedSide = null) {
    right = clampRight(count)
    slider.value = String(right)
    const counts = { left: total - right, right }
    for (const [side, box] of Object.entries(boxes)) {
      if (side !== typedSide || Number(box.value) !== counts[side]) {
        box.value = String(counts[side])
      }
    }
  }

  function typeCount(side) {
    const typed = Number.parseInt(boxes[side].value, 10) || 0
    setRight(side === 'right' ? typed : total - typed, side)
  }

  function close() {
    splitWindow.remove()
    onClose()
  }

  const actions = {
    fewer: () => setRight(right - 1),
    more: () => setRight(right + 1),
    split: () => {
      onSplit(right)
      close()
    },
    cancel: close
  }

  splitWindow.addEventListener('click', (event) => {
    actions[event.target.closest('[data-split-action]')?.dataset.splitAction]?.()
  })
  splitWindow.addEventListener('input', (event) => {
    if (event.target === slider) {
      setRight(Number(slider.value))
    } else if (event.target.dataset.splitSide) {
      typeCount(event.target.dataset.splitSide)
    }
  })
  // The keyboard shortcuts leave Enter to a focused text box, where Heroes 3 splits as OK does.
  splitWindow.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.dataset.splitSide) {
      event.preventDefault()
      actions.split()
    }
  })

  setRight(rightCount)
  container.append(splitWindow)
  dialog.focus()
}
