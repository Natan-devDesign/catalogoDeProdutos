/**
 * public/js/catalog-filters.js
 * Busca AJAX no catálogo — sem reload de página.
 * Depende de: data-category-slug no <body>
 */
(function () {
  'use strict';

  const grid        = document.getElementById('productGrid');
  const searchInput = document.getElementById('searchInput');
  const filterBtns  = document.querySelectorAll('[data-filter]');
  const countEl     = document.getElementById('resultsCount');
  const noResults   = document.getElementById('noResults');
  const paginationEl= document.getElementById('pagination');
  const categorySlug = document.body.dataset.categorySlug || '';

  let currentPage   = 1;
  let currentFilter = 'todos';
  let debounceTimer = null;

  // ── BUSCA PRINCIPAL ──────────────────────────────────────
  async function fetchProducts(resetPage = true) {
    if (resetPage) currentPage = 1;
    const q = searchInput ? searchInput.value.trim() : '';

    const params = new URLSearchParams({
      categorySlug,
      q,
      filtro: currentFilter,
      page:   currentPage,
    });

    setLoading(true);

    try {
      const res  = await fetch(`/api/catalog/search?${params}`);
      if (!res.ok) throw new Error('Erro na busca');
      const data = await res.json();
      renderGrid(data.products);
      renderPagination(data.totalPages, data.page);
      if (countEl) countEl.textContent = data.total;
    } catch (err) {
      console.error('[catalog-filters]', err);
      renderGrid([]);
    } finally {
      setLoading(false);
    }
  }

  // ── RENDER GRID ──────────────────────────────────────────
  function renderGrid(products) {
    if (!grid) return;

    if (!products || products.length === 0) {
      grid.innerHTML = '';
      if (noResults) noResults.style.display = 'flex';
      return;
    }
    if (noResults) noResults.style.display = 'none';

    grid.innerHTML = products.map(p => `
      <a class="prod-card" href="/produto/${escHtml(p.slug)}">
        <div class="prod-card-img">
          ${p.cover_image
            ? `<img src="${escHtml(p.cover_image)}" alt="${escHtml(p.name)}" loading="lazy"/>`
            : `<div class="prod-card-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                   <rect x="3" y="3" width="18" height="18" rx="2"/>
                   <circle cx="8.5" cy="8.5" r="1.5"/>
                   <polyline points="21 15 16 10 5 21"/>
                 </svg>
               </div>`
          }
        </div>
        <div class="prod-card-info">
          <div class="prod-sku">${escHtml(p.sku)}</div>
          <div class="prod-name">${escHtml(p.name)}</div>
          ${p.short_desc ? `<div class="prod-desc">${escHtml(p.short_desc)}</div>` : ''}
          ${p.tags && p.tags.length
            ? `<div class="prod-tags">${p.tags.slice(0,3).map(t => `<span class="prod-tag">${escHtml(t)}</span>`).join('')}</div>`
            : ''}
        </div>
      </a>
    `).join('');
  }

  // ── PAGINAÇÃO ────────────────────────────────────────────
  function renderPagination(totalPages, page) {
    if (!paginationEl) return;
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    const buttons = [];
    if (page > 1) {
      buttons.push(`<button class="page-btn" data-page="${page - 1}">← ANTERIOR</button>`);
    }
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
        buttons.push(`<button class="page-btn${i === page ? ' active' : ''}" data-page="${i}">${i}</button>`);
      } else if (Math.abs(i - page) === 3) {
        buttons.push(`<span style="color:var(--text-muted);padding:0 .3rem">…</span>`);
      }
    }
    if (page < totalPages) {
      buttons.push(`<button class="page-btn" data-page="${page + 1}">PRÓXIMA →</button>`);
    }
    paginationEl.innerHTML = buttons.join('');
    paginationEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = Number(btn.dataset.page);
        fetchProducts(false);
        window.scrollTo({ top: grid?.offsetTop - 80 || 0, behavior: 'smooth' });
      });
    });
  }

  // ── LOADING STATE ────────────────────────────────────────
  function setLoading(on) {
    if (!grid) return;
    grid.style.opacity  = on ? '0.4' : '1';
    grid.style.pointerEvents = on ? 'none' : '';
    grid.style.transition = 'opacity .2s';
  }

  // ── HELPERS ──────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── EVENT LISTENERS ──────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchProducts(true), 320);
    });
    // Enter sem submit do form
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); fetchProducts(true); }
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter || 'todos';
      fetchProducts(true);
    });
  });

  // ── URL SYNC (preserva busca no histórico) ───────────────
  window.addEventListener('popstate', () => {
    const sp = new URLSearchParams(location.search);
    if (searchInput) searchInput.value = sp.get('q') || '';
    currentFilter = sp.get('filtro') || 'todos';
    currentPage   = Number(sp.get('page')) || 1;
    filterBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.filter === currentFilter);
    });
    fetchProducts(false);
  });

})();
