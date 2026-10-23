import { ROOM_TEMPLATES } from '../data/templates.js'

function templateCard(template) {
  const rooms = template.rooms.map(room => {
    const cx = room.x + room.w / 2
    const cy = room.y + room.h / 2
    return `<g><rect x="${room.x}" y="${room.y}" width="${room.w}" height="${room.h}"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle">${room.label.toUpperCase()}</text></g>`
  }).join('')
  return `
    <article class="template-card">
      <a class="template-preview" href="/editor.html?template=${template.id}" aria-label="Открыть шаблон «${template.name}»">
        <svg viewBox="0 0 600 400" role="img" aria-label="Схема планировки ${template.name}">${rooms}</svg>
      </a>
      <div class="template-details"><div><h2>${template.name}</h2><p>${template.description}</p></div><span class="template-area">${template.area} м²</span></div>
      <a class="template-use" href="/editor.html?template=${template.id}">Использовать шаблон <span aria-hidden="true">→</span></a>
    </article>`
}

export function renderTemplatesPage() {
  return `
    <main class="page-main templates-page">
      <section class="page-hero section-wrap">
        <div class="eyebrow"><span class="eyebrow-dot"></span> ВЫБЕРИТЕ СТАРТ</div>
        <h1>С чего начнём<br /><span class="serif-accent">планировку?</span></h1>
        <p>Создайте собственный эскиз с нуля или возьмите за основу готовый вариант и продолжите его редактировать.</p>
        <a class="button button-primary" href="/editor.html">Открыть чистый лист <span aria-hidden="true">→</span></a>
      </section>
      <section class="template-list-section section-wrap" id="templates">
        <div class="page-section-heading"><div><span class="gallery-kicker">ГАЛЕРЕЯ ПЛАНИРОВОК</span><h2>Готовые шаблоны</h2></div><span class="gallery-count">Всего вариантов: ${ROOM_TEMPLATES.length}</span></div>
        <div class="template-grid">${ROOM_TEMPLATES.map(templateCard).join('')}</div>
      </section>
      <section class="template-help section-wrap"><span class="help-icon" aria-hidden="true">✳</span><div><h2>Нужен свой вариант?</h2><p>Перейдите в конструктор, чтобы нарисовать комнаты и стены на чистом поле.</p></div><a href="/editor.html" class="text-link">Перейти к редактору <span aria-hidden="true">→</span></a></section>
    </main>`
}

export function initTemplatesPage() {}
