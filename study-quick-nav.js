/* 2026-11-19 KST — existing word app / 800 sentences / daily conversation quick navigation.
   Does not modify any lesson content or storage records. */
(function () {
  'use strict';
  if (document.getElementById('study-quick-nav')) return;

  const filename = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const current = filename === 'travel-conversation.html' ? 'sentences'
    : filename === 'travel-daily-conversation.html' ? 'conversation' : 'words';
  const tabs = [
    { id: 'words',        title: '기존 단어',  icon: '📚', link: './index.html' },
    { id: 'sentences',    title: '800문장',    icon: '📘', link: './travel-conversation.html' },
    { id: 'conversation', title: '실전 회화',  icon: '🗣️', link: './travel-daily-conversation.html' }
  ];
  const css = `
    body.study-tabs-words .app{padding-bottom:calc(78px + env(safe-area-inset-bottom,0px))!important}
    body.study-tabs-other{padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}
    nav.study-quick-nav{box-sizing:border-box;position:fixed;left:50%;bottom:0;transform:translateX(-50%);
      width:100%;max-width:700px;z-index:9995;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
      gap:7px;margin:0;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));
      background:#ffffffed;border:1px solid #d9e2ed;border-bottom:0;border-radius:17px 17px 0 0;
      box-shadow:0 -6px 23px #101b3426;backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);
      font:inherit;line-height:1.25}
    nav.study-quick-nav a{box-sizing:border-box;min-height:54px;display:flex;flex-direction:column;justify-content:center;
      align-items:center;gap:3px;padding:5px 2px;border:1px solid transparent;border-radius:12px;
      background:transparent;color:#4b5b70;text-align:center;text-decoration:none;font-size:12px;font-weight:780;
      -webkit-tap-highlight-color:transparent;touch-action:manipulation;white-space:nowrap}
    nav.study-quick-nav a .study-tab-icon{font-size:19px;line-height:1}
    nav.study-quick-nav a[aria-current="page"]{background:#e8f0ff;color:#123c83;border-color:#c5d8fa}
    nav.study-quick-nav a:focus-visible{outline:3px solid #4b94ea;outline-offset:1px}
    body.study-tabs-words nav.study-quick-nav{background:#201611f5;border-color:#5f463a;box-shadow:0 -4px 20px #0009}
    body.study-tabs-words nav.study-quick-nav a{color:#ead3c6}
    body.study-tabs-words nav.study-quick-nav a[aria-current="page"]{background:#653921;color:#fff3e6;border-color:#ac6747}
    @media(min-width:760px){nav.study-quick-nav{border-radius:16px 16px 0 0}}
    @media print{nav.study-quick-nav{display:none!important}}
  `;
  const style = document.createElement('style');
  style.id = 'study-quick-nav-style';
  style.textContent = css;
  document.head.append(style);

  document.body.classList.add(current === 'words' ? 'study-tabs-words' : 'study-tabs-other');
  const nav = document.createElement('nav');
  nav.id = 'study-quick-nav';
  nav.className = 'study-quick-nav';
  nav.setAttribute('aria-label', '학습 화면 빠른 전환');
  tabs.forEach((tab) => {
    const a = document.createElement('a');
    a.href = tab.link;
    a.setAttribute('aria-label', tab.title + (current === tab.id ? ' · 현재 화면' : '으로 이동'));
    if (tab.id === current) a.setAttribute('aria-current', 'page');
    const emoji = document.createElement('span');
    emoji.className = 'study-tab-icon';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = tab.icon;
    const title = document.createElement('span');
    title.textContent = tab.title;
    a.append(emoji, title);
    a.addEventListener('click', (ev) => {
      if (current === tab.id) { ev.preventDefault(); return; }
      // Existing word app uses this to restore the lesson after returning.
      if (current === 'words') {
        try { if (typeof rememberRoute === 'function') rememberRoute(); } catch (_) {}
        try { if (typeof stopSpeech === 'function') stopSpeech(); } catch (_) {}
      }
      try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (_) {}
    });
    nav.append(a);
  });
  document.body.append(nav);

  // The existing Friends -> vocabulary return shortcut must not be covered by the new tabs.
  if (current === 'words' && new URLSearchParams(location.search).has('friendWord')) {
    document.querySelectorAll('button').forEach((button) => {
      if (button.textContent && button.textContent.includes('여행회화 학습으로 돌아가기')) {
        button.style.bottom = 'calc(88px + env(safe-area-inset-bottom,0px))';
      }
    });
  }
})();
