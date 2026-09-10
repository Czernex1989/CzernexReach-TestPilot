const form = document.getElementById('test-form');
const input = document.getElementById('url-input');
const button = document.getElementById('run-button');
const resultEl = document.getElementById('result');

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

const STATUS_LABELS = {
  PASS: 'PASS — podstawowe kontrole techniczne przeszły poprawnie, strona wygląda na gotową',
  WARNING: 'WARNING — strona działa, ale są elementy wymagające uwagi przed przekazaniem',
  FAIL: 'FAIL — wykryto problem do naprawy przed publikacją lub oddaniem klientowi',
};

function renderLoading() {
  resultEl.hidden = false;
  resultEl.innerHTML = '<p class="loading">Sprawdzam gotowość strony do publikacji…</p>';
}

function renderError(message) {
  resultEl.hidden = false;
  resultEl.innerHTML = `<p class="error-box">${escapeHtml(message)}</p>`;
}

function renderResult(data) {
  const issues = [];

  if (data.error) {
    issues.push(`Strona nie załadowała się: ${data.error}`);
  }
  if (data.httpStatus !== null && data.httpStatus >= 400) {
    issues.push(`Serwer zwrócił status HTTP ${data.httpStatus}`);
  }
  for (const err of data.consoleErrors) {
    issues.push(`Błąd konsoli: ${err}`);
  }
  for (const link of data.brokenLinks) {
    issues.push(`Niedziałający link: ${link.href} (${link.status ?? 'brak odpowiedzi'})`);
  }

  const issuesHtml = issues.length
    ? `<div class="result-issues"><h3>Do poprawy przed publikacją (${issues.length})</h3><ul>${issues
        .map((i) => `<li>${escapeHtml(i)}</li>`)
        .join('')}</ul></div>`
    : '';

  const screenshotHtml = data.screenshot
    ? `<div class="result-screenshot"><img src="/screenshots/${encodeURIComponent(data.screenshot)}" alt="Zrzut ekranu błędu" /></div>`
    : '';

  const statusLabel = STATUS_LABELS[data.status] || data.status;

  resultEl.hidden = false;
  resultEl.innerHTML = `
    <span class="result-status ${data.status}">${escapeHtml(statusLabel)}</span>
    <div class="result-meta">
      <div><span>URL</span>${escapeHtml(data.url)}</div>
      <div><span>Status HTTP</span>${data.httpStatus ?? '—'}</div>
      <div><span>Czas ładowania</span>${data.loadTimeMs !== null ? `${data.loadTimeMs} ms` : '—'}</div>
      <div><span>Tytuł strony</span>${escapeHtml(data.title || '—')}</div>
    </div>
    ${issuesHtml}
    ${screenshotHtml}
  `;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  button.disabled = true;
  renderLoading();

  try {
    const response = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();

    if (!response.ok) {
      renderError(data.error || 'Kontrola nie powiodła się.');
      return;
    }

    renderResult(data);
  } catch (err) {
    renderError('Nie udało się połączyć z serwerem.');
  } finally {
    button.disabled = false;
  }
});
