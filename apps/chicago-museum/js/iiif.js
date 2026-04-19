import { iiifManifestUrl } from "./api.js";

const OSD_SRC = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/openseadragon.min.js";
const OSD_PREFIX = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/";

let osdLoadPromise = null;
let viewer = null;
let savedFocus = null;

function loadOpenSeadragon() {
  if (window.OpenSeadragon) return Promise.resolve();
  if (osdLoadPromise) return osdLoadPromise;
  osdLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = OSD_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load OpenSeadragon"));
    document.head.appendChild(s);
  });
  return osdLoadPromise;
}

function ensureModal() {
  let modal = document.getElementById("iiif-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "iiif-modal";
    modal.className = "fixed inset-0 bg-black/95 z-50 hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "High resolution image viewer");
    modal.innerHTML = `
      <button type="button" id="iiif-close" class="absolute top-3 right-3 text-white text-3xl leading-none w-10 h-10 flex items-center justify-center z-10" aria-label="Close viewer">✕</button>
      <div id="iiif-viewer" class="w-full h-full"></div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#iiif-close").addEventListener("click", closeDeepZoom);
  }
  return modal;
}

function onKeydown(e) {
  if (e.key === "Escape") closeDeepZoom();
}

export async function openDeepZoom(artworkId) {
  savedFocus = document.activeElement;
  const modal = ensureModal();
  const container = modal.querySelector("#iiif-viewer");
  container.innerHTML = '<div class="text-white text-center pt-24">Loading viewer...</div>';
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onKeydown);

  try {
    await loadOpenSeadragon();
    container.innerHTML = "";
    viewer = window.OpenSeadragon({
      id: "iiif-viewer",
      prefixUrl: OSD_PREFIX,
      tileSources: iiifManifestUrl(artworkId),
      showNavigationControl: true,
      showFullPageControl: true,
      gestureSettingsTouch: { pinchToZoom: true },
    });
    modal.querySelector("#iiif-close").focus();
  } catch {
    container.innerHTML = `
      <div class="text-white text-center pt-24">
        <p>Could not load the image viewer.</p>
        <button type="button" class="mt-4 underline" id="iiif-inline-close">Close</button>
      </div>
    `;
    container.querySelector("#iiif-inline-close").addEventListener("click", closeDeepZoom);
  }
}

export function closeDeepZoom() {
  const modal = document.getElementById("iiif-modal");
  if (!modal) return;
  if (viewer) {
    try {
      viewer.destroy();
    } catch {}
    viewer = null;
  }
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onKeydown);
  if (savedFocus && typeof savedFocus.focus === "function") {
    try {
      savedFocus.focus();
    } catch {}
  }
}
