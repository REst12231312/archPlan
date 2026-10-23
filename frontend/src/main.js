import './styles/site.css'
import './styles/planner.css'
import './styles/estimate.css'
import './styles/multipage.css'

import { renderHeader, renderFooter } from './components/layout.js'
import { renderHomePage, initHomePage } from './pages/home.js'
import { renderTemplatesPage, initTemplatesPage } from './pages/templates.js'
import { renderEditorPage, initEditorPage } from './pages/editor.js'
import { renderEstimatePage, initEstimatePage } from './pages/estimate.js'
import { renderAboutPage, initAboutPage } from './pages/about.js'

const pages = {
  home: [renderHomePage, initHomePage],
  templates: [renderTemplatesPage, initTemplatesPage],
  editor: [renderEditorPage, initEditorPage],
  estimate: [renderEstimatePage, initEstimatePage],
  about: [renderAboutPage, initAboutPage],
}

const pageName = document.body.dataset.page || 'home'
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
