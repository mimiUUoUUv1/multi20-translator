const LANGUAGES = [
  { code: "ja", name: "日本語", en: "Japanese" },
  { code: "en", name: "英語", en: "English" },
  { code: "zh", name: "中国語", en: "Chinese" },
  { code: "ko", name: "韓国語", en: "Korean" },
  { code: "es", name: "スペイン語", en: "Spanish" },
  { code: "fr", name: "フランス語", en: "French" },
  { code: "de", name: "ドイツ語", en: "German" },
  { code: "it", name: "イタリア語", en: "Italian" },
  { code: "pt", name: "ポルトガル語", en: "Portuguese" },
  { code: "ru", name: "ロシア語", en: "Russian" },
  { code: "ar", name: "アラビア語", en: "Arabic" },
  { code: "hi", name: "ヒンディー語", en: "Hindi" },
  { code: "th", name: "タイ語", en: "Thai" },
  { code: "vi", name: "ベトナム語", en: "Vietnamese" },
  { code: "id", name: "インドネシア語", en: "Indonesian" },
  { code: "tr", name: "トルコ語", en: "Turkish" },
  { code: "nl", name: "オランダ語", en: "Dutch" },
  { code: "pl", name: "ポーランド語", en: "Polish" },
  { code: "uk", name: "ウクライナ語", en: "Ukrainian" },
  { code: "el", name: "ギリシャ語", en: "Greek" },
  { code: "sv", name: "スウェーデン語", en: "Swedish" }
];

function defaultRouteForSource(source) {
  return LANGUAGES.map(x => x.code).filter(code => code !== source).slice(0, 20);
}

const els = {
  sourceLang: document.querySelector("#sourceLang"),
  sourceText: document.querySelector("#sourceText"),
  cycles: document.querySelector("#cycles"),
  apiUrl: document.querySelector("#apiUrl"),
  apiKey: document.querySelector("#apiKey"),
  langGrid: document.querySelector("#langGrid"),
  selectedRoute: document.querySelector("#selectedRoute"),
  runBtn: document.querySelector("#runBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  downloadBtn: document.querySelector("#downloadBtn"),
  statusText: document.querySelector("#statusText"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  notice: document.querySelector("#notice"),
  history: document.querySelector("#history"),
  finalText: document.querySelector("#finalText"),
  resultBadge: document.querySelector("#resultBadge"),
  themeBtn: document.querySelector("#themeBtn")
};

let stopRequested = false;
let steps = [];

function langName(code) {
  return LANGUAGES.find(x => x.code === code)?.name ?? code;
}

function getSelectedRoute() {
  return [...els.langGrid.querySelectorAll("input:checked")].map(x => x.value);
}

function renderSourceLanguages() {
  els.sourceLang.innerHTML = "";
  for (const l of LANGUAGES) {
    const option = document.createElement("option");
    option.value = l.code;
    option.textContent = `${l.name} (${l.code})`;
    els.sourceLang.appendChild(option);
  }
  els.sourceLang.value = "ja";
}

function renderLanguageGrid() {
  els.langGrid.innerHTML = LANGUAGES.map(l => `
    <label class="lang-item">
      <input type="checkbox" value="${l.code}">
      <span>${l.name}<small class="muted"> ${l.code}</small></span>
    </label>
  `).join("");

  els.langGrid.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", renderRoute);
  });

  setDefaultRoute();
}

function setDefaultRoute() {
  const source = els.sourceLang.value;
  const selected = defaultRouteForSource(source);
  els.langGrid.querySelectorAll("input").forEach(input => {
    input.checked = selected.includes(input.value);
    input.disabled = input.value === source;
  });
  renderRoute();
}

function renderRoute() {
  const route = getSelectedRoute();
  if (!route.length) {
    els.selectedRoute.innerHTML = "言語が選択されていません。";
    return;
  }
  els.selectedRoute.innerHTML =
    route.map((code, i) => `<span class="route-chip">${i + 1}. ${langName(code)}</span>`).join(" → ") +
    `<div class="hint">復路：${[...route].reverse().map(langName).join(" → ")} → 原文</div>`;
}

function totalSteps() {
  return getSelectedRoute().length * 2 * Math.max(1, Math.min(5, Number(els.cycles.value) || 1));
}

function setProgress(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  els.progressBar.style.width = `${pct}%`;
  els.progressText.textContent = `${done} / ${total}`;
}

