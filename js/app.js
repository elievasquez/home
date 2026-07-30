document.addEventListener("DOMContentLoaded", () => {
  // 1. Selector de Fondos
  const bgSelect = document.getElementById('bg-select');
  const mainHeader = document.getElementById('main-header');

  if (bgSelect && mainHeader) {
    const changeBackground = (path) => {
      mainHeader.style.backgroundImage = `url('${path}')`;
    };
    
    // Carga inicial
    changeBackground(bgSelect.value);

    // Cambio en selector
    bgSelect.addEventListener('change', (e) => {
      changeBackground(e.target.value);
    });
  }

  // 2. Carga y Filtro de Noticias RSS
  const RSS_URL = 'https://news.google.com/rss?hl=es-419&gl=CL&ceid=CL:es-419'; 
  const newsContainer = document.getElementById('news-container');
  const newsSearch = document.getElementById('news-search');
  
  let fetchedArticles = [];

  // Obtener feed vía rss2json
  fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== 'ok') throw new Error('Error RSS');
      fetchedArticles = data.items;
      renderNews(fetchedArticles);
    })
    .catch(err => {
      console.error(err);
      if (newsContainer) newsContainer.innerHTML = '<p>Error al cargar las noticias.</p>';
    });

  // Renderizar tarjetas
  function renderNews(articles) {
    if (!newsContainer) return;
    newsContainer.innerHTML = '';

    if (articles.length === 0) {
      newsContainer.innerHTML = '<p style="grid-column: 1/-1;">Sin resultados para la búsqueda.</p>';
      return;
    }

    articles.forEach(item => {
      // Extraer imagen del item o del HTML embebido
      let imgUrl = item.thumbnail || item.enclosure?.link || getImgFromHTML(item.description);
      if (!imgUrl) imgUrl = 'https://via.placeholder.com/300x160?text=Noticia';

      const cleanText = cleanHTML(item.description).substring(0, 100) + '...';

      const card = document.createElement('article');
      card.className = 'news-card';
      card.innerHTML = `
        <img src="${imgUrl}" alt="${item.title}" loading="lazy">
        <div class="news-body">
          <h3 class="news-title"><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
          <p class="news-desc">${cleanText}</p>
        </div>
      `;
      newsContainer.appendChild(card);
    });
  }

  // Evento del filtro secundario de noticias
  if (newsSearch) {
    newsSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = fetchedArticles.filter(art => 
        art.title.toLowerCase().includes(q) || cleanHTML(art.description).toLowerCase().includes(q)
      );
      renderNews(filtered);
    });
  }
});

// Funciones Auxiliares
function getImgFromHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
}

function cleanHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}
