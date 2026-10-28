export function renderHomePage() {
  return `
    <main id="home-page">
      <section class="hero section-wrap home-hero">
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-dot"></span> ПРОСТРАНСТВО, ПРОДУМАННОЕ ДО МЕЛОЧЕЙ</div>
          <h1>Ремонт начинается<br />с <span class="serif-accent">хорошего плана.</span></h1>
          <p class="hero-lead">Создайте планировку квартиры или комнаты онлайн и заранее оцените, сколько материалов понадобится и во сколько обойдётся покупка.</p>
          <div class="hero-actions"><a class="button button-primary" href="/templates.html">Начать планировать <span aria-hidden="true">→</span></a><a class="text-link" href="/about.html">О сервисе <span aria-hidden="true">↗</span></a></div>
          <div class="hero-note"><span class="note-icon" aria-hidden="true">✳</span><span>От идеи и размеров помещения<br />до понятного списка покупок</span></div>
        </div>
        <div class="home-plan-card">
          <div class="stage-label"><span class="stage-dot"></span> ПЛАНИРОВКА В ОДНОМ МЕСТЕ</div>
          <div class="plan-paper">
            <div class="plan-topline"><span>КВАРТИРА · ПЛАНИРОВКА</span><span>ARCHPLAN</span></div>
            <svg class="home-floor-plan" viewBox="0 0 440 300" role="img" aria-label="Схематичный план квартиры">
              <defs><pattern id="home-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#e9e8e1" stroke-width=".6"/></pattern></defs>
              <rect x="20" y="18" width="400" height="264" fill="url(#home-grid)"/>
              <g fill="#f8f7f2" stroke="#303b34" stroke-width="5"><path d="M54 48H250V153H54Z"/><path d="M250 48H389V153H250Z"/><path d="M54 153H184V251H54Z"/><path d="M184 153H289V251H184Z"/><path d="M289 153H389V251H289Z"/></g>
              <g fill="#59655d" font-family="Arial,sans-serif" font-size="11" letter-spacing="1" text-anchor="middle"><text x="151" y="107">ГОСТИНАЯ</text><text x="320" y="107">СПАЛЬНЯ</text><text x="119" y="204">КУХНЯ</text><text x="236" y="204">ХОЛЛ</text><text x="339" y="204">САНУЗЕЛ</text></g>
            </svg>
            <div class="plan-legend"><span><i class="legend-line"></i> Стены</span><span><i class="legend-window"></i> Помещения</span><span>Эскиз планировки</span></div>
          </div>
          <div class="home-card-note"><span class="note-check">✓</span><span><strong>План и смета рядом</strong><small>Проверяйте идею и бюджет по ходу работы</small></span><a href="/estimate.html" aria-label="Открыть смету">↗</a></div>
        </div>
      </section>

      <section class="home-benefits section-wrap">
        <div class="home-section-heading"><div><div class="eyebrow"><span class="eyebrow-dot"></span> ПРОСТО НАЧАТЬ</div><h2>Всё для ремонта<br /><span class="serif-accent">в одном месте.</span></h2></div><p>Продумайте пространство, оцените материалы и подготовьте ориентир по бюджету — последовательно и без лишней путаницы.</p></div>
        <div class="home-feature-grid">
          <a class="home-feature" href="/templates.html"><span class="home-feature-num">01 / ПЛАНИРОВКА</span><span class="home-feature-icon icon-plan" aria-hidden="true">⌗</span><h3>Нарисуйте пространство</h3><p>Начните с чистого листа или выберите готовую планировку и адаптируйте её под себя.</p><span class="feature-link">Перейти к планировкам <b>→</b></span></a>
          <a class="home-feature" href="/editor.html"><span class="home-feature-num">02 / КОНСТРУКТОР</span><span class="home-feature-icon icon-draw" aria-hidden="true">／</span><h3>Задайте размеры комнат</h3><p>Укажите длину, ширину и высоту, добавьте окна и двери. Площади обновятся автоматически.</p><span class="feature-link">Открыть конструктор <b>→</b></span></a>
          <a class="home-feature" href="/estimate.html"><span class="home-feature-num">03 / СМЕТА</span><span class="home-feature-icon icon-cost" aria-hidden="true">₸</span><h3>Рассчитайте упаковки</h3><p>Увидьте потребность с запасом, число упаковок, цены в тенге и общую сумму.</p><span class="feature-link">Рассчитать смету <b>→</b></span></a>
        </div>
      </section>

      <section class="home-process">
        <div class="section-wrap process-inner"><div><div class="eyebrow eyebrow-light"><span class="eyebrow-dot"></span> ОТ ИДЕИ ДО РАСЧЁТА</div><h2>Планируйте в своём<br /><span class="serif-light">темпе.</span></h2><p>Задайте размеры помещений и проёмов, затем проверьте количество материалов и стоимость. Черновик останется в этом браузере.</p><a class="button button-light" href="/templates.html">Выбрать шаблон <span aria-hidden="true">→</span></a></div><ol class="process-steps"><li><span>01</span><div><strong>Выберите основу</strong><small>Начните с шаблона или своей комнаты</small></div></li><li><span>02</span><div><strong>Укажите размеры</strong><small>Добавьте окна и двери в расчёт</small></div></li><li><span>03</span><div><strong>Соберите список закупки</strong><small>Учтите запас и целые упаковки</small></div></li></ol></div>
      </section>
    </main>`
}

export function initHomePage() {}
