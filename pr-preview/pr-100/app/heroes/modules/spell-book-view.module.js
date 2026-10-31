import {
  ALL_SCHOOLS,
  cannotAffordText,
  describeSpellBookSpread,
  hasSpellBook
} from '../../../game/heroes/spell-book.js'
import { getHeroSpellPoints } from '../../../game/heroes/spell-points.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { selectedHeroIdOf, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_FACT_HERO_HIRED,
  APP_FACT_HERO_SELECTED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_SELECTED,
  APP_UI_SPELL_BOOK_OPEN_REQUESTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderDescriptionPopup } from '../presentation/artifacts.js'

const SPELLS_PER_PAGE = 6
const SCHOOL_NAMES = Object.freeze({
  AIR: 'Air Magic',
  EARTH: 'Earth Magic',
  FIRE: 'Fire Magic',
  WATER: 'Water Magic'
})

function initialsOf(name) {
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
}

// The spell book: the hero's spells two pages to a spread, by school and by kind. Nothing can be
// cast yet, so clicking a spell the hero can afford shows its description.
export const registerSpellBookViewModule = defineModule(
  ({ emit, env, state }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    const castSpellButton = document?.getElementById('cast-spell-button')
    let definitions = {}
    let book = null
    let heroId = null
    let popup = null
    let isMapCovered = false
    let coversMap = false
    // The book opens where the player last left it, for each kind of spell.
    const lastPlaces = {
      adventure: { school: ALL_SCHOOLS, spread: 0 },
      combat: { school: ALL_SCHOOLS, spread: 0 }
    }
    let kind = 'adventure'

    function selectedHero() {
      return heroById(state.get(), selectedHeroIdOf(state.get(), viewingPlayer(state.get())))
    }

    function bookHero() {
      return heroById(state.get(), heroId)
    }

    function part(selector) {
      return book.querySelector(selector)
    }

    function renderCastSpellButton() {
      if (!castSpellButton) {
        return
      }
      const canOpen = hasSpellBook(selectedHero())
      castSpellButton.disabled = !canOpen
      castSpellButton.title = canOpen ? 'Cast spell' : 'Cast spell (no spell book)'
    }

    function renderSpell(spell) {
      const item = document.createElement('li')
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'spell-book__spell'
      button.setAttribute('aria-label', spell.name)
      button.dataset.spell = spell.id
      button.dataset.status = spell.statusText
      button.dataset.school = spell.schools.length > 1 ? ALL_SCHOOLS : spell.schools[0]
      if (!spell.canAfford) {
        button.setAttribute('aria-description', 'Not enough spell points')
      }

      const picture = document.createElement('span')
      picture.className = 'spell-book__spell-picture'
      picture.setAttribute('aria-hidden', 'true')
      picture.textContent = initialsOf(spell.name)

      const lines = [spell.name, spell.levelText, `Spell Points: ${spell.cost}`].map(
        (text, index) => {
          const line = document.createElement('span')
          line.className = `spell-book__spell-line spell-book__spell-line--${index + 1}`
          line.textContent = text
          return line
        }
      )
      button.append(picture, ...lines)
      item.append(button)
      return item
    }

    function renderSchoolHeading(school) {
      const item = document.createElement('li')
      item.className = 'spell-book__school-heading'
      item.dataset.school = school
      const heading = document.createElement('h3')
      heading.textContent = SCHOOL_NAMES[school]
      item.append(heading)
      return item
    }

    function currentSpread() {
      return describeSpellBookSpread({
        hero: bookHero(),
        definitions,
        kind,
        school: lastPlaces[kind].school,
        spread: lastPlaces[kind].spread
      })
    }

    function showSpread() {
      const { spread, schoolHeading, spells } = currentSpread()
      lastPlaces[kind].spread = spread
      const places = [
        ...(schoolHeading ? [renderSchoolHeading(schoolHeading)] : []),
        ...spells.map(renderSpell)
      ]
      const onLeft = schoolHeading ? SPELLS_PER_PAGE - 1 : SPELLS_PER_PAGE
      part('[aria-label="Left page"]').replaceChildren(...places.slice(0, onLeft))
      part('[aria-label="Right page"]').replaceChildren(...places.slice(onLeft))

      for (const bookmark of book.querySelectorAll('.spell-book__bookmark')) {
        bookmark.setAttribute(
          'aria-pressed',
          String(bookmark.dataset.school === lastPlaces[kind].school)
        )
      }
      for (const button of book.querySelectorAll('[data-kind]')) {
        button.setAttribute('aria-pressed', String(button.dataset.kind === kind))
      }
      part('.spell-book__spell-points').textContent = String(
        getHeroSpellPoints({ entity: bookHero(), definitions }).value
      )
    }

    function open(id) {
      const hero = heroById(state.get(), id)
      if (!gameShell || book || !hasSpellBook(hero)) {
        return
      }

      heroId = id
      kind = 'adventure'
      book = document
        .getElementById('spell-book-template')
        .content.firstElementChild.cloneNode(true)
      showSpread()
      gameShell.append(book)
      book.focus()
      if (!isMapCovered) {
        coversMap = true
        emit(APP_UI_ADVENTURE_MAP_COVERED, {})
      }
    }

    function close() {
      if (!book) {
        return
      }
      closePopup()
      book.remove()
      book = null
      heroId = null
      if (coversMap) {
        coversMap = false
        emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
      }
    }

    function showMessage({ title, text }) {
      part('.spell-book__message')?.remove()
      const message = document.createElement('div')
      message.className = 'spell-book__message message-box'
      message.setAttribute('role', 'alertdialog')
      message.setAttribute('aria-modal', 'true')
      message.setAttribute('aria-label', title || 'Spell book message')
      if (title) {
        const heading = document.createElement('h2')
        heading.textContent = title
        message.append(heading)
      }
      const line = document.createElement('p')
      line.textContent = text
      const ok = document.createElement('button')
      ok.type = 'button'
      ok.className = 'spell-book__message-ok'
      ok.setAttribute('aria-label', 'OK')
      ok.setAttribute('aria-keyshortcuts', 'Enter Escape')
      ok.textContent = 'OK'
      message.append(line, ok)
      part('.spell-book__window').append(message)
      ok.focus()
    }

    function spellAt(target) {
      const id = target?.closest?.('.spell-book__spell')?.dataset.spell
      return id ? currentSpread().spells.find((spell) => spell.id === id) : null
    }

    function clickSpell(spell) {
      if (!spell.canAfford) {
        const { value } = getHeroSpellPoints({ entity: bookHero(), definitions })
        showMessage({ title: '', text: cannotAffordText(spell.cost, value) })
        return
      }
      showMessage(spell.description)
    }

    function turnTo(spread) {
      lastPlaces[kind].spread = spread
      showSpread()
    }

    function onClick(event) {
      if (!book?.contains(event.target)) {
        return
      }
      event.stopPropagation()

      if (event.target.closest('.spell-book__message-ok')) {
        part('.spell-book__message')?.remove()
        book.focus()
        return
      }
      if (event.target.closest('.spell-book__close')) {
        close()
        return
      }

      const spell = spellAt(event.target)
      if (spell) {
        clickSpell(spell)
        return
      }

      const control = event.target.closest('button')
      if (control?.dataset.turn) {
        turnTo(lastPlaces[kind].spread + Number(control.dataset.turn))
      } else if (control?.dataset.school) {
        lastPlaces[kind] = { school: control.dataset.school, spread: 0 }
        showSpread()
      } else if (control?.dataset.kind) {
        kind = control.dataset.kind
        lastPlaces[kind].spread = 0
        showSpread()
      }
    }

    function closePopup() {
      popup?.remove()
      popup = null
    }

    function openPopup(source, spell) {
      closePopup()
      popup = renderDescriptionPopup(document, {
        title: spell.description.title,
        description: spell.description.text
      })
      gameShell.append(popup)
      const sourceBox = source.getBoundingClientRect()
      const { width } = popup.getBoundingClientRect()
      popup.style.left = `${Math.max(0, sourceBox.left + sourceBox.width / 2 - width / 2)}px`
      popup.style.top = `${sourceBox.bottom}px`
    }

    function showStatus(text) {
      part('.spell-book__status-bar').textContent = text
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions
            renderCastSpellButton()
          }
        },
        { type: APP_UI_HERO_SELECTED, handler: renderCastSpellButton },
        { type: APP_FACT_HERO_SELECTED, handler: renderCastSpellButton },
        { type: APP_FACT_HERO_HIRED, handler: renderCastSpellButton },
        {
          type: APP_UI_SPELL_BOOK_OPEN_REQUESTED,
          handler: (event) => open(event.detail.heroId)
        },
        {
          type: APP_UI_ADVENTURE_MAP_COVERED,
          handler: () => {
            isMapCovered = true
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_UNCOVERED,
          handler: () => {
            isMapCovered = false
          }
        }
      ],
      domSubscriptions: [
        {
          target: castSpellButton,
          type: 'click',
          handler: (event) => {
            event.stopPropagation()
            open(selectedHeroIdOf(state.get(), viewingPlayer(state.get())))
          }
        },
        { target: gameShell, type: 'click', handler: onClick },
        {
          target: gameShell,
          type: 'pointerdown',
          handler: (event) => {
            const source = event.target?.closest?.('.spell-book__spell')
            const spell = book?.contains(source) ? spellAt(source) : null
            if (spell && event.button === 2) {
              openPopup(source, spell)
            }
          }
        },
        {
          target: gameShell,
          type: 'contextmenu',
          handler: (event) => {
            if (book?.contains(event.target)) {
              event.preventDefault()
            }
          }
        },
        { target: env.window, type: 'pointerup', handler: closePopup },
        { target: env.window, type: 'pointercancel', handler: closePopup },
        {
          target: gameShell,
          type: 'mouseover',
          handler: (event) => {
            if (book?.contains(event.target)) {
              showStatus(event.target.closest('[data-status]')?.dataset.status ?? '')
            }
          }
        }
      ],
      dispose: () => {
        closePopup()
        book?.remove()
        book = null
      }
    }
  },
  {
    id: 'spell-book-view',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_HIRED,
      APP_FACT_HERO_SELECTED,
      APP_UI_HERO_SELECTED,
      APP_UI_SPELL_BOOK_OPEN_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ],
    produces: [APP_UI_ADVENTURE_MAP_COVERED, APP_UI_ADVENTURE_MAP_UNCOVERED]
  }
)
