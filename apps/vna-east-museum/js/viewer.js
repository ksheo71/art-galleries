import { iiifInfoJson } from "./api.js";

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
  let modal = document.getElementById("viewer-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "viewer-modal";
    modal.className = "fixed inset-0 bg-black/95 z-50 hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "High resolution image viewer");
    modal.innerHTML = `
      <button type="button" id="viewer-close" class="absolute top-3 right-3 text-white text-3xl leading-none w-10 h-10 flex items-center justify-center z-10" aria-label="Close viewer">✕</button>
      <div id="viewer-surface" class="w-full h-full"></div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#viewer-close").addEventListener("click", closeViewer);
  }
  return modal;
}

function onKeydown(e) {
  if (e.key === "Escape") closeViewer();
}

/**
 * V&A images are served by a IIIF Image API endpoint, so we try info.json
 * first for true tiled deep-zoom. If that fails we fall back to simple
 * image mode against the large JPEG.
 */
export async function openViewer(imageId) {
  if (!imageId) return;
  savedFocus = document.activeElement;
  const modal = ensureModal();
  const surface = modal.querySelector("#viewer-surface");
  surface.innerHTML = '<div class="text-white text-center pt-24">Loading viewer...</div>';
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onKeydown);

  try {
    await loadOpenSeadragon();
    surface.innerHTML = "";
    viewer = window.OpenSeadragon({
      id: "viewer-surface",
      prefixUrl: OSD_PREFIX,
      tileSources: iiifInfoJson(imageId),
      showNavigationControl: true,
      showFullPageControl: true,
      gestureSettingsTouch: { pinchToZoom: true },
    });
    modal.querySelector("#viewer-close").focus();
  } catch {
    surface.innerHTML = `
      <div class="text-white text-center pt-24">
        <p>Could not load the image viewer.</p>
        <button type="button" class="mt-4 underline" id="viewer-inline-close">Close</button>
      </div>
    `;
    surface.querySelector("#viewer-inline-close").addEventListener("click", closeViewer);
  }
}

export function closeViewer() {
  const modal = document.getElementById("viewer-modal");
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
