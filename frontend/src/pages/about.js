export function renderAboutPage() {
  return `
    <main class="page-main about-page">
      <section class="page-hero section-wrap">
        <div class="eyebrow"><span class="eyebrow-dot"></span> О СЕРВИСЕ</div>
        <h1>Больше ясности<br />перед <span class="serif-accent">ремонтом.</span></h1>
        <p>ArchPlan объединяет онлайн-планирование помещений с предварительной оценкой материалов и стоимости их покупки.</p>
      </section>
      <section class="about-story section-wrap">
        <div class="about-story-mark" aria-hidden="true"><span class="brand-mark large"><span></span><span></span><span></span></span><span>ap</span></div>
        <div><span class="gallery-kicker">ПРОСТРАНСТВО И РАСЧЁТЫ</span><h2>Подготовка к ремонту<br /><span class="serif-accent">может быть понятнее.</span></h2><p>Задайте размеры комнат, высоту стен и проёмы. ArchPlan рассчитает площадь пола, стен и потолка, а затем покажет потребность в материалах с запасом и количество упаковок.</p><p>Смета использует тенге, сохраняет снимки проекта в браузере и позволяет заменить ориентировочные цены своими. Стоимость работ и доставки отображается отдельно.</p><a class="button button-primary" href="/templates.html">Перейти к планировке <span aria-hidden="true">→</span></a></div>
      </section>
      <section class="about-bottom section-wrap"><div><span class="eyebrow"><span class="eyebrow-dot"></span> ПРОСТОЙ ПОРЯДОК ДЕЙСТВИЙ</span><h2>План. Материалы. Бюджет.</h2></div><a href="/estimate.html" class="text-link">Открыть сметчик <span aria-hidden="true">→</span></a></section>
    </main>`
}

export function initAboutPage() {}
