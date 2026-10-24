const INFO_BOX_VIEWS = ['hero-box', 'town-box', 'found-box', 'date-box', 'kingdom-box']

export function showInfoBoxView(container, view, ...content) {
  container.classList.remove(...INFO_BOX_VIEWS)
  container.classList.add(view)
  container.replaceChildren(...content)
}
