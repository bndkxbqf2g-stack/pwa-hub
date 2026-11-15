const STORAGE_KEY = "pwa-hub.apps.v1";
const EXPORT_FORMAT = "pwa-hub-export";
const TONES = ["violet", "blue", "cyan", "pink"];

const state = {
  apps: [],
  query: "",
  category: "all",
  sort: "name-asc",
  editingId: null,
  installPrompt: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
  cacheElements();
  state.apps = loadApps();
  bindEvents();
  updateInstallState();
  render();
  registerServiceWorker();
}

function cacheElements() {
  const ids = [
    "openSettingsButton",
    "searchForm",
    "searchInput",
    "clearSearchButton",
    "appCount",
    "categoryFilter",
    "sortSelect",
    "addAppButton",
    "favoritesSection",
    "favoriteCount",
    "favoriteList",
    "resultCount",
    "appGrid",
    "emptyState",
    "emptyTitle",
    "emptyCopy",
    "emptyAddButton",
    "appDialog",
    "appDialogKicker",
    "appDialogTitle",
    "closeAppDialogButton",
    "appForm",
    "appId",
    "appName",
    "appUrl",
    "appDescription",
    "appCategory",
    "appIcon",
    "iconPreview",
    "saveAppLabel",
    "cancelAppButton",
    "settingsDialog",
    "closeSettingsButton",
    "exportButton",
    "importButton",
    "importFileInput",
    "importFeedback",
    "installButton",
    "installDescription",
    "toastRegion",
  ];

  ids.forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", (event) => event.preventDefault());
  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value;
    render();
  });
  elements.clearSearchButton.addEventListener("click", clearFilters);
  elements.categoryFilter.addEventListener("change", () => {
    state.category = elements.categoryFilter.value;
    render();
  });
  elements.sortSelect.addEventListener("change", () => {
    state.sort = elements.sortSelect.value;
    render();
  });

  elements.addAppButton.addEventListener("click", () => openAppDialog());
  elements.emptyAddButton.addEventListener("click", () => {
    if (state.apps.length > 0 && (state.query.trim() || state.category !== "all")) {
      clearFilters();
      return;
    }
    openAppDialog();
  });

  elements.openSettingsButton.addEventListener("click", () => openDialog(elements.settingsDialog));
  elements.closeSettingsButton.addEventListener("click", () => closeDialog(elements.settingsDialog));
  elements.closeAppDialogButton.addEventListener("click", () => closeDialog(elements.appDialog));
  elements.cancelAppButton.addEventListener("click", () => closeDialog(elements.appDialog));

  elements.appDialog.addEventListener("click", (event) => closeOnBackdrop(event, elements.appDialog));
  elements.settingsDialog.addEventListener("click", (event) => closeOnBackdrop(event, elements.settingsDialog));

  elements.appForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveApp();
  });

  [elements.appName, elements.appUrl, elements.appCategory].forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
  });
  elements.appIcon.addEventListener("input", updateIconPreview);
  document.querySelectorAll("[data-icon]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.appIcon.value = button.dataset.icon;
      updateIconPreview();
    });
  });

  elements.appGrid.addEventListener("click", handleAppGridClick);
  elements.appGrid.addEventListener("keydown", handleAppGridKeydown);
  elements.favoriteList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-favorite-app-id]");
    if (!item) return;
    const app = findApp(item.dataset.favoriteAppId);
    if (app) openApp(app);
  });

  elements.exportButton.addEventListener("click", exportApps);
  elements.importButton.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", async () => {
    const [file] = elements.importFileInput.files || [];
    if (file) await importApps(file);
    elements.importFileInput.value = "";
  });
  elements.installButton.addEventListener("click", installPwa);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    updateInstallState();
  });

  window.addEventListener("appinstalled", () => {
    state.installPrompt = null;
    updateInstallState();
    showToast("PWA Hub wurde installiert.");
  });
}

