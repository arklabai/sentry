/**
 * Sentry AI Interactive Element Zapper
 * Allows point-and-click removal of invasive DOM tracking elements, banners, and AI widgets.
 */

(function () {
  'use strict';

  let active = false;
  let hoveredElement: HTMLElement | null = null;
  let overlay: HTMLDivElement | null = null;
  let badge: HTMLDivElement | null = null;

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'sentry-zapper-overlay';
    overlay.style.position = 'fixed';
    overlay.style.pointerEvents = 'none';
    overlay.style.border = '2px solid #ef4444';
    overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
    overlay.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
    overlay.style.zIndex = '2147483647';
    overlay.style.transition = 'all 0.05s ease-out';
    overlay.style.display = 'none';

    badge = document.createElement('div');
    badge.id = 'sentry-zapper-badge';
    badge.style.position = 'absolute';
    badge.style.bottom = '100%';
    badge.style.left = '0';
    badge.style.backgroundColor = '#0f172a';
    badge.style.color = '#ef4444';
    badge.style.border = '1px solid #ef4444';
    badge.style.borderRadius = '4px';
    badge.style.padding = '2px 8px';
    badge.style.fontSize = '12px';
    badge.style.fontFamily = 'monospace';
    badge.style.fontWeight = 'bold';
    badge.style.whiteSpace = 'nowrap';
    badge.style.marginBottom = '4px';
    badge.textContent = 'ZAP TARGET (Click to Purge | ESC to Exit)';

    overlay.appendChild(badge);
    document.body.appendChild(overlay);
  }

  function onMouseMove(e: MouseEvent) {
    if (!active) return;
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (target && target !== overlay && target !== badge && target !== document.body) {
      hoveredElement = target;
      const rect = target.getBoundingClientRect();
      if (overlay) {
        overlay.style.display = 'block';
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
      }
    }
  }

  function onClick(e: MouseEvent) {
    if (!active || !hoveredElement) return;
    e.preventDefault();
    e.stopPropagation();

    // Zap element
    const tagName = hoveredElement.tagName.toLowerCase();
    const id = hoveredElement.id ? `#${hoveredElement.id}` : '';
    const className = hoveredElement.className && typeof hoveredElement.className === 'string'
      ? `.${hoveredElement.className.trim().split(/\s+/).join('.')}`
      : '';
    const selectorDesc = `${tagName}${id}${className}`.slice(0, 40);

    hoveredElement.remove();

    try {
      chrome.runtime.sendMessage({
        action: 'RECORD_THREAT',
        payload: {
          type: 'zapper',
          detail: `Element zapped: <${selectorDesc}>`,
          domain: window.location.host,
          timestamp: Date.now(),
        },
      });
    } catch {
      // Ignore
    }

    stopZapper();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      stopZapper();
    }
  }

  function startZapper() {
    active = true;
    createOverlay();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = 'crosshair';
  }

  function stopZapper() {
    active = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = 'default';
    if (overlay) {
      overlay.remove();
      overlay = null;
      badge = null;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'ACTIVATE_ZAPPER') {
      startZapper();
      sendResponse({ status: 'ok' });
    }
  });
})();
export {};
