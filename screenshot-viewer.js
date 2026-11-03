(() => {
  'use strict';

  const cards = [...document.querySelectorAll('.grid article')];
  const entries = cards.map(card => {
    const link = card.querySelector('a.primary[href$=".jpg"]');
    return link && {card, link, title: card.querySelector('h2').textContent.trim()};
  }).filter(Boolean);

  const viewer = document.createElement('dialog');
  viewer.className = 'shot-viewer';
  viewer.setAttribute('aria-labelledby', 'shot-title');
  viewer.innerHTML = `
    <div class="shot-toolbar">
      <button type="button" data-action="back">← Назад</button>
      <div class="shot-heading">
        <h2 id="shot-title"></h2>
        <span class="shot-count" aria-live="polite"></span>
      </div>
      <div class="shot-controls">
        <button type="button" data-action="previous" aria-label="Предыдущий снимок">←</button>
        <button type="button" data-action="next" aria-label="Следующий снимок">→</button>
        <button type="button" data-action="zoom" aria-pressed="false">Увеличить</button>
      </div>
    </div>
    <div class="shot-scroll" tabindex="0" aria-label="Полностраничные снимки">
      <div class="shot-row"></div>
    </div>`;
  document.body.append(viewer);

  const title = viewer.querySelector('h2');
  const count = viewer.querySelector('.shot-count');
  const row = viewer.querySelector('.shot-row');
  const scroll = viewer.querySelector('.shot-scroll');
  const back = viewer.querySelector('[data-action="back"]');
  const prev = viewer.querySelector('[data-action="previous"]');
  const next = viewer.querySelector('[data-action="next"]');
  const zoom = viewer.querySelector('[data-action="zoom"]');
  let collection = [];
  let index = 0;
  let enlarged = false;
  let returnTo;
  let returnScroll;
  let closing = false;

  function visibleEntries() {
    return entries.filter(entry => !entry.card.hidden);
  }

  function render(resetScroll = false) {
    const active = collection[index];
    title.textContent = active.title;
    count.textContent = `${index + 1} из ${collection.length}`;
    prev.disabled = index === 0;
    next.disabled = index === collection.length - 1;
    zoom.textContent = enlarged ? 'Сравнить' : 'Увеличить';
    zoom.setAttribute('aria-pressed', String(enlarged));
    row.classList.toggle('is-zoomed', enlarged);
    row.replaceChildren();

    for (const offset of enlarged ? [0] : [-1, 0, 1]) {
      const item = collection[index + offset];
      if (!item) {
        const spacer = document.createElement('div');
        spacer.className = 'shot-side';
        spacer.setAttribute('aria-hidden', 'true');
        row.append(spacer);
        continue;
      }

      const panel = document.createElement(offset ? 'button' : 'figure');
      panel.className = 'shot-panel ' + (offset ? 'shot-side' : 'shot-active');
      if (offset) {
        panel.type = 'button';
        panel.setAttribute('aria-label', 'Открыть снимок: ' + item.title);
        panel.addEventListener('click', () => select(index + offset));
      }
      const caption = document.createElement(offset ? 'span' : 'figcaption');
      caption.className = 'shot-label';
      caption.textContent = item.title;
      const img = document.createElement('img');
      img.src = item.link.href;
      img.alt = offset ? '' : 'Полная страница: ' + item.title;
      panel.append(caption, img);
      row.append(panel);
    }
    if (resetScroll) scroll.scrollTo(0, 0);
  }

  function select(position) {
    if (position < 0 || position >= collection.length) return;
    index = position;
    history.replaceState({...history.state, galleryShot: collection[index].link.getAttribute('href')}, '');
    render(true);
  }

  function show(entry, trigger, push) {
    const available = visibleEntries();
    collection = available.includes(entry) ? available : entries;
    index = collection.indexOf(entry);
    enlarged = false;
    returnTo = trigger;
    returnScroll = [window.scrollX, window.scrollY];
    if (push) history.pushState({...history.state, galleryShot: entry.link.getAttribute('href')}, '');
    document.body.classList.add('shot-viewer-open');
    viewer.showModal();
    render(true);
    back.focus({preventScroll: true});
  }

  function dismiss() {
    if (!viewer.open) return;
    viewer.close();
    document.body.classList.remove('shot-viewer-open');
    window.scrollTo(...returnScroll);
    returnTo?.focus({preventScroll: true});
    closing = false;
  }

  function closeFromViewer() {
    if (closing) return;
    if (history.state?.galleryShot) {
      closing = true;
      history.back();
    } else {
      dismiss();
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href$=".jpg"]');
    if (!anchor || viewer.open) return;
    const entry = entries.find(item => item.link.href === anchor.href);
    if (!entry) return;
    event.preventDefault();
    show(entry, anchor, true);
  });

  back.addEventListener('click', closeFromViewer);
  prev.addEventListener('click', () => select(index - 1));
  next.addEventListener('click', () => select(index + 1));
  zoom.addEventListener('click', () => {
    enlarged = !enlarged;
    render(true);
  });
  viewer.addEventListener('cancel', event => {
    event.preventDefault();
    closeFromViewer();
  });
  viewer.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (enlarged && event.target === scroll) return;
    event.preventDefault();
    select(index + (event.key === 'ArrowRight' ? 1 : -1));
  });
  window.addEventListener('popstate', event => {
    if (viewer.open) {
      dismiss();
    } else if (event.state?.galleryShot) {
      const entry = entries.find(item => item.link.getAttribute('href') === event.state.galleryShot);
      if (entry) show(entry, entry.link, false);
    }
  });
})();