function render() {
  renderCategoryFilter();

  const filteredApps = getFilteredApps();
  const favoriteApps = filteredApps.filter((app) => app.favorite);

  elements.appGrid.replaceChildren(...filteredApps.map(createAppCard));
  elements.favoriteList.replaceChildren(...favoriteApps.map(createFavoriteItem));
  elements.favoritesSection.hidden = favoriteApps.length === 0;
  elements.favoriteCount.textContent = formatCount(favoriteApps.length);
  elements.appCount.textContent = formatCount(state.apps.length);
  elements.resultCount.textContent = `${filteredApps.length} ${filteredApps.length === 1 ? "Ergebnis" : "Ergebnisse"}`;
  elements.clearSearchButton.hidden = !state.query.trim();

  const isFiltered = Boolean(state.query.trim()) || state.category !== "all";
  elements.emptyState.hidden = filteredApps.length > 0;
  if (filteredApps.length === 0) {
    if (state.apps.length === 0) {
      elements.emptyTitle.textContent = "Dein Hub ist bereit.";
      elements.emptyCopy.textContent = "Füge deine erste PWA hinzu, um hier deinen persönlichen Startpunkt aufzubauen.";
      elements.emptyAddButton.innerHTML = '<span class="button-plus" aria-hidden="true">+</span> Erste App hinzufügen';
    } else if (isFiltered) {
      elements.emptyTitle.textContent = "Keine passende App gefunden.";
      elements.emptyCopy.textContent = "Passe deine Suche oder den Kategorie-Filter an, oder setze die Filter zurück.";
      elements.emptyAddButton.textContent = "Filter zurücksetzen";
    } else {
      elements.emptyTitle.textContent = "Hier ist noch Platz.";
      elements.emptyCopy.textContent = "Füge eine weitere PWA hinzu, um deine Sammlung zu erweitern.";
      elements.emptyAddButton.innerHTML = '<span class="button-plus" aria-hidden="true">+</span> App hinzufügen';
    }
  }
}

