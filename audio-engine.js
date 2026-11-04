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
