const STORAGE_KEY = "twitter-card-maker-state-v3";

const defaults = {
  layoutPreset: "default",
  name: "이름",
  handle: "@twitter_id",
  oneLiner: "한마디",
  intro: "젠더 나이 / 사용하는 닉네임\n팔로우 관련 사항 (FUB Free, 구독 안 받습니다, 이별 블언블 등등)\n5~6줄까지가 적당합니다.",
  ng: "곤란한 것을 서술합니다.\n대처방법도 적습니다. (단뮤, 계정 뮤트, 직멘 시 블락 등)\5~6줄까지가 적당합니다.",
  tagDescription: "여기부터는 성향 관련 자유 설명란입니다.\n5~6줄까지가 적당합니다.",
  freeText: "하고 싶은 말을 적습니다.",
  accentColor: "#6383d7",
  cardBg: "#ffffff",
  textColor: "#000000",
  mutedColor: "#000000",
  bubbleColor: "#d9d9d9",
  oneLinerColor: "#000000",
  nameColor: "#000000",
  headingColor: "#000000",
  lineColor: "#cfcfcf",
  fontFamily: "'Asta Sans', 'Noto Sans KR', system-ui, sans-serif",
  tagSource: "수제 트훔 탐대 폭트 알티 마음 구독\n일상 덕질 욕트 섹트 고어 우울 기타\n자캐 커뮤 티알 드림 2D 2.5D 3D\n글 그림 디자인 수공예 소비 기타\nALL HL GL BL 리버시블 NCP",
  enabledTags: ["수제", "탐대", "마음", "덕질", "자캐", "드림", "그림", "소비", "ALL", "BL"],
  imageCount: 3,
  avatar: { src: "", crop: { x: 50, y: 50, zoom: 100 } },
  images: [
    { src: "", caption: "이미지 설명", crop: { x: 50, y: 50, zoom: 100 } },
    { src: "", caption: "이미지 설명", crop: { x: 50, y: 50, zoom: 100 } },
    { src: "", caption: "이미지 설명", crop: { x: 50, y: 50, zoom: 100 } },
  ],
};

let state = loadState();

const $ = (id) => document.getElementById(id);
const textFields = ["name", "handle", "oneLiner", "intro", "ng", "tagDescription", "freeText"];
const colorFields = ["accentColor", "cardBg", "textColor", "bubbleColor", "oneLinerColor", "nameColor", "headingColor", "lineColor"];
const styleFields = ["layoutPreset", "fontFamily"];
const imageSlots = [538, 761, 984];
const layoutPresets = {
  default: { label: "기본 가로형", width: 1200, height: 675 },
  extended: { label: "기본 가로형(확장)", width: 1200, height: 800 },
};
let previewZoom = 1;
let previewPanX = 0;
let previewPanY = 0;
let activePreviewDrag = null;
let activeCropNavigator = null;
let activeCropPointerId = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return mergeState(saved);
  } catch {
    return clone(defaults);
  }
}

function mergeState(saved) {
  const base = clone(defaults);
  if (!saved || typeof saved !== "object") return base;
  const merged = {
    ...base,
    ...saved,
    avatar: { ...base.avatar, ...saved.avatar, crop: { ...base.avatar.crop, ...(saved.avatar?.crop || {}) } },
    images: base.images.map((image, index) => ({
      ...image,
      ...(saved.images?.[index] || {}),
      crop: { ...image.crop, ...(saved.images?.[index]?.crop || {}) },
    })),
  };
  merged.images.forEach((image) => {
    if (["대표 이미지", "좋아하는 것", "최근 관심사"].includes(image.caption)) {
      image.caption = "이미지 설명";
    }
  });
  merged.bubbleColor = saved.bubbleColor || saved.panelColor || base.bubbleColor;
  if (saved.fontFamily === "'Pretendard', 'Noto Sans KR', system-ui, sans-serif") {
    merged.fontFamily = base.fontFamily;
  }
  ["name", "handle", "oneLiner", "intro", "ng", "tagDescription", "freeText"].forEach((id) => {
    merged[id] = cleanDefaultNotice(merged[id]);
  });
  return merged;
}

