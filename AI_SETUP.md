# AI 자동완성 1회 연결

GitHub Pages는 정적 사이트라 OpenAI API 키를 HTML 안에 넣으면 공개됩니다.
그래서 이 버전은 Cloudflare Worker를 중간에 두도록 만들었습니다.

## Cloudflare Worker 설정
1. Cloudflare에 로그인하고 Workers & Pages에서 Worker를 하나 만듭니다.
2. 이 ZIP의 `ai-worker.js` 내용을 Worker 코드에 붙여넣고 배포합니다.
3. Worker의 Settings → Variables and Secrets에서:
   - `OPENAI_API_KEY` = 본인의 OpenAI API 키 (Secret)
   - `APP_TOKEN` = 본인만 아는 임의의 연결 암호 (Secret, 권장)
   - `AI_MODEL` = `gpt-6-luna` (선택)
4. 배포된 주소 예: `https://travel-english-ai.xxxxx.workers.dev`

## 앱에서
1. ＋ 단어 추가
2. ⚙️ AI 연결 설정
3. Worker 주소 입력
4. APP_TOKEN에 넣은 연결 암호 입력
5. 저장

그 다음부터는:
영단어 입력 → ✨ AI 자동완성
으로 뜻, 발음, 연상법, 여행 대화 2개와 한국어 해석이 자동으로 채워집니다.

중요: OpenAI API 키 자체는 앱 화면이나 GitHub 파일에 넣지 마세요.
