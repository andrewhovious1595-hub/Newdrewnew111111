(() => {
  // Mobile navigation toggle
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-site-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Responsive Directory Search & Category Filter
  const searchInput = document.getElementById('directorySearch');
  const chips = document.querySelectorAll('[data-filter-cat]');
  const items = document.querySelectorAll('[data-dir-item]');
  const emptyMsg = document.getElementById('directoryEmpty');
  const countEl = document.getElementById('directoryCount');

  if (items.length) {
    let activeCat = 'all';

    function applyFilter() {
      const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
      let visible = 0;

      items.forEach((el) => {
        const cat = (el.dataset.category || '').toLowerCase();
        const keywords = (el.dataset.keywords || el.textContent || '').toLowerCase();
        const catMatch = activeCat === 'all' || cat === activeCat;
        const textMatch = !q || keywords.includes(q);
        const show = catMatch && textMatch;
        el.classList.toggle('hidden', !show);
        if (show) visible += 1;
      });

      if (countEl) {
        countEl.textContent = visible + (visible === 1 ? ' resource shown' : ' resources shown');
      }
      if (emptyMsg) {
        emptyMsg.classList.toggle('hidden', visible > 0);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        activeCat = chip.dataset.filterCat || 'all';
        chips.forEach((c) => {
          const isActive = c === chip;
          c.classList.toggle('active', isActive);
          c.setAttribute('aria-pressed', String(isActive));
        });
        applyFilter();
      });
    });

    applyFilter();
  }
})();