function cleanDefaultNotice(value) {
  const notice = ["레이아웃", "변경을 통해", "더 늘려도 됩니다."].join(" ");
  return String(value || "").replaceAll(`\n${notice}`, "").replaceAll(notice, "");
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setCssVars() {
  const root = document.documentElement;
  const layout = getLayoutPreset();
  root.style.setProperty("--accent", state.accentColor);
  root.style.setProperty("--card-bg", state.cardBg);
  root.style.setProperty("--card-text", state.textColor);
  root.style.setProperty("--muted", state.mutedColor);
  root.style.setProperty("--bubble", state.bubbleColor);
  root.style.setProperty("--one-liner", state.oneLinerColor);
  root.style.setProperty("--name-color", state.nameColor);
  root.style.setProperty("--heading", state.headingColor);
  root.style.setProperty("--line", state.lineColor);
  root.style.setProperty("--card-width", `${layout.width}px`);
  root.style.setProperty("--card-height", `${layout.height}px`);
  $("card").classList.toggle("layout-extended", state.layoutPreset === "extended");
  $("card").style.fontFamily = state.fontFamily;
}

function getLayoutPreset() {
  return layoutPresets[state.layoutPreset] || layoutPresets.default;
}

function getPreviewFitScale(layout) {
  const shell = document.querySelector(".preview-shell");
  if (!shell) return 1;
  const availableWidth = Math.max(1, shell.clientWidth - 54);
  const availableHeight = Math.max(240, window.innerHeight - 150);
  return Math.min(1, availableWidth / layout.width, availableHeight / layout.height);
}

function imageStyle(crop) {
  return `object-position:${crop.x}% ${crop.y}%; transform:scale(${crop.zoom / 100}); transform-origin:${crop.x}% ${crop.y}%;`;
}

function renderCard() {
  setCssVars();
  $("namePreview").textContent = state.name || defaults.name;
  $("handlePreview").textContent = state.handle || defaults.handle;
  $("oneLinerPreview").textContent = state.oneLiner || defaults.oneLiner;
  $("introPreview").textContent = state.intro || defaults.intro;
  $("ngPreview").textContent = state.ng || defaults.ng;
  $("tagDescriptionPreview").textContent = state.tagDescription || defaults.tagDescription;
  $("freePreview").textContent = state.freeText || defaults.freeText;

  const avatar = $("avatarPreview");
  const avatarPlaceholder = $("avatarPlaceholder");
  avatar.src = state.avatar.src || "";
  avatar.style.cssText = state.avatar.src ? imageStyle(state.avatar.crop) : "";
  avatar.hidden = !state.avatar.src;
  avatarPlaceholder.hidden = Boolean(state.avatar.src);

  const imageStack = $("imageStack");
  imageStack.className = `image-stack count-${state.imageCount}`;
  imageStack.innerHTML = "";
  state.images.slice(0, state.imageCount).forEach((image, index) => {
    const tile = document.createElement("div");
    tile.className = "image-tile";
    tile.style.left = `${imageSlots[index]}px`;
    tile.innerHTML = image.src
      ? `<div class="image-frame"><img alt="" src="${image.src}" style="${imageStyle(image.crop)}"></div><div class="image-caption"></div>`
      : `<div class="image-frame"><div class="image-placeholder"></div></div><div class="image-caption"></div>`;
    tile.querySelector(".image-caption").textContent = image.caption || defaults.images[index].caption;
    imageStack.appendChild(tile);
  });

  const tagLines = parseTagLineItems();
  $("tagPreview").innerHTML = "";
  tagLines.forEach((line) => {
    const row = document.createElement("div");
    row.className = "tag-row";
    line.forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = `tag-pill ${state.enabledTags.includes(tag.key) ? "is-on" : ""}`;
      pill.textContent = tag.label;
      row.appendChild(pill);
    });
    $("tagPreview").appendChild(row);
  });
}

function renderInputs() {
  [...textFields, ...styleFields].forEach((id) => {
    $(id).value = state[id];
  });
  document.querySelector(".layout-label").textContent = getLayoutPreset().label;
  renderColorControls();
  document.querySelectorAll("[data-count]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.count) === state.imageCount);
  });
  renderImageInputs();
  renderCropNavigators();
  renderTagToggles();
}

