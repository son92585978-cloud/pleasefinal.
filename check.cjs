const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dir=path.resolve(__dirname,'..'),results=[];
function check(name,fn){try{const extra=fn();results.push({name,status:'PASS',evidence:extra??''});}catch(e){results.push({name,status:'FAIL',evidence:e.stack});}}
let html=fs.readFileSync(dir+'/index.html','utf8');
const inline=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
check('JavaScript syntax: every inline and external script',()=>{for(const [i,m] of inline.entries()){if(!m[1].includes('src='))new vm.Script(m[2],{filename:'inline-'+i});else {let src=m[1].match(/src="([^"]+)"/)[1];new vm.Script(fs.readFileSync(path.join(dir,src),'utf8'),{filename:src});}}new vm.Script(fs.readFileSync(dir+'/sw.js','utf8'));return inline.length+' script tags and sw.js compiled by Node VM';});
const events={},nodes={},store=new Map();
const node=id=>nodes[id]??=({id,innerHTML:'',textContent:'',scrollTop:0,style:{},classList:{toggle(){}},addEventListener(){},querySelectorAll(){return []},querySelector(){return null},prepend(){},remove(){}});
const initial={
 'travelWork331:travelWrongWords':JSON.stringify(['check in','flight']),
 'travelWork331:travelWrongExamplesV17':JSON.stringify(['["May I see your passport?"]']),
 'travelWork331:localEdits':JSON.stringify({'check in':{mnemonic:'사용자 보존 검증'}}),
 'travelWork331:travelCustomCards':JSON.stringify([{word:'my custom word',meaning:'사용자 단어',day:'내 단어',num:1,dialogue_pairs:[]}]),
 'travelWork331:wordLemmaMigrationV27':'done',
 'travelWork331:index':'12', 'travelWork331:speechGender':'male','travelWork331:speechRate':'0.75'
};Object.entries(initial).forEach(([k,v])=>store.set(k,v));
let stack=[null],cursor=0;
const history={get state(){return stack[cursor]},replaceState(s){stack[cursor]=structuredClone(s)},pushState(s){stack=stack.slice(0,cursor+1);stack.push(structuredClone(s));cursor++},go(n){cursor=Math.max(0,Math.min(stack.length-1,cursor+n));setImmediate(()=>events.popstate?.({state:stack[cursor]}))},back(){this.go(-1)}};
const ctx={console,history,setTimeout,clearTimeout,setInterval,clearInterval,URL,JSON,Math,Date,Map,Set,Uint8Array,structuredClone,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){}},navigator:{},addEventListener:(k,f)=>events[k]=f,requestAnimationFrame:f=>f(),speechSynthesis:{cancel(){},getVoices(){return []}},SpeechSynthesisUtterance:class{constructor(t){this.text=t}}};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['audio-engine.js','phrase-data.js','phrase-data-2.js','word-order-data.js','grammar-guide.js'])vm.runInContext(fs.readFileSync(dir+'/'+file,'utf8'),ctx);
const main=inline.filter(m=>m[2].includes('const WRITING_DATA='))[0][2];
vm.runInContext(main.replace('initializeNavigation();render();',''),ctx);
const run=code=>vm.runInContext(code,ctx),tick=()=>new Promise(r=>setImmediate(r));
check('1,289 canonical records and click-group coverage',()=>{assert.equal(run('Object.keys(WRITING_DATA).length'),1289);assert.equal(Object.keys(ctx.V48_PHRASE_DATA).length,1289);return 'All records align; no lost English words or overlapping offsets';});
check('Every sentence renders both initially closed curtains',()=>run(`(()=>{let n=0;for(const [s,r] of Object.entries(WRITING_DATA)){const h=writingRow(s,'STALE TRANSLATION');if(!h.includes(esc(r.ko)))throw Error(s);if((h.match(/class="writing-toggle"/g)||[]).length!==2)throw Error('curtains '+s);if((h.match(/aria-expanded="false"/g)||[]).length<2)throw Error(s);if(!h.includes('inline-explanation'))throw Error('click missing '+s);n++;}return n+' HTML fragments generated';})()`));
check('Clickable phrase offsets preserve all 1,289 English texts',()=>{let n=0;for(const r of Object.values(ctx.V48_PHRASE_DATA)){let cursor=0;for(const p of r.phrases){assert(p.offset>=cursor);assert.equal(r.sentence.slice(p.offset,p.offset+p.text.length),p.text);assert(!r.sentence.slice(cursor,p.offset).replace(/[\s.,;:!?“”"']/g,''));cursor=p.offset+p.text.length;n++;}assert(!r.sentence.slice(cursor).replace(/[\s.,;:!?“”"']/g,''));}return n+' phrase groups checked';});
check('All card-pair copies match canonical reviewed Korean',()=>run(`(()=>{let n=0;for(const c of allCards())for(const p of c.dialogue_pairs||[]){const en=p.en.split('\\n'),ko=p.ko.split('\\n');en.forEach((s,i)=>{const r=writingLesson(s);if(r&&String(ko[i]).replace(/^[AB]:\\s*/, '').trim()!==r.ko)throw Error(s);n++;});}return n+' duplicate sentence instances checked';})()`));
check('Existing study data, local edits and custom cards load',()=>{assert(run("wrongSet.has('check in')&&wrongSet.has('flight')"));assert.equal(run('exampleWrongSet.size'),1);assert.equal(run("allCards().find(c=>c.word==='check in').mnemonic"),'사용자 보존 검증');assert(run("allCards().some(c=>c.word==='my custom word')"));assert.equal(run('index'),12);assert.equal(run('speechRate'),.75);return 'Seeded legacy storage loaded without reset';});
check('Known translation/semantic regressions',()=>{const w=JSON.parse(run('JSON.stringify(WRITING_DATA)'));for(const [s,text] of [['I am South Korean.','저는 대한민국 국민입니다.'],['Where do I pay?','제가 어디에서 결제하나요?'],['Could you leave this package at the front desk?','당신이 이 소포를 프런트 데스크에 맡겨주시겠어요?']])assert.equal(w[s].ko,text);for(const r of Object.values(w)){assert(!/^당신은\s*$|^제가\s*$/.test(r.ko));assert(!/에게를|해변들과가|박물관을 맨 먼저를/.test(JSON.stringify(r.chunks)));}return 'Known incomplete and reversed-intent translations corrected';});
check('Manifest and local dependency paths',()=>{const m=JSON.parse(fs.readFileSync(dir+'/manifest.webmanifest'));for(const icon of m.icons)assert(fs.existsSync(path.join(dir,icon.src)));for(const m of html.matchAll(/(?:src|href)="(\.?\.?\/)?([^"#]+)"/g)){const target=(m[1]||'')+m[2];if(!/^(https?:|data:)/.test(target))assert(fs.existsSync(path.join(dir,target)),target);}return 'Relative paths exist, including PWA icons';});
(async()=>{
 // Navigation logic simulation only. This is explicitly not a real-browser test.
 run('render=function(){rememberRoute()};initializeNavigation()');
 run("openTemporary(()=>{mode='sentences';sentenceState.query='airport';sentenceState.page=2;sentenceState.folds={'fixture':[true,false]};});openSentenceWord('flight');");
 check('Navigation simulation: detail opened from examples',()=>{assert.equal(run('mode'),'glossary');assert.equal(run('navParents.length'),2);});
 run('returnToPrevious()');await tick();
 check('Navigation simulation: internal back returns one entry',()=>{assert.equal(run('mode'),'sentences');assert.equal(run('sentenceState.query'),'airport');assert.equal(run('sentenceState.page'),2);assert.equal(cursor,1);});
 history.back();await tick();
 check('Navigation simulation: browser back after internal back',()=>{assert.equal(run('mode'),'cards');assert.equal(cursor,0);assert.equal(run('navParents.length'),0);});
 run("openTemporary(()=>{mode='search';query='flight'});openSentenceWord('flight')");history.back();await tick();
 check('Navigation simulation: system-style back to search',()=>{assert.equal(run('mode'),'search');assert.equal(run('query'),'flight');});
 run("openSentenceWord('flight');returnToStudy()");await tick();
 check('Navigation simulation: detail immediate-parent return',()=>{assert.equal(run('mode'),'search');});
 run('returnToStudy()');await tick();
 check('Navigation simulation: return to study consumes parents',()=>{assert.equal(run('mode'),'cards');assert.equal(cursor,0);});
 check('Wrong-list storage persists through simulated navigation',()=>{assert.equal(store.get('travelWork331:travelWrongWords'),initial['travelWork331:travelWrongWords']);assert.equal(store.get('travelWork331:travelWrongExamplesV17'),initial['travelWork331:travelWrongExamplesV17']);});
 results.push({name:'Actual browser UI and native Android back',status:'UNVERIFIED',evidence:'Local Chromium launch denied: AF_UNIX socket operation not permitted. Separate cloud browser cannot connect to workspace localhost (ERR_CONNECTION_REFUSED). Simulations above are not browser UI verification.'});
 results.push({name:'Actual audio playback and male/female voice quality',status:'UNVERIFIED',evidence:'Original audio assets absent. Device English speech fallback implemented; no installed voices or audible playback verified.'});
 fs.writeFileSync(dir+'/verification-results.json',JSON.stringify({environment:'Node VM + minimal DOM/history stubs; not a browser',results},null,2));
 console.log(results.map(r=>r.status+' '+r.name+(r.status==='FAIL'?'\n'+r.evidence:'')).join('\n'));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})();
