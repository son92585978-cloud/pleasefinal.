/* Real Talk V2 — built on the user's source 800-sentence set. Offline, self-contained client logic. */
(function () {
  'use strict';
  const data = window.RealTalkV2Data;
  const content = document.getElementById('app-content');
  if (!data || !content) { if(content)content.textContent='회화 데이터를 불러오지 못했습니다. 기존 앱과 함께 새 파일을 업로드해 주세요.'; return; }
  const source = (window.TravelAdditions?.scenes || []).flatMap(scene=>scene.lines);
  const ENOUGH = source.length === 800;
  const categories = ['전체', '카페·식당', '쇼핑·결제', '호텔·숙박', '공항·비행기', '길찾기·교통', '문화·박물관', '관광·현지생활', '긴급·생활편의'];
  let state = {tab:'stories', active:null, kind:'stories', category:'전체', search:'', page:0, mode:'read', turn:0, revealed:new Set(), showAll:false, variant:0, speed:0.88, feedback:'', input:''};
  const readStore=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))||fallback}catch{return fallback}};
  let completed=readStore('realtalk-v2-completed',{});
  let starred=readStore('realtalk-v2-favorites',{});
  const $=(sel,where=document)=>where.querySelector(sel);
  const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const art=s=>window.RealTalkV2Art?.[s.art||'tourist'] || '';
  const key=()=>state.kind+'-'+state.active;
  const changeTab=(tab)=>{stopSpeech();state.tab=tab;state.active=null;state.search='';state.category='전체';state.page=0;syncTabs();renderHome();window.scrollTo(0,0)};
  const syncTabs=()=>document.querySelectorAll('.sectionTab').forEach(b=>{let yes=b.dataset.tab===state.tab;b.classList.toggle('active',yes);b.setAttribute('aria-selected',yes?'true':'false')});
  const current=()=>state.active===null?null:data[state.kind]?.[state.active];
  const stopSpeech=()=>{try{speechSynthesis.cancel()}catch(e){}};
  const speechAvailable=()=>typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance!=='undefined';
  function speak(text,who='other',replace=true){
    if(!speechAvailable()){alert('이 브라우저에서는 음성 읽기를 지원하지 않습니다.');return;}
    if(replace)stopSpeech();
    const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=state.speed;u.pitch=who==='you'?.95:1.05;
    const voices=speechSynthesis.getVoices().filter(v=>/^en([_-]|$)/i.test(v.lang));
    if(voices.length){let chosen=voices.find(v=>(who==='you'?/male|david|mark|guy/i:/female|samantha|zira|jenny/i).test(v.name));u.voice=chosen||voices[0]}
    speechSynthesis.speak(u);
  }
  function playAll(turns){if(!speechAvailable()){alert('음성 읽기를 지원하지 않습니다.');return}stopSpeech();turns.forEach(t=>speak(t.en,t.who,false));}
  function matchText(s,q){return String(s||'').toLowerCase().includes(q)}
  function selectItem(kind,index,variant=0){
    stopSpeech();state.kind=kind;state.active=index;state.mode='read';state.turn=0;state.revealed=new Set();state.showAll=false;state.feedback='';state.input='';state.variant=variant;
    state.tab=kind==='stories'?'stories':'mini';syncTabs();renderDetail();window.scrollTo({top:0,behavior:'instant'});
  }
  function saveStatus(){try{localStorage.setItem('realtalk-v2-completed',JSON.stringify(completed));localStorage.setItem('realtalk-v2-favorites',JSON.stringify(starred));}catch(e){}}
  const categoryChip=(x)=>`<button type="button" class="chip${state.category===x?' active':''}" data-category="${esc(x)}">${esc(x)}</button>`;
  function renderHome(){
    const title=state.tab==='stories'?'26개 실제 상황 대화':state.tab==='mini'?'200개 원문으로 연습하는 미니 대화':'원본 800문장 · 표현 찾기';
    const hint=state.tab==='stories'?'상황 그림을 보고 이야기를 이해한 뒤 9~13턴의 자연스러운 대화를 연습하세요.':state.tab==='mini'?'기본 표현 200개마다 짧은 질문·답변 대화가 있습니다. 각 표현에는 PDF 응용 문장 3개가 연결됩니다.':'800개 문장을 번호·영어·한국어로 검색하고, 원본과 응용 표현을 나란히 비교하세요.';
    content.innerHTML=`<div class="section-head"><h2>${title}</h2><span class="count" id="result-count"></span></div>
      <p class="hint">${hint}</p>
      <label class="searchbar">🔎 <input id="searchInput" autocomplete="off" placeholder="${state.tab==='stories'?'카페, 환승, 체크인...':'영어·한국어·문장번호 검색'}" value="${esc(state.search)}" aria-label="대화 검색"></label>
      <div id="filter-chips" class="chips">${categories.map(categoryChip).join('')}</div>
      <div id="result-list"></div>`;
    $('#searchInput',content).addEventListener('input',e=>{state.search=e.target.value;state.page=0;updateResults()});
    updateResults();
  }
  function filtered(){
    const q=state.search.trim().toLowerCase();
    if(state.tab==='stories')return data.stories.map((x,i)=>({...x,_i:i})).filter(x=>(state.category==='전체'||x.category===state.category) && (!q||[x.title,x.category,x.setting,...x.turns.map(t=>t.en+' '+t.ko)].some(a=>matchText(a,q))));
    if(state.tab==='mini')return data.mini.map((x,i)=>({...x,_i:i})).filter(x=>(state.category==='전체'||x.category===state.category) && (!q||[x.title,x.category,String(x.baseNumber),...x.variants.map(v=>v.number+' '+v.en+' '+v.ko)].some(a=>matchText(a,q))));
    return source.filter(x=>{const i=Math.floor((x.number-1)/4);const item=data.mini[i];return (state.category==='전체'||item?.category===state.category)&&(!q||matchText(x.number,q)||matchText(x.en,q)||matchText(x.ko,q))});
  }
  function updateResults(){
    const items=filtered(),area=$('#result-list',content),n=$('#result-count',content);
    if(!area||!n)return;n.textContent=`${items.length}개`;
    const chips=$('#filter-chips',content);if(chips)chips.innerHTML=categories.map(categoryChip).join('');
    if(!items.length){area.innerHTML='<div class="empty">조건에 맞는 내용이 없습니다. 다른 검색어로 찾아보세요.</div>';return}
    if(state.tab==='stories'){
      area.innerHTML=`<div class="cardgrid">${items.map(x=>`<button class="storycard" type="button" data-open="stories" data-index="${x._i}">
        <img loading="lazy" alt="${esc(x.title)} 상황을 그린 AI 삽화" src="${art(x)}"><div class="cardtxt"><span class="cardtag">${esc(x.category)} · ${x.turns.length}턴</span><h3>${esc(x.title)}</h3><p>${esc(x.setting)}</p><div class="tinybar ${completed['stories-'+x._i]?'done':''}">${completed['stories-'+x._i]?'✓ 학습 완료':'대화 시작하기 ›'}</div></div></button>`).join('')}</div>`;
    }else if(state.tab==='mini'){
      const chunk=items.slice(0,24+state.page*24);
      area.innerHTML=chunk.map(x=>`<button class="listcard" type="button" data-open="mini" data-index="${x._i}"><img loading="lazy" src="${art(x)}" alt="${esc(x.category)} 상황 그림"><span><small>#${String(x.baseNumber).padStart(3,'0')} · ${esc(x.category)}</small><b>${esc(x.title)}</b><small>원문 1개 + 응용 3개 · ${completed['mini-'+x._i]?'✓ 학습 완료':'상대방 답변 듣기'}</small></span><span class="arr">›</span></button>`).join('')+(items.length>chunk.length?`<button type="button" data-more="1" class="loadmore">더 보기 (${chunk.length}/${items.length})</button>`:'');
    }else{
      const chunk=items.slice(0,30+state.page*30);
      area.innerHTML=chunk.map(x=>`<button class="listcard" type="button" data-source="${x.number}"><img loading="lazy" src="${art(data.mini[Math.floor((x.number-1)/4)])}" alt="관련 상황 그림"><span><small>#${String(x.number).padStart(3,'0')} · ${esc(data.mini[Math.floor((x.number-1)/4)].category)}</small><b>${esc(x.ko)}</b><small>${esc(x.en)}</small></span><span class="arr">›</span></button>`).join('')+(items.length>chunk.length?`<button type="button" data-more="1" class="loadmore">더 보기 (${chunk.length}/${items.length})</button>`:'');
    }
  }
  function labelsFor(item){return state.kind==='stories'?`<span class="pill">🎧 ${item.turns.length}턴 대화</span><span class="pill">📘 연관 기본 문장 ${item.source.length}개</span>`:`<span class="pill">🎤 6턴 미니 대화</span><span class="pill">📘 #${String(item.baseNumber).padStart(3,'0')}~#${String(item.baseNumber+3).padStart(3,'0')}</span>`}
  function renderDetail(){
    const item=current();if(!item)return renderHome();
    const fav=!!starred[key()],done=!!completed[key()];
    const subtitle=state.kind==='stories'?item.setting:'해당 표현을 실제로 말했을 때 어떤 답이 돌아오는지 6턴 대화로 연습합니다.';
    content.innerHTML=`<div class="detailhead"><button type="button" class="ghost" data-action="back">‹ 목록으로</button><span class="titlelabel">${state.kind==='stories'?'실전 상황 대화':'800문장 미니 대화'}</span></div>
      <img class="heroimage" alt="${esc(item.title)} 상황의 AI 생성 삽화" src="${art(item)}">
      <h2 class="detail-title">${esc(item.title)}</h2><p class="detail-note">${esc(subtitle)}</p>
      <div class="labelrow">${labelsFor(item)}<span class="pill">${esc(item.category)}</span></div>
      <div class="actionrow"><button class="act ${fav?'selected':''}" type="button" data-action="favorite">${fav?'★ 즐겨찾기 저장됨':'☆ 즐겨찾기'}</button><button class="act ${done?'selected':''}" type="button" data-action="markDone">${done?'✓ 완료 표시됨':'✓ 학습 완료 표시'}</button><span class="speed">음성 속도 <select id="speedSel" aria-label="영어 음성 속도"><option value="0.72">느리게</option><option value="0.88">보통</option><option value="1">자연스럽게</option></select></span></div>
      ${state.kind==='stories'?`<div class="mini-note">💡 ${esc(item.tip)}</div>`:'<div class="mini-note">💡 먼저 한국어만 보고 직접 영어로 말해보세요. 원문 4개는 뜻이나 상황 조건이 달라질 수 있습니다.</div>'}
      <div class="lessonModes"><button type="button" class="lessonMode ${state.mode==='read'?'active':''}" data-mode="read">💬 대화 읽기</button><button type="button" class="lessonMode ${state.mode==='practice'?'active':''}" data-mode="practice">🎤 내가 답하기</button><button type="button" class="lessonMode ${state.mode==='phrases'?'active':''}" data-mode="phrases">📖 표현 설명</button></div>
      <div id="lesson-panel"></div>`;
    $('#speedSel',content).value=String(state.speed);
    renderLesson();
  }
  function renderLesson(){
    const item=current(),panel=$('#lesson-panel',content);if(!item||!panel)return;
    if(state.mode==='read')renderRead(item,panel);
    else if(state.mode==='practice')renderPractice(item,panel);
    else renderPhrases(item,panel);
  }
  function renderRead(item,panel){
    panel.innerHTML=`<div class="panel"><h3>이런 상황에서 나올 수 있는 실제 대화</h3><p class="hint">처음에는 한국어만 보세요. 🔊을 눌러 듣고 영어를 떠올린 뒤, 정답을 열어 확인하세요.</p>
     <div class="actionrow"><button class="act primary" data-action="playAll" type="button">▶ 전체 대화 듣기</button><button class="act" data-action="stop" type="button">◼ 멈추기</button><button class="act" data-action="showAll" type="button">${state.showAll?'🙈 전체 영어 가리기':'👁 전체 영어 확인'}</button></div>
     <div class="speakers">${item.turns.map((t,i)=>`<article class="speech ${t.who==='you'?'you':''}">
       <div class="speakerlabel">${t.who==='you'?'🙋 내가 말할 차례':'👤 상대방의 말'} ${t.sourceNumber?`<span class="sourceTag">PDF #${t.sourceNumber}</span>`:''}</div>
       <div class="korean">${esc(t.ko)}</div>
       <div class="english" ${state.showAll||state.revealed.has(i)?'':'hidden'} id="line-${i}">${esc(t.en)}</div>
       <div class="replybar"><button type="button" data-action="speakLine" data-line="${i}">🔊 듣기</button><button type="button" data-action="toggleLine" data-line="${i}">${state.showAll||state.revealed.has(i)?'영어 가리기':'영어 확인'}</button>${t.sourceNumber?`<button type="button" data-source="${t.sourceNumber}">📖 원문 설명</button>`:''}</div></article>`).join('')}</div>
     <div class="actionrow"><button type="button" class="act primary" data-mode="practice">직접 대답 연습하기 →</button><button type="button" class="act" data-mode="phrases">연관 800표현 보기</button></div>
    </div>`;
  }
  const normalized=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
  function renderPractice(item,panel){
    const i=Math.min(state.turn,item.turns.length-1),turn=item.turns[i],isYou=turn.who==='you';
    const revealed=state.revealed.has(i);
    panel.innerHTML=`<div class="panel"><h3>상대방 말을 듣고 직접 답하기</h3><p class="hint">상대방 말은 🔊로 먼저 듣고, 내 차례는 영어로 입력해보세요. 정확히 같은 문장이 아니어도 자연스러운 표현이 될 수 있어요.</p>
      <div class="kpi">${item.turns.map((_,n)=>`<span class="${n<=i?'passed':''}"></span>`).join('')}</div>
      <div class="practice">
       <div class="step">${i+1} / ${item.turns.length} · ${isYou?'🙋 내가 대답할 차례':'👤 상대방의 말'}</div>
       <div class="prompt">${esc(turn.ko)}</div>
       <div class="prompt-small">${isYou?'영어로 어떻게 말할지 직접 써보세요.':'먼저 영어를 들어보고 뜻을 확인하세요.'}</div>
       ${isYou?`<input id="answerInput" type="text" lang="en" autocapitalize="sentences" autocomplete="off" spellcheck="false" placeholder="영어로 답해보기" value="${esc(state.input)}">`:''}
       ${state.feedback?`<div class="feedback">${esc(state.feedback)}</div>`:''}
       ${revealed?`<div class="answer">${esc(turn.en)}</div>`:''}
       <div class="actionrow">${isYou?'<button class="act primary" data-action="check" type="button">답변 비교</button>':''}<button class="act" data-action="playOne" type="button">🔊 듣기</button><button class="act" data-action="reveal" type="button">${revealed?'🙈 정답 가리기':'👁 정답 확인'}</button></div>
      </div>
      <div class="actionrow"><button class="act" data-action="prevTurn" ${i===0?'disabled':''} type="button">← 이전 말</button><button class="act primary" data-action="nextTurn" type="button">${i===item.turns.length-1?'✓ 학습 완료':'다음 대화 →'}</button></div>
      <p class="hint">채점은 기준 문장과의 철자 비교입니다. 다른 자연스러운 표현은 오답으로 확정하지 않습니다.</p>
      </div>`;
  }
  function sourceInfo(index){return window.TravelBeginner?.get(index)}
  function phraseHTML(line,defaultOpen=false){
    return `<article class="sourceitem ${defaultOpen?'focus':''}"><span class="num">PDF #${String(line.number).padStart(3,'0')}${(line.number-1)%4===0?' · 기본 표현':' · 응용 표현'}</span>
      <div class="phrase-ko">${esc(line.ko)}</div><div id="phrase-${line.number}" class="phrase-en" ${defaultOpen?'':'hidden'}>${esc(line.en)}</div>
      <div class="replybar"><button type="button" data-action="togglePhrase" data-number="${line.number}">👁 영어 확인 / 가리기</button><button type="button" data-action="speakPhrase" data-number="${line.number}">🔊 듣기</button></div></article>`;
  }
  function sourceBlock(group,expanded){
    const first=(group-1)*4,arr=source.slice(first,first+4),info=sourceInfo(arr[0]?.number);
    if(arr.length!==4)return '';
    const chips=(info?.chunks||[]).slice(0,7);
    return `<div class="panel"><div class="section-head"><h3 style="margin:0">기본 표현 ${group} · 네 가지 말하기</h3><span class="count">#${arr[0].number}–#${arr[3].number}</span></div>
      <p class="hint">원본을 먼저 말하고, 아래 응용 표현으로 조건을 바꿔 대답해보세요.</p>
      ${arr.map((v,i)=>phraseHTML(v,v.number===expanded)).join('')}
      ${info?.simple?`<div class="related">🌱 <b>초보자용 짧은 말</b><div style="margin-top:6px">${esc(info.simple.en)}<br><small>${esc(info.simple.ko)}</small></div><small>※ 일부 조건을 생략한 기본형이므로 원문과 정확히 같은 뜻은 아닐 수 있습니다.</small></div>`:''}
      ${chips.length?`<div class="info-title">왜 이 표현을 썼을까요? 눌러보세요.</div><div class="explain-grid">${chips.map((v,i)=>`<button class="explain-btn" type="button" data-chunk="${group}:${i}">${esc(v.en)}</button>`).join('')}</div><div class="explain-view" data-explain="${group}">영어 표현을 누르면 뜻과 사용 이유를 자세히 설명합니다.</div>`:''}
     </div>`;
  }
  function renderPhrases(item,panel){
    if(!ENOUGH){panel.innerHTML='<div class="empty">기존 여행 800문장 데이터 파일을 불러오지 못했습니다. travel-additions.js를 확인해 주세요.</div>';return}
    const groups=state.kind==='mini'?[Math.floor(item.baseNumber/4)+1]:item.source;
    panel.innerHTML=`<div class="panel"><h3>대화에 연결된 원본 800문장</h3><p class="hint">대화 속 문장과 원본 자료의 응용 문장입니다. 한국어 → 영어 확인 → 다른 표현 → 왜 쓰는지 순서로 공부하세요.</p><div class="mini-note">응용 문장 3개는 원문의 장소·시간·조건 등을 바꾼 표현일 수 있습니다. 서로 완전히 바꿔 말해도 같은 뜻이라고 가정하지 마세요.</div></div>${groups.map(n=>sourceBlock(n,state.variant)).join('')}`;
  }
  function markComplete(){completed[key()]=true;saveStatus()}
  function viewSource(num){if(!ENOUGH)return;let group=Math.floor((num-1)/4);selectItem('mini',group,num);state.mode='phrases';renderDetail();}
  function handleClick(event){
    const elem=event.target.closest('button');if(!elem||!content.contains(elem))return;
    if(elem.dataset.open){selectItem(elem.dataset.open,Number(elem.dataset.index));return}
    if(elem.dataset.source){viewSource(Number(elem.dataset.source));return}
    if(elem.dataset.more){state.page++;updateResults();return}
    if(elem.dataset.category){state.category=elem.dataset.category;state.page=0;updateResults();return}
    if(elem.dataset.mode){state.mode=elem.dataset.mode;state.revealed=new Set();state.showAll=false;state.feedback='';state.input='';renderDetail();return}
    const act=elem.dataset.action, item=current();if(!act)return;
    if(act==='back'){stopSpeech();state.active=null;renderHome();window.scrollTo(0,0);return}
    if(!item)return;
    if(act==='favorite'){starred[key()]=!starred[key()];saveStatus();renderDetail();return}
    if(act==='markDone'){completed[key()]=!completed[key()];saveStatus();renderDetail();return}
    if(act==='playAll'){playAll(item.turns);return}
    if(act==='stop'){stopSpeech();return}
    if(act==='showAll'){state.showAll=!state.showAll;renderLesson();return}
    if(act==='toggleLine'){const i=Number(elem.dataset.line);state.revealed.has(i)?state.revealed.delete(i):state.revealed.add(i);renderLesson();return}
    if(act==='speakLine'){const t=item.turns[Number(elem.dataset.line)];if(t)speak(t.en,t.who);return}
    if(act==='playOne'){const t=item.turns[state.turn];speak(t.en,t.who);return}
    if(act==='check'){
      const input=$('#answerInput',content);state.input=input?.value||'';
      const wanted=item.turns[state.turn].en;
      if(!state.input.trim())state.feedback='먼저 영어 답변을 입력해 주세요.';
      else if(normalized(state.input)===normalized(wanted)){state.feedback='✓ 기준 표현과 일치해요! 잘하셨습니다.';state.revealed.add(state.turn)}
      else{state.feedback='기준 문장과 달라요. 정답을 열어 비교해 보세요. 뜻이 같은 다른 표현일 수도 있어요.';state.revealed.add(state.turn)}
      renderLesson();return;
    }
    if(act==='reveal'){state.revealed.has(state.turn)?state.revealed.delete(state.turn):state.revealed.add(state.turn);state.input=$('#answerInput',content)?.value||state.input;renderLesson();return}
    if(act==='nextTurn'){
      if(state.turn===item.turns.length-1){markComplete();state.mode='read';state.turn=0;state.showAll=false;state.revealed=new Set();renderDetail();let msg=document.createElement('div');msg.className='complete';msg.textContent='✓ 대화 연습을 완료했습니다! 완료 기록은 이 기기에 저장됩니다.';$('#lesson-panel',content).prepend(msg)}
      else{state.turn++;state.revealed=new Set();state.input='';state.feedback='';renderLesson()}
      return;
    }
    if(act==='prevTurn'){state.turn=Math.max(0,state.turn-1);state.revealed=new Set();state.input='';state.feedback='';renderLesson();return}
    if(act==='togglePhrase'){
      const box=document.getElementById('phrase-'+elem.dataset.number);if(box)box.hidden=!box.hidden;return;
    }
    if(act==='speakPhrase'){
      const line=source[Number(elem.dataset.number)-1];if(line)speak(line.en,'you');return;
    }
    if(elem.dataset.chunk){
      const [g,i]=elem.dataset.chunk.split(':').map(Number),info=sourceInfo((g-1)*4+1);const chunk=info?.chunks?.[i];
      const box=content.querySelector('[data-explain="'+g+'"]');
      if(box&&chunk)box.textContent=chunk.en+' — '+chunk.ko+'\n\n'+chunk.why+(chunk.note?'\n비교: '+chunk.note:'');return;
    }
  }
  content.addEventListener('click',handleClick);
  content.addEventListener('change',e=>{if(e.target?.id==='speedSel'){state.speed=Number(e.target.value)||.88;stopSpeech()}});
  content.addEventListener('input',e=>{if(e.target?.id==='answerInput')state.input=e.target.value});
  content.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target?.id==='answerInput'){e.preventDefault();$('#lesson-panel [data-action="check"]',content)?.click()}});
  document.querySelectorAll('.sectionTab').forEach(btn=>btn.addEventListener('click',()=>changeTab(btn.dataset.tab)));
  window.addEventListener('pagehide',stopSpeech);
  renderHome();
})();