function renderImageInputs() {
  const host = $("imageInputs");
  host.innerHTML = "";
  state.images.slice(0, state.imageCount).forEach((image, index) => {
    const block = document.createElement("div");
    block.className = "image-editor";
    block.innerHTML = `
      <h3>우상단 이미지 ${index + 1}</h3>
      <label class="file-drop">
        이미지 선택
        <input type="file" accept="image/*" data-image-file="${index}">
      </label>
      <label>이미지 설명 <input type="text" data-image-caption="${index}" value="${escapeAttr(image.caption)}"></label>
      <div class="crop-navigator" data-crop-for="image-${index}" role="button" tabindex="0">
        <img alt="" class="crop-nav-image">
        <span class="crop-nav-empty">이미지 선택</span>
        <span class="crop-nav-cross"></span>
      </div>
      <label class="zoom-control">줌 <input type="range" min="100" max="220" data-zoom-for="image-${index}"></label>
    `;
    host.appendChild(block);
  });
  renderCropNavigators();
}

function renderCropNavigators() {
  document.querySelectorAll("[data-crop-for]").forEach((navigator) => {
    const target = getCropTarget(navigator.dataset.cropFor);
    const image = navigator.querySelector(".crop-nav-image");
    const empty = navigator.querySelector(".crop-nav-empty");
    if (!target || !image || !empty) return;
    image.src = target.src || "";
    image.style.cssText = target.src ? imageStyle(target.crop) : "";
    image.hidden = !target.src;
    empty.hidden = Boolean(target.src);
  });
  document.querySelectorAll("[data-zoom-for]").forEach((input) => {
    const target = getCropTarget(input.dataset.zoomFor);
    if (target) input.value = target.crop.zoom;
  });
}

function renderColorControls() {
  colorFields.forEach((id) => {
    const color = normalizeHex(state[id] || defaults[id] || "#000000");
    state[id] = color;
    document.querySelectorAll(`[data-color-swatch="${id}"]`).forEach((swatch) => {
      swatch.style.backgroundColor = color;
    });
    document.querySelectorAll(`[data-color-hex="${id}"]`).forEach((input) => {
      input.value = color;
    });
    document.querySelectorAll(`[data-color-picker="${id}"]`).forEach((input) => {
      input.value = color;
    });
  });
}

function normalizeHex(value) {
  const raw = String(value || "").trim();
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return "#000000";
}

function isHexColor(value) {
  return /^#?[0-9a-fA-F]{3}$/.test(String(value || "").trim()) || /^#?[0-9a-fA-F]{6}$/.test(String(value || "").trim());
}

function parseTags() {
  return parseTagLineItems().flat().map((tag) => tag.key);
}

function parseTagLines() {
  return state.tagSource
    .split(/\n/)
    .map((line) => line.split(/[,，\s]+/).map((tag) => tag.trim()).filter(Boolean))
    .filter((line) => line.length);
}

function parseTagLineItems() {
  const lines = parseTagLines();
  const totals = new Map();
  lines.flat().forEach((tag) => totals.set(tag, (totals.get(tag) || 0) + 1));
  const seen = new Map();
  return lines.map((line) => line.map((label) => {
    const count = (seen.get(label) || 0) + 1;
    seen.set(label, count);
    return {
      label,
      key: totals.get(label) > 1 ? `${label}#${count}` : label,
    };
  }));
}

