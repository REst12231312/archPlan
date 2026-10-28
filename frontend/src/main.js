import './styles/site.css'
import './styles/planner.css'
import './styles/estimate.css'
import './styles/multipage.css'
import './styles/project-mvp.css'

import { renderHeader, renderFooter } from './components/layout.js'
import { renderHomePage, initHomePage } from './pages/home.js'
import { renderTemplatesPage, initTemplatesPage } from './pages/templates.js'
import { renderEditorPage, initEditorPage } from './pages/editor.js'
import { renderAboutPage, initAboutPage } from './pages/about.js'
import { renderAccountPage, initAccountPage } from './pages/account.js'

const pages = {
  home: [renderHomePage, initHomePage],
  templates: [renderTemplatesPage, initTemplatesPage],
  editor: [renderEditorPage, initEditorPage],
  about: [renderAboutPage, initAboutPage],
  account: [renderAccountPage, initAccountPage],
}

let pageName = document.body.dataset.page || 'home'
if (pageName === 'estimate') {
  pageName = 'editor'
  history.replaceState(null, '', '/editor.html?panel=estimate')
}
const [renderPage, initPage] = pages[pageName] || pages.home

document.querySelector('#app').innerHTML = `${renderHeader(pageName)}${renderPage()}${renderFooter()}`
initPage()

const navToggle = document.querySelector('.nav-toggle')
const navigation = document.querySelector('#main-navigation')
navToggle.addEventListener('click', () => {
  const isOpen = navToggle.getAttribute('aria-expanded') === 'true'
  navToggle.setAttribute('aria-expanded', String(!isOpen))
  navigation.classList.toggle('is-open', !isOpen)
  navToggle.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню')
})
