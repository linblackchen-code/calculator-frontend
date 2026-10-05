"use strict";

const apiBase = (window.CALCULATOR_CONFIG?.apiBaseUrl ?? "").replace(/\/$/, "");
const expressionInput = document.querySelector("#expression");
const resultOutput = document.querySelector("#result");
const feedback = document.querySelector("#feedback");
const calculateButton = document.querySelector("#calculate");
const historyList = document.querySelector("#history-list");
const historyMessage = document.querySelector("#history-message");
const searchInput = document.querySelector("#history-search");
const favoritesOnly = document.querySelector("#favorites-only");
const exportButton = document.querySelector("#export-history");
let page = 1;
let pages = 1;
let searchTimer;
let historyRequestId = 0;
let calculating = false;
let lastSubmittedExpression = null;

function notify(message, kind = "") {
  feedback.textContent = message;
  feedback.className = `feedback ${kind}`;
}

async function request(path, options = {}, format = "json") {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, signal: AbortSignal.timeout(12000) });
  } catch {
    throw new Error("无法连接计算服务，请确认后端已启动后重试。");
  }
  if (format === "blob" && response.ok) {
    if (!response.headers.get("Content-Type")?.startsWith("text/csv")) {
      throw new Error("导出服务响应异常，请稍后重试。");
    }
    return response.blob();
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("计算服务响应异常，请检查服务地址。");
  }
  if (!response.ok || data.success !== true) {
    throw new Error(data.message || "请求未成功，请稍后重试。");
  }
  return data;
}

function historyFilters() {
  return new URLSearchParams({ search: searchInput.value.trim(), favorites_only: String(favoritesOnly.checked) });
}

async function exportHistory() {
  exportButton.disabled = true;
  exportButton.textContent = "导出中…";
  try {
    const blob = await request(`/api/history/export?${historyFilters()}`, {}, "blob");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date();
    const stamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
    link.href = url;
    link.download = `计算历史-${stamp}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    historyMessage.textContent = "";
  } catch (error) {
    historyMessage.textContent = error.message;
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = "导出 CSV";
  }
}

function expressionChanged() {
  // A previous answer must not appear to belong to a newly edited expression.
  if (expressionInput.value !== lastSubmittedExpression) {
    resultOutput.textContent = "—";
    notify("");
  }
}

function insertText(value) {
  expressionInput.focus();
  const start = expressionInput.selectionStart ?? expressionInput.value.length;
  const end = expressionInput.selectionEnd ?? start;
  if (expressionInput.value.length - (end - start) + value.length > 1024) {
    notify("表达式最多允许 1024 个字符。", "error");
    return;
  }
  expressionInput.setRangeText(value, start, end, "end");
  expressionChanged();
}

function clearExpression() {
  expressionInput.value = "";
  lastSubmittedExpression = null;
  resultOutput.textContent = "0";
  notify("");
  expressionInput.focus();
}

function backspace() {
  expressionInput.focus();
  const start = expressionInput.selectionStart ?? expressionInput.value.length;
  const end = expressionInput.selectionEnd ?? start;
  expressionInput.setRangeText("", start === end ? Math.max(0, start - 1) : start, end, "end");
  expressionChanged();
}

async function submitCalculation() {
  if (calculating) return;
  const submitted = expressionInput.value;
  if (!submitted.trim()) {
    notify("请先输入计算表达式。", "error");
    expressionInput.focus();
    return;
  }
  calculating = true;
  calculateButton.disabled = true;
  calculateButton.textContent = "…";
  resultOutput.textContent = "—";
  notify("正在计算…");
  try {
    const data = await request("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression: submitted }),
    });
    if (expressionInput.value === submitted) {
      resultOutput.textContent = data.result;
      lastSubmittedExpression = submitted;
      notify("");
    } else {
      notify("当前表达式尚未计算。");
    }
    page = 1;
    await loadHistory();
  } catch (error) {
    if (expressionInput.value === submitted) notify(error.message, "error");
  } finally {
    calculating = false;
    calculateButton.disabled = false;
    calculateButton.textContent = "=";
  }
}

function renderRecord(record) {
  const item = document.createElement("div");
  item.className = "history-item";
  item.dataset.id = record.id;
  const content = document.createElement("button");
  content.type = "button";
  content.className = "history-content";
  content.title = "点击将表达式填入计算器";
  const expression = document.createElement("span");
  expression.className = "history-expression";
  expression.textContent = record.expression.replaceAll("*", "×").replaceAll("/", "÷");
  const result = document.createElement("span");
  result.className = "history-result";
  result.textContent = `= ${record.result}`;
  const time = document.createElement("time");
  time.className = "history-time";
  time.dateTime = record.created_at;
  time.textContent = new Date(record.created_at).toLocaleString("zh-CN", { hour12: false });
  content.append(expression, result, time);
  content.addEventListener("click", () => {
    expressionInput.value = record.expression;
    expressionChanged();
    expressionInput.focus();
  });
  const favoriteButton = document.createElement("button");
  favoriteButton.type = "button";
  favoriteButton.className = `favorite-button ${record.is_favorite ? "is-favorite" : ""}`;
  favoriteButton.textContent = record.is_favorite ? "★ 已收藏" : "☆ 收藏";
  favoriteButton.title = record.is_favorite ? "取消收藏" : "收藏记录";
  favoriteButton.setAttribute("aria-pressed", String(record.is_favorite));
  favoriteButton.setAttribute("aria-label", `${favoriteButton.title} ${record.expression}`);
  favoriteButton.addEventListener("click", async () => {
    favoriteButton.disabled = true;
    try {
      await request(`/api/history/${record.id}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !record.is_favorite }),
      });
      await loadHistory();
    } catch (error) {
      historyMessage.textContent = error.message;
      favoriteButton.disabled = false;
    }
  });
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.title = "删除这条记录";
  deleteButton.setAttribute("aria-label", `删除记录 ${record.expression}`);
  // This SVG is a constant. All server-provided text is inserted with textContent.
  deleteButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></svg>';
  deleteButton.addEventListener("click", async () => {
    deleteButton.disabled = true;
    try {
      await request(`/api/history/${record.id}`, { method: "DELETE" });
      await loadHistory();
    } catch (error) {
      historyMessage.textContent = error.message;
      deleteButton.disabled = false;
    }
  });
  const actions = document.createElement("div");
  actions.className = "record-actions";
  actions.append(favoriteButton, deleteButton);
  item.append(content, actions);
  return item;
}

