/* Pure functions; no network or storage. Imported lessons are never bundled transcripts. */
(function(root){
'use strict';
const counts=[24,24,25,24,24,25,24,24,24,18];
const seasons=counts.map((n,s)=>({id:`s${String(s+1).padStart(2,'0')}`,number:s+1,episodes:Array.from({length:n},(_,e)=>({id:`s${String(s+1).padStart(2,'0')}e${String(e+1).padStart(2,'0')}`,number:e+1}))}));
function words(t){return String(t).normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/(?<=[a-z])[-–—](?=[a-z])/g,' ').match(/[a-z0-9]+(?:'[a-z0-9]+)*/g)||[];}
function grade(expected,typed){
 const a=expand(words(expected)),b=expand(words(typed)),n=a.length,m=b.length;
 const dp=Array.from({length:n+1},()=>Array(m+1).fill(0));
 for(let i=0;i<=n;i++)dp[i][0]=i;for(let j=0;j<=m;j++)dp[0][j]=j;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=Math.min(dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1),dp[i-1][j]+1,dp[i][j-1]+1);
 const out=[];let i=n,j=m;
 while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){out.push({kind:a[i-1]===b[j-1]?'correct':'wrong',expected:a[--i],actual:b[--j],position:i});}
 else if(i&&dp[i][j]===dp[i-1][j]+1)out.push({kind:'missing',expected:a[--i],actual:'',position:i});
 else out.push({kind:'extra',expected:'',actual:b[--j],position:i});}
 out.reverse();
 // Pair moved occurrences only once, including duplicate-word sentences.
 const needed=out.filter(x=>x.expected&&x.kind!=='correct'),used=new Set();
 for(const x of out.filter(x=>x.actual&&x.kind!=='correct')){const y=needed.find(y=>y!==x&&!used.has(y)&&y.expected===x.actual);if(y){used.add(y);x.movedActual=true;y.movedExpected=true;}}
 for(const x of out)if(x.movedActual||x.movedExpected)x.kind='order';
 for(const t of out)if(t.kind==='wrong'&&charDistance(t.expected,t.actual)<=Math.max(1,Math.floor(t.expected.length/4)))t.kind='spelling';
 return {contractionDifference:words(expected).join(' ')!==words(typed).join(' ')&&a.join(' ')===b.join(' '),score:n?Math.max(0,Math.round((1-dp[n][m]/n)*100)):0,distance:dp[n][m],correct:out.filter(x=>x.kind==='correct').length,total:n,tokens:out};
}
function validatePack(p){
 const bad=m=>{throw Error(m)};const text=(v,label)=>{if(typeof v!=='string'||!v.trim())bad(label+' 누락');};
 if(!p||p.version!==1||p.series!=='Friends')bad('version:1 / series:Friends 자료만 지원합니다.');
 if(!/^user-[a-zA-Z0-9_-]{1,60}$/.test(p.id||''))bad('자료 ID는 user-로 시작해야 합니다.');
 if(!seasons.some(s=>s.episodes.some(e=>e.id===p.episodeId)))bad('유효하지 않은 에피소드');
 text(p.title,'제목');if(p.rights?.confirmed!==true)bad('사용 권한 확인이 필요합니다.');
 text(p.rights?.source,'출처');text(p.rights?.basis,'사용 권한 근거');
 if(!Array.isArray(p.scenes)||!p.scenes.length)bad('장면 없음');const ids=new Set();let sentenceCount=0;
 function id(v){text(v,'ID');if(!/^[a-zA-Z0-9_-]+$/.test(v)||ids.has(v))bad('중복/유효하지 않은 ID');ids.add(v);}
 for(const s of p.scenes){id(s.id);text(s.title,'장면 제목');if(!Array.isArray(s.dialogues)||!s.dialogues.length)bad('대화 없음');
 for(const d of s.dialogues){id(d.id);if(!Array.isArray(d.sentences)||!d.sentences.length)bad('문장 없음');
 for(const x of d.sentences){id(x.id);sentenceCount++;text(x.text,'영문 정답');if(words(x.text).length>150)bad('문장당 최대 150단어');
 if(!(x.start===null&&x.end===null)&&(!Number.isFinite(x.start)||!Number.isFinite(x.end)||x.start<0||x.end<=x.start))bad('구간 시간이 잘못되었습니다.');
 if(!Array.isArray(x.terms))bad('terms 배열 필요');let end=0;
 for(const t of [...x.terms].sort((a,b)=>a.offset-b.offset)){if(!Number.isInteger(t.offset)||t.offset<end||typeof t.text!=='string'||!t.text||x.text.slice(t.offset,t.offset+t.text.length)!==t.text)bad('표현 클릭 범위 오류');end=t.offset+t.text.length;}
 }}}
 if(sentenceCount>3000)bad('자료당 최대 3,000문장');
 if(p.media?.kind!=='local')bad('가져온 자료는 권한 있는 로컬 음성/영상과 연결합니다.');
 return p;
}
function flatten(packs){return packs.flatMap(p=>p.scenes.flatMap(s=>s.dialogues.flatMap(d=>d.sentences.map(x=>({...x,uid:[p.id,s.id,d.id,x.id].join('/'),packId:p.id,episodeId:p.episodeId,sceneId:s.id,sceneTitle:s.title,dialogueId:d.id,packTitle:p.title})))));}

function expand(a){const fixed={"can't":"can not","cannot":"can not","won't":"will not","shan't":"shall not","i'm":"i am","let's":"let us"};return a.flatMap(w=>{if(fixed[w])return fixed[w].split(' ');if(w.endsWith("n't"))return [w.slice(0,-3),'not'];for(const [s,v]of [["'re",'are'],["'ve",'have'],["'ll",'will']])if(w.endsWith(s))return [w.slice(0,-s.length),v];return [w]});}
function charDistance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]!==b[j-1]));row=next}return row[b.length];}
function parseFile(text,ext){
 const clean=t=>String(t).replace(/<[^>]*>/g,'').trim();
 const split=t=>{const protectedText=clean(t).replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)\./gi,'$1\uE000').replace(/(\d)\.(?=\d)/g,'$1\uE000').replace(/\b([A-Z])\.(?=[A-Z]\.)/g,'$1\uE000');return (protectedText.match(/[^.!?]+[.!?]+(?:["']|$)?|[^.!?]+$/g)||[]).map(x=>x.replace(/\uE000/g,'.').trim()).filter(Boolean);};
 let cues=[]; text=text.replace(/^\uFEFF/,'').replace(/\r/g,'');ext=ext.toLowerCase();
 if(ext==='json'){const a=JSON.parse(text);if(!Array.isArray(a))throw Error('JSON은 [{text,start,end}] 배열 또는 학습팩 형식으로 넣으세요.');cues=a.map(x=>{if(!x||typeof x!=='object'||typeof(x.text??x.en)!=='string')throw Error('JSON 문장 형식이 잘못되었습니다.');return {text:clean(x.text??x.en),start:x.start??null,end:x.end??null};});}
 else if(ext==='txt'){cues=text.split(/\n+/).filter(x=>x.trim()).map(t=>({text:t,start:null,end:null}));}
 else if(['srt','vtt'].includes(ext)){
  const sec=t=>{const a=t.replace(',','.').split(':').map(Number);if(a.at(-1)>=60||a.at(-2)>=60)throw Error('자막의 분·초는 60 미만이어야 합니다.');return a.reduce((n,v)=>n*60+v,0);};
  for(const b of text.split(/\n\s*\n/)){const lines=b.trim().split('\n');if(/^(NOTE|STYLE|REGION)\b/.test(lines[0]))continue;const i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;const m=lines[i].match(/(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3})/);if(!m)throw Error('잘못된 자막 시간입니다.');cues.push({start:sec(m[1]),end:sec(m[2]),text:lines.slice(i+1).join(' ')});}
 }else throw Error('SRT/VTT/TXT/JSON만 지원합니다.');
 const out=[];for(const c of cues){if(!(c.start===null&&c.end===null)&&(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start))throw Error('시작·종료 시간을 확인하세요.');const sentences=split(c.text);for(const text of sentences)out.push({id:'line-'+(out.length+1),text,start:c.start,end:c.end,sharedCue:sentences.length>1,terms:[]});}
 if(!out.length)throw Error('읽을 수 있는 문장이 없습니다.');if(out.length>3000)throw Error('한 파일에 최대 3,000문장입니다.');for(const x of out)if(words(x.text).length>150)throw Error('한 문장은 최대 150단어입니다.');return out;
}
const api={counts,seasons,words,grade,validatePack,flatten,parseFile,expand};if(typeof module!=='undefined')module.exports=api;else root.FriendsCore=api;
})(typeof window!=='undefined'?window:globalThis);