function addStep(cycle, direction, from, to, text) {
  steps.push({ cycle, direction, from, to, text });
  const div = document.createElement("div");
  div.className = "step";
  div.innerHTML = `
    <div class="step-head">
      <span>往復 ${cycle} ・ ${direction}</span>
      <span>${langName(from)} → ${langName(to)}</span>
    </div>
    <div class="step-body"></div>`;
  div.querySelector(".step-body").textContent = text;
  els.history.appendChild(div);
  div.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function apiEndpoint() {
  const raw = els.apiUrl.value.trim().replace(/\/+$/, "");
  return `${raw}/translate`;
}

async function translateText(text, source, target) {
  if (source === target) return text;

  const body = {
    q: text,
    source,
    target,
    format: "text"
  };
  const key = els.apiKey.value.trim();
  if (key) body.api_key = key;

  const response = await fetch(apiEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  let data = null;
  try { data = await response.json(); } catch {}

  if (!response.ok) {
    const msg = data?.error || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  if (!data?.translatedText) {
    throw new Error("翻訳APIからtranslatedTextが返りませんでした。");
  }
  return Array.isArray(data.translatedText)
    ? data.translatedText.join("\n")
    : data.translatedText;
}

async function run() {
  const sourceText = els.sourceText.value.trim();
  const sourceLang = els.sourceLang.value;
  const route = getSelectedRoute();
  const cycles = Math.max(1, Math.min(5, Number(els.cycles.value) || 1));

  if (!sourceText) {
    showNotice("原文を入力してください。");
    els.sourceText.focus();
    return;
  }
  if (route.length !== 20) {
    showNotice(`20言語を選択してください。現在は ${route.length} 言語です。`);
    return;
  }
  if (route.includes(sourceLang)) {
    showNotice("原文と同じ言語はルートに含められません。");
    return;
  }

  stopRequested = false;
  steps = [];
  els.history.innerHTML = "";
  els.finalText.value = "";
  els.resultBadge.textContent = "実行中";
  els.notice.classList.add("hidden");
  els.runBtn.disabled = true;
  els.stopBtn.disabled = false;

  const total = totalSteps();
  let done = 0;
  setProgress(0, total);
  els.statusText.textContent = "開始中…";

  let text = sourceText;
  let current = sourceLang;

  try {
    for (let cycle = 1; cycle <= cycles; cycle++) {
      // Forward: source -> each of the 20 languages.
      for (const target of route) {
        if (stopRequested) throw new Error("STOPPED");
        els.statusText.textContent = `往路 ${cycle}/${cycles}：${langName(current)} → ${langName(target)}`;
        text = await translateText(text, current, target);
        addStep(cycle, "往路", current, target, text);
        current = target;
        done++;
        setProgress(done, total);
      }

      // Reverse: 20th language -> ... -> 1st language -> source.
      const reverse = [sourceLang, ...[...route].reverse()];
      for (let i = 0; i < reverse.length - 1; i++) {
        const from = reverse[i + 1];
        const target = reverse[i];
        if (stopRequested) throw new Error("STOPPED");
        els.statusText.textContent = `復路 ${cycle}/${cycles}：${langName(from)} → ${langName(target)}`;
        text = await translateText(text, from, target);
        addStep(cycle, "復路", from, target, text);
        current = target;
        done++;
        setProgress(done, total);
      }
    }

    els.finalText.value = text;
    els.resultBadge.textContent = "完了";
    els.statusText.textContent = "完了";
  } catch (error) {
    if (error.message === "STOPPED") {
      els.resultBadge.textContent = "停止";
      els.statusText.textContent = "停止しました";
    } else {
      els.resultBadge.textContent = "エラー";
      els.statusText.textContent = "エラー";
      showNotice(`翻訳に失敗しました：${error.message}`);
    }
  } finally {
    els.runBtn.disabled = false;
    els.stopBtn.disabled = true;
  }
}

function showNotice(message) {
  els.notice.textContent = message;
  els.notice.classList.remove("hidden");
}

els.sourceLang.addEventListener("change", setDefaultRoute);
els.runBtn.addEventListener("click", run);
els.stopBtn.addEventListener("click", () => {
  stopRequested = true;
  els.statusText.textContent = "停止要求中…";
});
document.querySelector("#defaultBtn").addEventListener("click", setDefaultRoute);
document.querySelector("#clearBtn").addEventListener("click", () => {
  els.langGrid.querySelectorAll("input").forEach(i => i.checked = false);
  renderRoute();
});
els.copyBtn.addEventListener("click", async () => {
  const text = els.finalText.value;
  if (!text) return showNotice("コピーできる結果がありません。");
  try {
    await navigator.clipboard.writeText(text);
    showNotice("最終結果をコピーしました。");
  } catch {
    showNotice("コピーできませんでした。");
  }
});
els.downloadBtn.addEventListener("click", () => {
  if (!steps.length && !els.finalText.value) return showNotice("保存する結果がありません。");
  const lines = [
    `Multi20 逆翻訳`,
    `原文言語: ${langName(els.sourceLang.value)}`,
    `往復回数: ${els.cycles.value}`,
    "",
    `最終結果:`,
    els.finalText.value,
    "",
    `--- 翻訳履歴 ---`,
    ...steps.map((s, i) => `${i + 1}. [往復${s.cycle} ${s.direction}] ${langName(s.from)} → ${langName(s.to)}\n${s.text}\n`)
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "multi20-result.txt";
  a.click();
  URL.revokeObjectURL(a.href);
});
document.querySelector("#collapseBtn").addEventListener("click", (e) => {
  const hidden = els.history.style.display === "none";
  els.history.style.display = hidden ? "" : "none";
  e.currentTarget.textContent = hidden ? "折りたたむ" : "展開";
});
els.themeBtn.addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", dark ? "light" : "dark");
  localStorage.setItem("multi20-theme", dark ? "light" : "dark");
});
if (localStorage.getItem("multi20-theme") === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

renderSourceLanguages();
renderLanguageGrid();
setProgress(0, totalSteps());