function renderTagToggles() {
  const tags = parseTagLineItems().flat();
  const tagKeys = tags.map((tag) => tag.key);
  state.enabledTags = state.enabledTags.filter((tag) => tagKeys.includes(tag));
  const host = $("tagToggles");
  host.innerHTML = "";
  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-toggle ${state.enabledTags.includes(tag.key) ? "is-on" : ""}`;
    button.textContent = tag.label;
    button.addEventListener("click", () => {
      if (state.enabledTags.includes(tag.key)) {
        state.enabledTags = state.enabledTags.filter((item) => item !== tag.key);
      } else {
        state.enabledTags.push(tag.key);
      }
      render();
      persist();
    });
    host.appendChild(button);
  });
}

function escapeAttr(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function render() {
  renderCard();
  renderInputs();
  fitPreview();
}

function bindInputs() {
  textFields.forEach((id) => {
    $(id).addEventListener("input", (event) => {
      state[id] = event.target.value;
      renderCard();
      persist();
    });
  });

  styleFields.forEach((id) => {
    $(id).addEventListener("input", (event) => {
      state[id] = event.target.value;
      renderCard();
      if (id === "layoutPreset") {
        previewPanX = 0;
        previewPanY = 0;
        resetPreviewSize();
        requestAnimationFrame(() => {
          resetPreviewSize();
          fitPreview();
          requestAnimationFrame(fitPreview);
        });
      }
      persist();
    });
  });

  $("previewZoom").addEventListener("input", (event) => {
    previewZoom = Math.max(1, Number(event.target.value) / 100);
    fitPreview();
  });

  $("cardViewport").addEventListener("pointerdown", (event) => {
    if (previewZoom <= 1) return;
    event.preventDefault();
    activePreviewDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: previewPanX,
      panY: previewPanY,
    };
    $("cardViewport").setPointerCapture(event.pointerId);
  });

  $("cardViewport").addEventListener("pointermove", (event) => {
    if (!activePreviewDrag || event.pointerId !== activePreviewDrag.pointerId) return;
    previewPanX = activePreviewDrag.panX + event.clientX - activePreviewDrag.startX;
    previewPanY = activePreviewDrag.panY + event.clientY - activePreviewDrag.startY;
    fitPreview();
  });

  ["pointerup", "pointercancel"].forEach((type) => {
    $("cardViewport").addEventListener(type, (event) => {
      if (activePreviewDrag?.pointerId === event.pointerId) activePreviewDrag = null;
    });
  });

  document.body.addEventListener("click", (event) => {
    const swatch = event.target.closest("[data-color-swatch]");
    if (!swatch) return;
    const picker = document.querySelector(`[data-color-picker="${swatch.dataset.colorSwatch}"]`);
    if (!picker) return;
    try {
      if (typeof picker.showPicker === "function") {
        picker.showPicker();
      } else {
        picker.click();
      }
    } catch {
      picker.click();
    }
  });

  document.body.addEventListener("pointerdown", (event) => {
    const navigator = event.target.closest("[data-crop-for]");
    if (!navigator) return;
    event.preventDefault();
    activeCropNavigator = navigator;
    activeCropPointerId = event.pointerId;
    updateCropFromNavigator(navigator, event);
  });

  document.body.addEventListener("pointermove", (event) => {
    if (!activeCropNavigator || event.pointerId !== activeCropPointerId) return;
    updateCropFromNavigator(activeCropNavigator, event);
  });

  document.body.addEventListener("pointerup", (event) => {
    if (event.pointerId === activeCropPointerId) {
      activeCropNavigator = null;
      activeCropPointerId = null;
    }
  });

  document.body.addEventListener("pointercancel", (event) => {
    if (event.pointerId === activeCropPointerId) {
      activeCropNavigator = null;
      activeCropPointerId = null;
    }
  });

  document.querySelectorAll("[data-count]").forEach((button) => {
    button.addEventListener("click", () => {
      state.imageCount = Number(button.dataset.count);
      render();
      persist();
    });
  });

  $("avatarInput").addEventListener("change", (event) => readImage(event.target.files[0], (src) => {
    state.avatar.src = src;
    renderCard();
    renderCropNavigators();
    persist();
  }));

  document.body.addEventListener("input", (event) => {
    const captionInput = event.target.closest("[data-image-caption]");
    if (captionInput) {
      state.images[Number(captionInput.dataset.imageCaption)].caption = captionInput.value;
      renderCard();
      persist();
    }

    const colorInput = event.target.closest("[data-color-picker]");
    if (colorInput) updateColor(colorInput);

    const zoomInput = event.target.closest("[data-zoom-for]");
    if (zoomInput) updateZoom(zoomInput);
  });

  document.body.addEventListener("change", (event) => {
    const colorHexInput = event.target.closest("[data-color-hex]");
    if (colorHexInput) updateColor(colorHexInput);

    const fileInput = event.target.closest("[data-image-file]");
    if (!fileInput) return;
    const index = Number(fileInput.dataset.imageFile);
    readImage(fileInput.files[0], (src) => {
      state.images[index].src = src;
      renderCard();
      renderCropNavigators();
      persist();
    });
  });
}

function getCropTarget(key) {
  return key === "avatar" ? state.avatar : state.images[Number(key.replace("image-", ""))];
}

function updateCropFromNavigator(navigator, event) {
  const target = getCropTarget(navigator.dataset.cropFor);
  if (!target?.src) return;
  const rect = navigator.getBoundingClientRect();
  target.crop.x = clamp(Math.round(((event.clientX - rect.left) / rect.width) * 100), 0, 100);
  target.crop.y = clamp(Math.round(((event.clientY - rect.top) / rect.height) * 100), 0, 100);
  renderCropNavigators();
  renderCard();
  persist();
}

function updateZoom(input) {
  const target = getCropTarget(input.dataset.zoomFor);
  if (!target?.src) return;
  target.crop.zoom = Number(input.value);
  renderCropNavigators();
  renderCard();
  persist();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateColor(input) {
  const id = input.dataset.colorPicker || input.dataset.colorHex;
  if (!isHexColor(input.value)) {
    renderColorControls();
    return;
  }
  const color = normalizeHex(input.value);
  state[id] = color;
  renderColorControls();
  renderCard();
  persist();
}

function readImage(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportImage(type) {
  try {
    if (!window.htmlToImage) {
      alert("이미지 저장 라이브러리를 불러오지 못했습니다.");
      return;
    }
    if (document.fonts?.ready) await document.fonts.ready;
    const card = $("card");
    const layout = getLayoutPreset();
    const options = {
      width: layout.width,
      height: layout.height,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: state.cardBg,
      style: {
        transform: "none",
      },
    };
    const blob = type === "image/png"
      ? await htmlToImage.toBlob(card, options)
      : await dataUrlToBlob(await htmlToImage.toJpeg(card, { ...options, quality: 0.92 }));
    if (!blob) {
      alert("이미지 저장에 실패했습니다.");
      return;
    }
    download(`twitter-card.${type === "image/png" ? "png" : "jpg"}`, blob);
  } catch (error) {
    console.error(error);
    alert("이미지 저장에 실패했습니다.");
  }
}

async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

function bindActions() {
  $("saveJson").addEventListener("click", () => {
    download("twitter-card.json", new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
  });

  $("loadJson").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = mergeState(JSON.parse(reader.result));
        render();
        persist();
      } catch {
        alert("JSON 파일을 불러오지 못했습니다.");
      }
    };
    reader.readAsText(file);
  });

  $("savePng").addEventListener("click", () => exportImage("image/png"));
  $("saveJpg").addEventListener("click", () => exportImage("image/jpeg"));

  $("resetAll").addEventListener("click", () => {
    if (!confirm("입력한 내용을 모두 초기화할까요?")) return;
    state = clone(defaults);
    localStorage.removeItem(STORAGE_KEY);
    render();
  });
}

function fitPreview() {
  const shell = document.querySelector(".preview-shell");
  const viewport = $("cardViewport");
  if (!shell || !viewport) return;
  const layout = getLayoutPreset();
  const fitScale = getPreviewFitScale(layout);
  const scale = fitScale * previewZoom;
  const scaledWidth = layout.width * scale;
  const scaledHeight = layout.height * scale;
  const baseWidth = layout.width * fitScale;
  const baseHeight = layout.height * fitScale;
  const maxPanX = Math.max(0, (scaledWidth - baseWidth) / 2);
  const maxPanY = Math.max(0, (scaledHeight - baseHeight) / 2);
  previewPanX = clamp(previewPanX, -maxPanX, maxPanX);
  previewPanY = clamp(previewPanY, -maxPanY, maxPanY);
  if (previewZoom <= 1) {
    previewPanX = 0;
    previewPanY = 0;
  }
  viewport.style.transform = `translate(${previewPanX}px, ${previewPanY}px) scale(${scale})`;
  viewport.style.width = `${layout.width}px`;
  viewport.style.height = `${layout.height}px`;
  shell.style.height = `${layout.height * fitScale + 8}px`;
  shell.style.maxWidth = `${layout.width * fitScale + 54}px`;
}

function resetPreviewSize() {
  const shell = document.querySelector(".preview-shell");
  const viewport = $("cardViewport");
  if (!shell || !viewport) return;
  shell.style.height = "";
  shell.style.maxWidth = "";
  viewport.style.transform = "none";
}

window.addEventListener("resize", fitPreview);

bindInputs();
bindActions();
render();
