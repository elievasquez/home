document.addEventListener("DOMContentLoaded", () => {
  initQuote();
  initBackgroundSelector();
  loadNews();
});

// 1. Cargar Frase Aleatoria
function initQuote() {
  const random = Math.floor(Math.random() * QUOTES.length);
  document.getElementById("quote-text").innerText = `"${QUOTES[random].text}"`;
  document.getElementById("quote-author").innerText = `- ${QUOTES[random].author}`;
}

// 2. Cambiar Imagen de Fondo
function initBackgroundSelector() {
  const select = document.getElementById("bg-select");
  const header = document.getElementById("main-header");

  // Establecer fondo inicial
  header.style.backgroundImage = `url('${select.value}')`;

  select.addEventListener("change", (e) => {
    header.style.backgroundImage = `url('${e.target.value}')`;
  });
}

// 3. Cargar Noticias RSS
async function loadNews() {
  const newsContainer = document.getElementById("news-container");
  newsContainer.innerHTML = "<p>Cargando noticias...</p>";

  let allArticles = [];

  for (const feed of CONFIG.rssFeeds) {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
      const data = await res.json();
      
      if (data.status === 'ok') {
        // Tomar los primeros 3 artículos de cada sitio
        const items = data.items.slice(0, 3).map(item => ({
          title: item.title,
          link: item.link,
          source: feed.name
        }));
        allArticles = allArticles.concat(items);
      }
    } catch (error) {
      console.error(`Error cargando el feed: ${feed.name}`, error);
    }
  }

  // Renderizar noticias
  newsContainer.innerHTML = "";
  allArticles.forEach(article => {
    const card = document.createElement("div");
    card.className = "news-card";
    card.innerHTML = `
      <div>
        <span class="source">${article.source}</span>
        <h3>${article.title}</h3>
      </div>
      <a href="${article.link}" target="_blank" rel="noopener noreferrer">Leer más →</a>
    `;
    newsContainer.appendChild(card);
  });
}