async function loadHistory() {
  const requestId = ++historyRequestId;
  const params = historyFilters();
  params.set("page", String(page));
  params.set("limit", "10");
  historyList.setAttribute("aria-busy", "true");
  try {
    const data = await request(`/api/history?${params}`);
    if (requestId !== historyRequestId) return;
    pages = Math.max(1, Math.ceil(data.total / data.limit));
    if (page > pages) {
      page = pages;
      await loadHistory();
      return;
    }
    historyMessage.textContent = "";
    historyList.replaceChildren(...data.items.map(renderRecord));
    document.querySelector("#history-count").textContent = data.total;
    document.querySelector("#history-empty").hidden = data.items.length !== 0;
    document.querySelector("#empty-title").textContent = searchInput.value.trim() ? "没有匹配记录" : (favoritesOnly.checked ? "暂无收藏记录" : "暂无历史记录");
    document.querySelector("#pagination").hidden = pages <= 1;
    document.querySelector("#page-info").textContent = `${page} / ${pages}`;
    document.querySelector("#previous-page").disabled = page <= 1;
    document.querySelector("#next-page").disabled = page >= pages;
  } catch (error) {
    if (requestId !== historyRequestId) return;
    historyMessage.textContent = error.message;
    document.querySelector("#history-empty").hidden = true;
  } finally {
    if (requestId === historyRequestId) historyList.setAttribute("aria-busy", "false");
  }
}

document.querySelector(".keypad").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.value !== undefined) insertText(button.dataset.value);
  if (button.dataset.action === "clear") clearExpression();
  if (button.dataset.action === "backspace") backspace();
  if (button.dataset.action === "calculate") submitCalculation();
});
expressionInput.addEventListener("input", expressionChanged);
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  if (event.target === searchInput || event.target === favoritesOnly || event.target instanceof HTMLSelectElement) return;
  if (event.key === "Escape") { event.preventDefault(); clearExpression(); return; }
  if (event.target instanceof HTMLButtonElement && ["Enter", " "].includes(event.key)) return;
  if (event.key === "Enter" || event.key === "=") { event.preventDefault(); submitCalculation(); return; }
  if (event.target === expressionInput) return;
  if (/^[0-9.+\-*/()×÷]$/.test(event.key)) { event.preventDefault(); insertText(event.key); }
  if (event.key === "Backspace") { event.preventDefault(); backspace(); }
});
document.querySelector("#refresh-history").addEventListener("click", loadHistory);
exportButton.addEventListener("click", exportHistory);
const themeSelect = document.querySelector("#theme-mode");
themeSelect.value = window.CALCULATOR_THEME.mode;
themeSelect.addEventListener("change", () => window.CALCULATOR_THEME.setMode(themeSelect.value));
favoritesOnly.addEventListener("change", () => {
  clearTimeout(searchTimer);
  page = 1;
  loadHistory();
});
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  // Invalidate an earlier response immediately, before the debounce delay ends.
  historyRequestId += 1;
  searchTimer = setTimeout(() => { page = 1; loadHistory(); }, 250);
});
document.querySelector("#previous-page").addEventListener("click", () => { if (page > 1) { page -= 1; loadHistory(); } });
document.querySelector("#next-page").addEventListener("click", () => { if (page < pages) { page += 1; loadHistory(); } });
loadHistory();
