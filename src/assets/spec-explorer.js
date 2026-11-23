/* Local-file compatible; the generated HTML remains readable without JavaScript. */
(() => {
  const root = document.querySelector('[data-spec-explorer]');
  if (!root) return;
  const screens = [...root.querySelectorAll('.screen-spec')];
  const links = [...root.querySelectorAll('[data-screen-link]')];
  const search = root.querySelector('#spec-search');
  const role = root.querySelector('#spec-role');
  const count = root.querySelector('.spec-count');
  const feedback = root.querySelector('.spec-feedback');
  const empty = root.querySelector('.spec-empty');
  let selected = screens[0]?.id;
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  function render() {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    const matches = screens.filter(screen => (!role.value || screen.dataset.role === role.value)
      && words.every(word => normalize(screen.dataset.search).includes(word)));
    if (!matches.some(screen => screen.id === selected)) selected = matches[0]?.id;
    screens.forEach(screen => { screen.hidden = screen.id !== selected; });
    links.forEach(link => {
      link.hidden = !matches.some(screen => screen.id === link.dataset.screenLink);
      if (link.dataset.screenLink === selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    root.querySelectorAll('[data-screen-group]').forEach(group => {
      group.hidden = ![...group.querySelectorAll('a')].some(link => !link.hidden);
    });
    empty.hidden = matches.length > 0;
    count.textContent = `${matches.length} / ${screens.length}개 화면`;
  }
  function fromHash() {
    const target = screens.find(screen => '#' + screen.id === location.hash);
    if (target) {
      selected = target.id;
      search.value = '';
      role.value = '';
    }
    render();
    if (target) requestAnimationFrame(() => target.scrollIntoView({block: 'start', behavior: 'instant'}));
  }
  root.classList.add('is-enhanced');
  search.addEventListener('input', render);
  role.addEventListener('change', render);
  root.querySelector('[data-clear-search]').addEventListener('click', () => {
    search.value = ''; role.value = ''; render(); search.focus();
  });
  links.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    selected = link.dataset.screenLink;
    history.pushState(null, '', '#' + selected);
    render();
    const heading = document.getElementById(selected).querySelector('h2');
    heading.focus({preventScroll: true});
    document.getElementById(selected).scrollIntoView({block: 'start', behavior: 'instant'});
    feedback.textContent = '';
  }));
  window.addEventListener('hashchange', fromHash);
  root.querySelectorAll('[data-copy-link]').forEach(link => link.addEventListener('click', async event => {
    event.preventDefault();
    const url = new URL(location.href);
    url.hash = link.hash;
    try {
      await navigator.clipboard.writeText(url.href);
      feedback.textContent = '이 화면의 명세 링크를 복사했습니다.';
    } catch {
      history.pushState(null, '', url.hash);
      feedback.textContent = '주소창의 주소를 복사하면 이 화면으로 바로 이동할 수 있습니다.';
    }
  }));
  fromHash();
})();
