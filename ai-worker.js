const OPENAI_URL = "https://api.openai.com/v1/responses";

function cors(origin="*"){
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(data,status=200,origin="*"){
  return new Response(JSON.stringify(data),{
    status,
    headers:{"Content-Type":"application/json; charset=utf-8",...cors(origin)}
  });
}

function getOutputText(data){
  if(typeof data?.output_text==="string" && data.output_text.trim()) return data.output_text.trim();
  const chunks=[];
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(part?.type==="output_text" && typeof part.text==="string") chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonLoose(text){
  try{return JSON.parse(text)}catch(e){}
  const start=text.indexOf("{");
  const end=text.lastIndexOf("}");
  if(start>=0 && end>start) return JSON.parse(text.slice(start,end+1));
  throw new Error("AI가 JSON 형식으로 답하지 않았습니다.");
}

export default {
  async fetch(request, env) {
    const origin=request.headers.get("Origin")||"*";

    if(request.method==="OPTIONS"){
      return new Response(null,{status:204,headers:cors(origin)});
    }

    const url=new URL(request.url);
    if(request.method!=="POST" || url.pathname!=="/autofill"){
      return json({error:"Not found"},404,origin);
    }

    if(!env.OPENAI_API_KEY){
      return json({error:"Worker에 OPENAI_API_KEY secret이 없습니다."},500,origin);
    }

    if(env.APP_TOKEN){
      const given=request.headers.get("X-App-Token")||"";
      if(given!==env.APP_TOKEN){
        return json({error:"연결 암호가 맞지 않습니다."},401,origin);
      }
    }

    let body;
    try{body=await request.json()}catch(e){
      return json({error:"잘못된 요청입니다."},400,origin);
    }

    const word=String(body?.word||"").trim();
    if(!word || word.length>120){
      return json({error:"영단어/표현을 확인해주세요."},400,origin);
    }

    const prompt = `
당신은 한국인 초보 여행영어 학습자를 위한 단어카드 제작자다.
사용자가 입력한 영어 단어/표현: ${JSON.stringify(word)}

반드시 아래 JSON 하나만 출력한다. 마크다운 코드블록 금지.
{
  "word": "${word.replaceAll('"','')}",
  "pronunciation": "한국어식 발음",
  "meaning": "핵심 한국어 뜻 1~3개",
  "mnemonic": "연상법",
  "dialogues": [
    {"en":"A: ...\\nB: ...","ko":"A: ...\\nB: ..."},
    {"en":"A: ...\\nB: ...","ko":"A: ...\\nB: ..."}
  ],
  "similar": "비슷한 표현 또는 주의점"
}

연상법 규칙:
1. 학습자는 그 영어 단어를 모른다. 같은 영어 단어를 다른 영어 구문에 다시 넣어 설명하지 마라.
2. 다른 어려운 영어 단어에 기대지 마라.
3. 가능하면 실제 발음 전체를 한국어 소리와 연결한다.
4. 한국어 소리 → 짧고 이해되는 상황 → 뜻 순서로 만든다.
5. 억지 말장난, 의미 순환, '표지판에서 봄/화면에서 봄/문장째 외워라' 같은 범용 장면을 쓰지 마라.
6. 좋은 발음 연상이 정말 안 되면 억지로 만들지 말고 간단한 구조 설명을 써라.
7. 좋은 스타일 예:
   - deliver: “딜 넣으러 리버를 보낸다!” → 딜 + 리버 ≈ 딜리버 → 전달하다/배달하다.
   - fare: “표값, 빼어!” → 요금 낼 돈을 지갑에서 빼어 냄 → 빼어 ≈ 페어 → 교통요금.
8. 연상법 마지막 줄에는 반드시 “→ ${word} = ...” 형태로 뜻을 다시 적는다.

대화 규칙:
1. 여행 중 실제로 쓸 법한 자연스러운 대화 2개.
2. 각 대화는 A/B 최소 2줄.
3. 영어 대화 안에서 목표 단어/표현을 실제 의미로 사용한다.
4. 'What does this word mean?', 'How do I use this word?', 'I have a question about ...' 같은 단어 공부용 메타 대화 절대 금지.
5. 영어 한 줄 바로 대응하는 자연스러운 한국어 번역을 같은 줄 수로 제공.
6. 서로 다른 여행 상황으로 만들어 다양하게 한다.

발음은 미국식 영어 기준으로 한국인이 읽기 쉬운 한글 표기만 쓴다.
`;

    const apiRes=await fetch(OPENAI_URL,{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model: env.AI_MODEL || "gpt-6-luna",
        input: prompt,
        max_output_tokens: 1400
      })
    });

    const apiData=await apiRes.json();
    if(!apiRes.ok){
      const msg=apiData?.error?.message||"OpenAI API 호출에 실패했습니다.";
      return json({error:msg},502,origin);
    }

    try{
      const text=getOutputText(apiData);
      const card=parseJsonLoose(text);
      return json({card},200,origin);
    }catch(e){
      return json({error:"AI 응답을 읽지 못했습니다. 다시 한 번 눌러주세요."},502,origin);
    }
  }
};
