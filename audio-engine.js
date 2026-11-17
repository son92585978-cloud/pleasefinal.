/* Device speech fallback; original Michael/Heart recordings and engine were absent. */
window.TravelAudio=(()=>{
 let listener=()=>{},pending=null,generation=0;
 const emit=t=>listener(t);
 function stop(){generation++;const resolve=pending;pending=null;if(resolve)resolve(false);if('speechSynthesis' in window)window.speechSynthesis.cancel();}
 function voices(){return 'speechSynthesis' in window?window.speechSynthesis.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang)):[];}
 function select(g){const v=voices();const pattern=g==='male'?/david|mark|daniel|george|james|michael|guy|(?:^|\W)male\b/i:/zira|samantha|karen|victoria|susan|jenny|aria|female/i;return v.find(x=>pattern.test(x.name))||v.find(x=>/^en-US$/i.test(x.lang))||v[0];}
 return {onStatus(fn){listener=typeof fn==='function'?fn:()=>{};},unlock(){},stop,async play(text,gender,rate){
  stop();const request=generation;
  if(!('speechSynthesis' in window)){emit('이 브라우저는 음성을 지원하지 않습니다.');return false;}
  if(!text)return false;
  if(!voices().length)await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);speechSynthesis.removeEventListener('voiceschanged',finish);resolve();};const timer=setTimeout(finish,1000);speechSynthesis.addEventListener('voiceschanged',finish);});
  if(request!==generation)return false;
  const voice=select(gender);
  if(!voice){emit('설치된 영어 음성이 없습니다. 기기 설정에서 영어 읽기 음성을 설치해 주세요.');return false;}
  return new Promise(resolve=>{const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=Math.max(.5,Math.min(1.5,Number(rate)||1));pending=resolve;
   utterance.onend=()=>{if(request!==generation)return;pending=null;emit('재생 완료 · '+voice.name);resolve(true);};
   utterance.onerror=e=>{if(request!==generation)return;pending=null;emit('음성 재생 실패 · '+e.error);resolve(false);};
   emit('기기 음성 · '+voice.name+' · '+utterance.rate.toFixed(2)+'배');speechSynthesis.speak(utterance);
  });
 },availableVoices:voices};
})();
// RC1: restore the recordings already present in this uploaded project.
window.TravelAudio=(()=>{
 const fallback=window.TravelAudio;let status=()=>{},generation=0,active=null,url=null,settle=null,indexPromise=null;const buffers=new Map();
 function stop(){generation++;if(active){active.pause();active.src='';active=null;}if(url){URL.revokeObjectURL(url);url=null;}if(settle){settle(false);settle=null;}fallback.stop();}
 async function index(){if(!indexPromise)indexPromise=fetch('./audio/index.json').then(r=>{if(!r.ok)throw Error('음성 목록 읽기 실패');return r.json()}).catch(e=>{indexPromise=null;throw e});return indexPromise;}
 return {onStatus(fn){status=fn;fallback.onStatus(fn)},unlock(){fallback.unlock()},stop,availableVoices:fallback.availableVoices,async play(text,gender,rate){stop();const request=generation;try{const d=await index();if(request!==generation)return false;const key=Object.keys(d.clips).find(k=>k.toLowerCase()===String(text).trim().toLowerCase()),v=d.clips[key]?.[gender];if(!v){status('등록 음성 없음 · 기기 음성으로 재생');return fallback.play(text,gender,rate);}const [file,start,length]=v;if(!buffers.has(file)){const r=await fetch('./audio/'+file);if(!r.ok)throw Error('음성 파일 연결 실패');buffers.set(file,await r.arrayBuffer());if(buffers.size>4)buffers.delete(buffers.keys().next().value);}if(request!==generation)return false;const bytes=buffers.get(file);if(start+length>bytes.byteLength)throw Error('음성 범위 오류');url=URL.createObjectURL(new Blob([bytes.slice(start,start+length)],{type:'audio/mpeg'}));active=new Audio(url);active.playbackRate=Math.max(.5,Math.min(1.5,Number(rate)||1));status('단어 학습용 AI 음성 · '+(gender==='male'?'Michael':'Heart'));return await new Promise(resolve=>{settle=resolve;active.onended=()=>{settle=null;status('재생 완료');resolve(true)};active.onerror=()=>{settle=null;status('음성 파일 재생 실패');resolve(false)};active.play().catch(()=>{settle=null;status('재생 버튼을 다시 눌러 주세요.');resolve(false)});});}catch(e){if(request!==generation)return false;status(e.message+' · 기기 음성으로 전환');return fallback.play(text,gender,rate);}}
 };
})();
