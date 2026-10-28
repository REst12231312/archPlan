const navigation = [
  { id: 'home', href: '/', label: 'Главная' },
  { id: 'templates', href: '/templates.html', label: 'Шаблоны' },
  { id: 'editor', href: '/editor.html', label: 'План и смета' },
  { id: 'account', href: '/account.html', label: 'Мои проекты' },
  { id: 'about', href: '/about.html', label: 'О сервисе' },
]

export function renderHeader(activePage) {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="ArchPlan — главная">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
        <span>arch<span class="brand-accent">plan</span></span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-navigation" aria-label="Открыть меню"><span></span><span></span></button>
      <nav class="nav-links" id="main-navigation" aria-label="Основная навигация">
        ${navigation.map(item => `<a href="${item.href}" ${item.id === activePage ? 'aria-current="page"' : ''}>${item.label}</a>`).join('')}
      </nav>
      <a class="header-cta" href="/templates.html">Создать планировку <span aria-hidden="true">↗</span></a>
    </header>`
}

export function renderFooter() {
  return `
    <footer class="site-footer">
      <a class="brand footer-brand" href="/">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
        <span>arch<span class="brand-accent">plan</span></span>
      </a>
      <nav aria-label="Навигация в подвале">
        <a href="/templates.html">Шаблоны</a><a href="/editor.html">План и смета</a>
      </nav>
      <span>Онлайн-планирование ремонта · © 2026 ArchPlan</span>
    </footer>`
}
