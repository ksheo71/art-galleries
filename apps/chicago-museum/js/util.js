export function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function relativeTime(isoString) {
  if (!isoString) return "";
  const then = new Date(isoString);
  const ms = Date.now() - then.getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

const SAFE_TAGS = new Set(["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "a"]);

export function sanitizeDescription(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  walk(template.content);
  return template.innerHTML;
}

function walk(node) {
  const toUnwrap = [];
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 1) {
      const tag = child.tagName.toLowerCase();
      if (!SAFE_TAGS.has(tag)) {
        toUnwrap.push(child);
        continue;
      }
      for (const attr of [...child.attributes]) {
        if (tag === "a" && attr.name === "href" && /^https?:/i.test(attr.value)) continue;
        child.removeAttribute(attr.name);
      }
      if (tag === "a") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }
      walk(child);
    } else if (child.nodeType !== 3) {
      toUnwrap.push(child);
    }
  }
  for (const el of toUnwrap) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }
}
