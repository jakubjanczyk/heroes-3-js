// The upgraded creature, listed last, is chosen first.
export function openRecruitWindow({ document, container, offer, onRecruit, onCancel }) {
  const backdrop = document.getElementById('recruit-window-template').content.firstElementChild
  const recruitWindow = backdrop.cloneNode(true)
  const dialog = recruitWindow.querySelector('.recruit-window')
  const slider = recruitWindow.querySelector('.count-slider__range')
  let current = offer
  let chosenCreature = offer.recruits.at(-1).creature

  function chosenRecruit() {
    return current.recruits.find(({ creature }) => creature === chosenCreature)
  }

  function renderCost(list, cost, count) {
    list.replaceChildren(
      ...cost.map(({ resource, amount }) => {
        const item = document.createElement('li')
        item.textContent = `${amount * count} ${resource}`
        return item
      })
    )
  }

  function renderCount() {
    const count = Number(slider.value)
    recruitWindow.querySelector('.recruit-window__count').textContent = String(count)
    renderCost(recruitWindow.querySelector('.recruit-window__total'), chosenRecruit().cost, count)
    recruitWindow.querySelector('[data-recruit-action="recruit"]').disabled = count === 0
  }

  function renderChoice(recruit) {
    const choice = document.createElement('button')
    choice.type = 'button'
    choice.className = 'creature-picture recruit-window__creature entity--monster'
    choice.dataset.recruitCreature = recruit.creature
    choice.setAttribute('aria-label', recruit.name)
    choice.title = recruit.name
    choice.setAttribute('aria-pressed', String(recruit.creature === chosenCreature))
    // Until creatures have pictures, the name tells the plain and upgraded creature apart.
    const caption = document.createElement('span')
    caption.className = 'creature-picture__name'
    caption.textContent = recruit.name
    choice.append(caption)
    return choice
  }

  // The slider starts at one creature when there is one the player can pay for, else at none.
  function render({ resetCount }) {
    const recruit = chosenRecruit()
    const title = `Recruit ${recruit.name}`
    dialog.setAttribute('aria-label', title)
    recruitWindow.querySelector('.window-title').textContent = title
    recruitWindow
      .querySelector('.recruit-window__creatures')
      .replaceChildren(...current.recruits.map(renderChoice))
    renderCost(recruitWindow.querySelector('.recruit-window__cost'), recruit.cost, 1)
    recruitWindow.querySelector('.recruit-window__available').textContent = String(
      current.available
    )
    const previousCount = Number(slider.value)
    slider.max = String(recruit.maxCount)
    slider.value = String(Math.min(resetCount ? 1 : previousCount, recruit.maxCount))
    renderCount()
  }

  function setCount(count) {
    slider.value = String(count)
    renderCount()
  }

  const actions = {
    fewer: () => setCount(Number(slider.value) - 1),
    more: () => setCount(Number(slider.value) + 1),
    max: () => setCount(slider.max),
    cancel: () => onCancel(),
    recruit: () => onRecruit({ creature: chosenCreature, count: Number(slider.value) })
  }

  recruitWindow.addEventListener('click', (event) => {
    const { target } = event
    const action = target.closest('[data-recruit-action]')?.dataset.recruitAction
    const creature = target.closest('[data-recruit-creature]')?.dataset.recruitCreature
    if (action) {
      actions[action]?.()
    } else if (creature) {
      chosenCreature = creature
      render({ resetCount: true })
    }
  })
  recruitWindow.addEventListener('input', (event) => {
    if (event.target === slider) {
      renderCount()
    }
  })

  render({ resetCount: true })
  container.append(recruitWindow)
  // So Enter recruits rather than pressing again the button that opened the window.
  dialog.focus()

  return {
    update(nextOffer) {
      current = nextOffer
      if (!chosenRecruit()) {
        chosenCreature = current.recruits.at(-1).creature
      }
      render({ resetCount: false })
    },
    close() {
      recruitWindow.remove()
    }
  }
}