function renderCategoryFilter() {
  const categories = [...new Set(state.apps.map((app) => app.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));
  const categoryStillExists = state.category === "all" || categories.includes(state.category);
  if (!categoryStillExists) state.category = "all";

  const options = [createOption("all", "Alle Kategorien"), ...categories.map((category) => createOption(category, category))];
  elements.categoryFilter.replaceChildren(...options);
  elements.categoryFilter.value = state.category;
  elements.sortSelect.value = state.sort;
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function createAppCard(app) {
  const card = document.createElement("article");
  const tone = getTone(app);
  card.className = "app-card";
  card.dataset.appId = app.id;
  card.dataset.tone = tone;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${app.name} öffnen`);

  const top = createElement("div", "card-top");
  top.append(createAppIcon(app, tone));

  const favoriteButton = createElement("button", `favorite-toggle${app.favorite ? " is-favorite" : ""}`, app.favorite ? "★" : "☆");
  favoriteButton.type = "button";
  favoriteButton.dataset.action = "favorite";
  favoriteButton.setAttribute("aria-pressed", String(app.favorite));
  favoriteButton.setAttribute("aria-label", app.favorite ? `${app.name} aus Favoriten entfernen` : `${app.name} zu Favoriten hinzufügen`);
  favoriteButton.title = app.favorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen";
  top.append(favoriteButton);

  const content = createElement("div", "card-content");
  content.append(createElement("span", "category-pill", app.category));
  content.append(createElement("h3", "", app.name));
  content.append(createElement("p", "", app.description || "Keine Beschreibung hinterlegt."));

  const footer = createElement("div", "card-footer");
  const openButton = createElement("button", "open-app-button");
  openButton.type = "button";
  openButton.dataset.action = "open";
  openButton.append(document.createTextNode("Öffnen"), createElement("span", "", "↗"));
  footer.append(openButton);

  const actions = createElement("div", "card-actions");
  const editButton = createElement("button", "card-action", "✎");
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.setAttribute("aria-label", `${app.name} bearbeiten`);
  editButton.title = "Bearbeiten";
  const deleteButton = createElement("button", "card-action card-action--danger", "⌫");
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.setAttribute("aria-label", `${app.name} löschen`);
  deleteButton.title = "Löschen";
  actions.append(editButton, deleteButton);
  footer.append(actions);

  card.append(top, content, footer);
  return card;
}

function createFavoriteItem(app) {
  const item = createElement("button", "favorite-item");
  item.type = "button";
  item.dataset.favoriteAppId = app.id;
  item.setAttribute("aria-label", `${app.name} öffnen`);
  item.append(createAppIcon(app, getTone(app)));

  const copy = createElement("span", "favorite-item-copy");
  copy.append(createElement("span", "favorite-item-name", app.name));
  copy.append(createElement("span", "favorite-item-category", app.category));
  item.append(copy);
  return item;
}

function createAppIcon(app, tone) {
  const icon = createElement("span", "app-icon", app.icon || getInitials(app.name));
  icon.dataset.tone = tone;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function createElement(tagName, className = "", text = undefined) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getFilteredApps() {
  const query = state.query.trim().toLocaleLowerCase("de-DE");
  const apps = state.apps.filter((app) => {
    const matchesQuery = !query || `${app.name} ${app.description}`.toLocaleLowerCase("de-DE").includes(query);
    const matchesCategory = state.category === "all" || app.category === state.category;
    return matchesQuery && matchesCategory;
  });

  return apps.sort((a, b) => {
    switch (state.sort) {
      case "name-desc":
        return b.name.localeCompare(a.name, "de", { sensitivity: "base" });
      case "newest":
        return Number(b.createdAt) - Number(a.createdAt);
      case "oldest":
        return Number(a.createdAt) - Number(b.createdAt);
      case "name-asc":
      default:
        return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
    }
  });
}

function handleAppGridClick(event) {
  const card = event.target.closest("[data-app-id]");
  if (!card) return;
  const app = findApp(card.dataset.appId);
  if (!app) return;

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const { action } = actionButton.dataset;
    if (action === "favorite") toggleFavorite(app);
    if (action === "open") openApp(app);
    if (action === "edit") openAppDialog(app);
    if (action === "delete") deleteApp(app);
    return;
  }

  if (!event.target.closest("button")) openApp(app);
}

function handleAppGridKeydown(event) {
  const card = event.target.closest("[data-app-id]");
  if (!card || event.target !== card) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  const app = findApp(card.dataset.appId);
  if (app) openApp(app);
}

function openApp(app) {
  const opened = window.open(app.url, "_blank", "noopener,noreferrer");
  if (!opened) showToast("Der Browser hat das neue Tab blockiert. Erlaube Pop-ups für PWA Hub.", "error");
}

function openAppDialog(app = null) {
  state.editingId = app?.id || null;
  elements.appForm.reset();
  elements.appId.value = app?.id || "";
  elements.appName.value = app?.name || "";
  elements.appUrl.value = app?.url || "";
  elements.appDescription.value = app?.description || "";
  elements.appCategory.value = app?.category || "Sonstiges";
  elements.appIcon.value = app?.icon || "✦";
  elements.appDialogKicker.textContent = app ? "APP BEARBEITEN" : "NEUE VERKNÜPFUNG";
  elements.appDialogTitle.textContent = app ? "App bearbeiten" : "App hinzufügen";
  elements.saveAppLabel.textContent = app ? "Änderungen speichern" : "App speichern";
  clearFormErrors();
  updateIconPreview();
  openDialog(elements.appDialog);
  window.setTimeout(() => elements.appName.focus(), 60);
}

function saveApp() {
  const name = elements.appName.value.trim();
  const urlValue = elements.appUrl.value.trim();
  const description = elements.appDescription.value.trim();
  const category = elements.appCategory.value.trim();
  const icon = Array.from(elements.appIcon.value.trim()).slice(0, 8).join("") || "✦";
  const urlResult = validateUrl(urlValue);
  let invalid = false;

  if (!name) {
    markFieldInvalid(elements.appName, "Bitte gib einen Namen ein.");
    invalid = true;
  }
  if (!urlResult.valid) {
    markFieldInvalid(elements.appUrl, urlResult.message);
    invalid = true;
  }
  if (!category) {
    markFieldInvalid(elements.appCategory, "Bitte gib eine Kategorie ein.");
    invalid = true;
  }
  if (invalid) {
    showToast("Bitte prüfe die markierten Felder.", "error");
    return;
  }

  const existing = state.editingId ? findApp(state.editingId) : null;
  const nextApp = {
    id: existing?.id || makeId(),
    name: name.slice(0, 60),
    url: urlResult.normalized,
    description: description.slice(0, 140),
    category: category.slice(0, 32),
    icon,
    favorite: existing?.favorite || false,
    createdAt: existing?.createdAt || Date.now(),
  };

  if (existing) {
    state.apps = state.apps.map((app) => (app.id === existing.id ? nextApp : app));
    showToast(`${nextApp.name} wurde aktualisiert.`);
  } else {
    state.apps = [...state.apps, nextApp];
    showToast(`${nextApp.name} wurde hinzugefügt.`);
  }

  persistApps();
  render();
  closeDialog(elements.appDialog);
}

function toggleFavorite(app) {
  app.favorite = !app.favorite;
  persistApps();
  render();
  showToast(app.favorite ? `${app.name} ist jetzt ein Favorit.` : `${app.name} wurde aus den Favoriten entfernt.`);
}

function deleteApp(app) {
  const confirmed = window.confirm(`„${app.name}“ wirklich löschen? Dieser Eintrag wird aus deinem Hub entfernt.`);
  if (!confirmed) return;
  state.apps = state.apps.filter((candidate) => candidate.id !== app.id);
  persistApps();
  render();
  showToast(`${app.name} wurde gelöscht.`);
}

function exportApps() {
  const payload = {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    apps: state.apps,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `pwa-hub-export-${date}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setImportFeedback(`${state.apps.length} ${state.apps.length === 1 ? "Eintrag" : "Einträge"} exportiert.`);
  showToast("Deine App-Liste wurde als JSON exportiert.");
}

async function importApps(file) {
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    setImportFeedback("Die Datei ist kein gültiges JSON.", true);
    showToast("Import fehlgeschlagen: ungültiges JSON.", "error");
    return;
  }

  const rawApps = Array.isArray(parsed) ? parsed : parsed?.apps;
  if (!Array.isArray(rawApps)) {
    setImportFeedback("Erwartet wurde eine JSON-Datei mit einem „apps“-Array.", true);
    showToast("Import fehlgeschlagen: kein App-Array gefunden.", "error");
    return;
  }

  const validApps = [];
  const issues = [];
  rawApps.forEach((rawApp, index) => {
    const normalized = normalizeApp(rawApp, { newId: true });
    if (normalized) validApps.push(normalized);
    else issues.push(`Eintrag ${index + 1}`);
  });

  const seenUrls = new Set(state.apps.map((app) => canonicalUrl(app.url)));
  const uniqueApps = [];
  let duplicateCount = 0;
  validApps.forEach((app) => {
    const key = canonicalUrl(app.url);
    if (seenUrls.has(key)) {
      duplicateCount += 1;
      return;
    }
    seenUrls.add(key);
    uniqueApps.push(app);
  });

  if (issues.length > 0 || duplicateCount > 0) {
    const details = [];
    if (issues.length > 0) details.push(`${issues.length} ungültige oder unvollständige Einträge`);
    if (duplicateCount > 0) details.push(`${duplicateCount} bereits vorhandene oder doppelte Einträge`);
    const confirmed = window.confirm(`${details.join(" und ")} wurden erkannt. Bestehende Einträge bleiben unverändert und Konflikte werden übersprungen. Die übrigen gültigen Einträge importieren?`);
    if (!confirmed) {
      setImportFeedback("Import abgebrochen – bestehende Daten wurden nicht verändert.", true);
      return;
    }
  }

  if (uniqueApps.length === 0) {
    const message = issues.length > 0 ? "Keine gültigen neuen Einträge gefunden." : "Alle Einträge sind bereits im Hub vorhanden.";
    setImportFeedback(message, true);
    showToast(message, "error");
    return;
  }

  state.apps = [...state.apps, ...uniqueApps];
  persistApps();
  render();
  const warning = issues.length > 0 || duplicateCount > 0;
  const message = `${uniqueApps.length} ${uniqueApps.length === 1 ? "App" : "Apps"} importiert${warning ? "; ungültige oder doppelte Einträge wurden übersprungen." : "."}`;
  setImportFeedback(message, warning);
  showToast(message, warning ? "info" : "success");
}

function installPwa() {
  if (state.installPrompt) {
    const promptEvent = state.installPrompt;
    state.installPrompt = null;
    promptEvent.prompt();
    promptEvent.userChoice.then((choice) => {
      showToast(choice.outcome === "accepted" ? "Installation gestartet." : "Installation nicht ausgeführt.");
      updateInstallState();
    });
    return;
  }

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  showToast(isIos ? "Auf dem iPhone: Teilen → Zum Home-Bildschirm." : "Öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“." );
}

function updateInstallState() {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) {
    elements.installButton.textContent = "PWA Hub ist installiert";
    elements.installButton.disabled = true;
    elements.installDescription.textContent = "PWA Hub ist bereits als eigenständige App geöffnet.";
    return;
  }

  elements.installButton.disabled = false;
  if (state.installPrompt) {
    elements.installButton.innerHTML = '<span aria-hidden="true">↓</span> App installieren';
    elements.installDescription.textContent = "Installiere PWA Hub für einen direkten Start vom Home-Bildschirm.";
  } else {
    elements.installButton.innerHTML = '<span aria-hidden="true">⌂</span> Installationshinweise';
    elements.installDescription.textContent = "Installiere PWA Hub auf deinem Gerät für einen direkten Start vom Home-Bildschirm.";
  }
}

