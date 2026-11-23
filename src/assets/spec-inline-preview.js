/* Reuse the storage-isolated preview entries; only one preview runs at a time. */
(() => {
  const root = document.querySelector('[data-spec-explorer]');
  if (!root) return;
  const details = [...root.querySelectorAll('.state-detail')];
  let active = null;
  let expected = '';
  let run = 0;
  let timer;
  const frameOf = detail => detail.querySelector('[data-preview-src]');
  const statusOf = detail => detail.querySelector('.inline-preview-status');
  function stop() {
    clearTimeout(timer);
    if (active) {
      const frame = frameOf(active);
      frame.style.visibility = 'hidden';
      frame.src = 'about:blank';
    }
    active = null;
    expected = '';
  }
  function start(detail, reset = false) {
    if (detail === active && !reset) return;
    stop();
    if (!detail) return;
    active = detail;
    const frame = frameOf(detail);
    const url = new URL(frame.dataset.previewSrc, location.href);
    url.searchParams.set('previewRun', String(++run));
    expected = url.href;
    statusOf(detail).textContent = '선택한 상태를 불러오는 중…';
    frame.style.visibility = 'hidden';
    frame.src = expected;
    timer = setTimeout(() => {
      if (active === detail) statusOf(detail).textContent = '미리보기를 불러오지 못했습니다. 처음 상태로 다시 시도하거나 새 창에서 열어 주세요.';
    }, 12000);
  }
  function sync() {
    start(details.find(detail => detail.open && !detail.closest('.screen-spec').hidden) || null);
  }
  for (const detail of details) {
    detail.addEventListener('toggle', () => {
      if (detail.open && !detail.closest('.screen-spec').hidden) {
        for (const other of details) {
          if (other !== detail && other.closest('.screen-spec') === detail.closest('.screen-spec')) other.open = false;
        }
      }
      sync();
    });
    detail.querySelector('[data-preview-reset]').addEventListener('click', () => start(detail, true));
  }
  // Screen selection/search changes hidden without loading hidden screen fixtures.
  new MutationObserver(sync).observe(root, {subtree: true, attributes: true, attributeFilter: ['hidden']});
  window.addEventListener('message', event => {
    if (!active || event.source !== frameOf(active).contentWindow || event.origin !== location.origin
      || event.data?.type !== 'reeltrip-preview-status') return;
    let current;
    try { current = new URL(event.data.url); } catch { return; }
    const target = new URL(expected);
    if (current.origin !== target.origin || current.pathname !== target.pathname || current.search !== target.search) return;
    clearTimeout(timer);
    const ready = event.data.ready === true;
    frameOf(active).style.visibility = ready ? 'visible' : 'hidden';
    statusOf(active).textContent = !ready ? '화면을 불러오지 못했습니다. 처음 상태로 다시 시도해 주세요.'
      : current.hash !== target.hash ? '다른 화면으로 이동했습니다. 처음 상태로 되돌릴 수 있습니다.'
      : event.data.changed ? '조작한 상태입니다. 처음 상태로 되돌려 다시 확인할 수 있습니다.'
      : '선택한 상태 표시 중 · 기존 체험 데이터와 분리된 미리보기';
  });
  sync();
})();
