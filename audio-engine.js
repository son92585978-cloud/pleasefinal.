/* V9: bundled neural MP3 clips, with local neural generation for added text. */
window.TravelAudio=(()=>{
  let player=null, activeURL=null, finish=null, generation=0;
  let indexPromise=null, worker=null, request=0;
  const packs=new Map(), generated=new Map(), pending=new Map();
  let stateListener=()=>{};
  function status(text){stateListener(text);}
  function stop(){
    generation++;
    if(player){player.pause();player.onended=null;player.onerror=null;}
    if(finish){finish(false);finish=null;}
    if(activeURL){URL.revokeObjectURL(activeURL);activeURL=null;}
    for(const p of pending.values()){clearTimeout(p.timeout);p.resolve(null);}
    pending.clear();
    if(worker)worker.postMessage({type:'cancel',id:++request});
  }
  function unlock(){
    if(!player){player=new Audio();player.preload='auto';player.preservesPitch=true;}
    // Start this persistent element during the tap so later async MP3 loads can play on mobile.
    if(!player.src){
      player.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==';
      const p=player.play();if(p)p.catch(()=>{});
    }
  }
  function ensureWorker(){
    if(worker)return worker;
    worker=new Worker('./neural/worker.js',{type:'module'});
    worker.onmessage=({data})=>{
      const p=pending.get(data.id);if(!p)return;
      if(data.type==='progress'){status('추가 단어용 음성 모델 준비 중 · '+data.progress+'%');return;}
      clearTimeout(p.timeout);pending.delete(data.id);
      if(data.type==='error'){console.error('AI voice:',data.message);p.reject(new Error('추가 단어의 AI 음성을 만들지 못했습니다. 인터넷 연결을 확인하고 다시 눌러주세요.'));}
      else if(data.type==='audio'){generated.set(p.key,data.blob);if(generated.size>40)generated.delete(generated.keys().next().value);p.resolve(data.blob);}
    };
    worker.onerror=()=>{
      for(const p of pending.values()){clearTimeout(p.timeout);p.reject(new Error('AI 음성 실행에 실패했습니다. 최신 Chrome에서 다시 열어주세요.'));}
      pending.clear();worker.terminate();worker=null;
    };
    return worker;
  }
  async function customClip(text,gender){
    const key=gender+'|'+text;
    if(generated.has(key))return generated.get(key);
    status('추가 단어 AI 음성 준비 중… 처음에는 모델 다운로드로 시간이 걸립니다.');
    const w=ensureWorker(), id=++request;
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{
        if(!pending.has(id))return;
        pending.delete(id);w.terminate();worker=null;
        reject(new Error('음성 준비 시간이 초과됐습니다. Wi-Fi에서 다시 눌러주세요.'));
      },300000);
      pending.set(id,{resolve,reject,key,timeout});
      w.postMessage({type:'generate',id,text,gender});
    });
  }
  async function clip(text,gender,token){
    if(!indexPromise)indexPromise=fetch('./audio/index.json').then(r=>{if(!r.ok)throw Error('음성 목록 파일을 불러오지 못했습니다. 사이트 파일을 모두 올렸는지 확인해주세요.');return r.json();}).catch(e=>{indexPromise=null;throw e});
    const manifest=await indexPromise;
    if(token!==generation)return null;
    const entry=manifest.clips[text]?.[gender];
    if(!entry)return customClip(text,gender);
    const [name,offset,length]=entry;
    if(!packs.has(name)){
      const promise=fetch('./audio/'+name).then(r=>{if(!r.ok)throw Error('음성 파일을 불러오지 못했습니다. 인터넷 연결과 audio 폴더를 확인해주세요.');return r.arrayBuffer();}).catch(e=>{packs.delete(name);throw e});
      packs.set(name,promise);
      if(packs.size>3)packs.delete(packs.keys().next().value);
    }
    const bytes=await packs.get(name);
    return new Blob([bytes.slice(offset,offset+length)],{type:'audio/mpeg'});
  }
  async function play(text,gender,rate){
    const token=generation;
    status('음성 준비 중…');
    try{
      const blob=await clip(text,gender,token);
      if(!blob||token!==generation)return false;
      if(activeURL)URL.revokeObjectURL(activeURL);
      activeURL=URL.createObjectURL(blob);player.src=activeURL;
      player.playbackRate=rate;player.preservesPitch=true;player.mozPreservesPitch=true;player.webkitPreservesPitch=true;
      status((gender==='male'?'남성 Michael':'여성 Heart')+' · 재생 중');
      return await new Promise((resolve,reject)=>{
        finish=resolve;
        player.onended=()=>{if(token!==generation)return;finish=null;status('재생 완료');resolve(true);};
        player.onerror=()=>{if(token!==generation)return;finish=null;reject(new Error('음성을 재생하지 못했습니다. 다시 눌러주세요.'));};
        player.play().catch(e=>{if(token!==generation)return;finish=null;reject(new Error(e.name==='NotAllowedError'?'음성이 준비됐습니다. 재생 버튼을 한 번 더 눌러주세요.':'재생에 실패했습니다. 다시 눌러주세요.'));});
      });
    }catch(e){if(token===generation)status(e.message);return false;}
  }
  return {stop,unlock,play,onStatus(fn){stateListener=fn;}};
})();