function updateIconPreview() {
  elements.iconPreview.textContent = Array.from(elements.appIcon.value.trim()).slice(0, 8).join("") || "✦";
}

function clearFilters() {
  state.query = "";
  state.category = "all";
  elements.searchInput.value = "";
  render();
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
  if (dialog === elements.appDialog) state.editingId = null;
}

function closeOnBackdrop(event, dialog) {
  if (event.target === dialog) closeDialog(dialog);
}

function findApp(id) {
  return state.apps.find((app) => app.id === id);
}

function loadApps() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    const rawApps = Array.isArray(parsed) ? parsed : parsed?.apps;
    if (!Array.isArray(rawApps)) return [];
    return rawApps.map((app) => normalizeApp(app)).filter(Boolean);
  } catch {
    return [];
  }
}

function persistApps() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.apps));
  } catch {
    showToast("Die lokale Speicherung ist momentan nicht verfügbar.", "error");
  }
}

function normalizeApp(rawApp, options = {}) {
  if (!rawApp || typeof rawApp !== "object") return null;
  const name = String(rawApp.name || "").trim();
  const urlValue = String(rawApp.url || "").trim();
  const category = String(rawApp.category || "").trim();
  const urlResult = validateUrl(urlValue);
  if (!name || !category || !urlResult.valid) return null;

  return {
    id: options.newId ? makeId() : String(rawApp.id || makeId()),
    name: name.slice(0, 60),
    url: urlResult.normalized,
    description: String(rawApp.description || "").trim().slice(0, 140),
    category: category.slice(0, 32),
    icon: Array.from(String(rawApp.icon || "✦").trim()).slice(0, 8).join("") || "✦",
    favorite: Boolean(rawApp.favorite),
    createdAt: Number.isFinite(Number(rawApp.createdAt)) ? Number(rawApp.createdAt) : Date.now(),
  };
}

