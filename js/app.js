document.addEventListener("DOMContentLoaded", () => {
  // 0. Frase aleatoria (usa QUOTES definido en quotes.js)
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');

  if (quoteText && quoteAuthor && typeof QUOTES !== 'undefined' && QUOTES.length > 0) {
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteText.textContent = `"${randomQuote.text}"`;
    quoteAuthor.textContent = `- ${randomQuote.author}`;
  }

  // 1. Selector de Fondos
  const bgSelect = document.getElementById('bg-select');
  const mainHeader = document.getElementById('main-header');

  if (bgSelect && mainHeader) {
    const changeBackground = (path) => {
      mainHeader.style.backgroundImage = `url('${path}')`;
    };
    
    changeBackground(bgSelect.value);

    bgSelect.addEventListener('change', (e) => {
      changeBackground(e.target.value);
    });
  }

  // 2. Carga y Filtro de Noticias RSS (fuentes definidas en config.js)
  const newsContainer = document.getElementById('news-container');
  const newsSearch = document.getElementById('news-search');
  const feeds = (typeof CONFIG !== 'undefined' && CONFIG.rssFeeds) ? CONFIG.rssFeeds : [];

  let fetchedArticles = [];

  if (newsContainer && feeds.length === 0) {
    newsContainer.innerHTML = '<p>No hay fuentes RSS configuradas en config.js.</p>';
  }

  // Se pide cada feed por separado y se combinan los resultados.
  // Promise.allSettled evita que un solo feed caído rompa a los demás.
  Promise.allSettled(
    feeds.map(feed =>
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
        .then(res => res.json())
        .then(data => {
          if (data.status !== 'ok') throw new Error(`Error al cargar ${feed.name}`);
          // Etiquetamos cada noticia con el nombre de su fuente y su categoría
          return data.items.map(item => ({ ...item, sourceName: feed.name, category: feed.category || '' }));
        })
    )
  ).then(results => {
    fetchedArticles = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const failedFeeds = results.filter(r => r.status === 'rejected').length;
    if (failedFeeds > 0) {
      console.warn(`${failedFeeds} feed(s) no se pudieron cargar.`);
    }

    if (fetchedArticles.length === 0 && newsContainer) {
      newsContainer.innerHTML = '<p>Error al cargar las noticias.</p>';
      return;
    }

    renderNews(fetchedArticles);
  });

  // Renderizar tarjetas
  function renderNews(articles) {
    if (!newsContainer) return;
    newsContainer.innerHTML = '';

    if (articles.length === 0) {
      newsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Sin resultados para la búsqueda.</p>';
      return;
    }

    articles.forEach((item, index) => {
      // Intentar obtener la imagen del objeto RSS o del HTML interno
      let imgUrl = item.thumbnail || 
                   item.enclosure?.link || 
                   item.enclosure?.url || 
                   getImgFromHTML(item.description) ||
                   getImgFromHTML(item.content);

      const cleanText = cleanHTML(item.description || item.content).substring(0, 100) + '...';

      const card = document.createElement('article');
      card.className = 'news-card';
      const imgId = `news-img-${index}`;

      card.innerHTML = `
        <img id="${imgId}" src="${imgUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80'}" alt="${item.title}" loading="lazy">
        <div class="news-body">
          <div class="news-tags">
            ${item.sourceName ? `<span class="news-source">${item.sourceName}</span>` : ''}
            ${item.category ? `<span class="news-category">${item.category}</span>` : ''}
          </div>
          <h3 class="news-title"><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
          <p class="news-desc">${cleanText}</p>
        </div>
      `;
      newsContainer.appendChild(card);

      // Si no traía imagen en el RSS, buscamos la meta-etiqueta en la web original
      if (!imgUrl) {
        fetchOgImage(item.link, imgId);
      }
    });
  }

  // Filtro de noticias en tiempo real
  if (newsSearch) {
    newsSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = fetchedArticles.filter(art => 
        art.title.toLowerCase().includes(q) || 
        cleanHTML(art.description || art.content).toLowerCase().includes(q) ||
        (art.sourceName && art.sourceName.toLowerCase().includes(q)) ||
        (art.category && art.category.toLowerCase().includes(q))
      );
      renderNews(filtered);
    });
  }
});

// Extrae la imagen OG de la página de la noticia resolviendo rutas relativas
function fetchOgImage(articleUrl, imgElementId) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`;
  
  fetch(proxyUrl)
    .then(response => response.json())
    .then(data => {
      if (data.contents) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        let ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                       doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
        
        if (ogImage) {
          // Convertir rutas relativas (/img/foto.jpg) a rutas absolutas (https://sitio.com/img/foto.jpg)
          try {
            ogImage = new URL(ogImage, articleUrl).href;
          } catch (e) {
            // Si la URL es inválida, se mantiene tal cual
          }

          const imgEl = document.getElementById(imgElementId);
          if (imgEl) imgEl.src = ogImage;
        }
      }
    })
    .catch(() => {
      // Mantiene la imagen de placeholder en caso de fallo
    });
}

// Auxiliares
function getImgFromHTML(html) {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const imgs = doc.querySelectorAll('img');
  
  // Omitir imágenes de tracking/emojis analizando fuentes conocidas o tamaños
  for (let img of imgs) {
    if (img.src && !img.src.includes('feedsportal') && !img.src.includes('feedburner')) {
      return img.src;
    }
  }
  return null;
}

function cleanHTML(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}