function validateUrl(value) {
  if (!value) return { valid: false, message: "Bitte gib eine URL ein." };
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { valid: false, message: "Nur http:// oder https:// URLs sind erlaubt." };
    }
    if (!url.hostname) return { valid: false, message: "Die URL braucht eine gültige Domain." };
    return { valid: true, normalized: url.href };
  } catch {
    return { valid: false, message: "Bitte gib eine vollständige URL ein, z. B. https://example.com." };
  }
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    return `${url.protocol}//${url.host}${pathname}${url.search}${url.hash}`.toLocaleLowerCase("de-DE");
  } catch {
    return String(value).trim().toLocaleLowerCase("de-DE");
  }
}

function markFieldInvalid(field, message) {
  field.setAttribute("aria-invalid", "true");
  field.setCustomValidity(message);
  field.reportValidity();
}

function clearFieldError(field) {
  field.removeAttribute("aria-invalid");
  field.setCustomValidity("");
}

function clearFormErrors() {
  [elements.appName, elements.appUrl, elements.appCategory].forEach(clearFieldError);
}

function getTone(app) {
  const source = `${app.name}${app.url}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash << 5) - hash + source.charCodeAt(index);
  return TONES[Math.abs(hash) % TONES.length];
}

function getInitials(name) {
  return name.trim().charAt(0).toUpperCase() || "✦";
}

function formatCount(count) {
  return `${count} ${count === 1 ? "App" : "Apps"}`;
}

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setImportFeedback(message, warning = false) {
  elements.importFeedback.textContent = message;
  elements.importFeedback.classList.toggle("is-warning", warning);
}

function showToast(message, kind = "info") {
  const toast = createElement("div", `toast${kind === "error" ? " is-error" : ""}`, message);
  elements.toastRegion.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 220);
  }, 3400);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Die Oberfläche bleibt auch ohne Service Worker vollständig nutzbar.
  });
}

