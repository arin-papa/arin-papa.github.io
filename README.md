# 아린아빠 혜택노트 — 사이트 운영 안내

`site/` 폴더는 그대로 올리면 동작하는 정적 웹사이트입니다. 빌드 과정이나 서버가 필요 없습니다.

```
site/
├── index.html          # 메인 (보기 탭 3개·목록·검색·필터·육아템·추천 쇼핑몰·FAQ·안내 모달)
├── privacy.html        # 개인정보 처리방침·운영 정책 (애드센스 심사용 고정 페이지)
├── style.css           # 전체 스타일 (모바일 퍼스트, 외부 폰트 없음)
├── app.js              # 렌더링·보기 탭·필터·검색·정렬·모달 (라이브러리 없음)
├── data/events.js      # ★ 혜택 데이터 + 육아템 비교 데이터
├── assets/             # 히어로·카테고리 일러스트 (WebP, 직접 생성)
└── robots.txt
```

## 1. 데이터 갱신 — `data/events.js`

목록에 항목을 넣거나 빼는 곳은 이 파일 하나입니다. 카드·탭 개수·통계는 자동으로 다시 계산됩니다.
현재 **무료혜택 43건 · 육아템 13종**(2026-11-18 기준)이 들어 있습니다.

```js
{
  id: "survey-example",          // 고유값 (중복 금지)
  cat: "survey",                 // baby | survey | delivery | contest
  title: "이벤트 이름",
  host: "주관 기관·브랜드",
  benefit: "경품·혜택과 인원",
  condition: "참여 조건 (0원 여부 포함)",
  target: "함안 군민",            // (선택) 대상이 좁혀진 항목의 1줄 조건 — 카드에 '대상' 줄로 표시
  deadline: "2026-11-24T18:00",  // 시각이 없으면 당일 24시 마감으로 계산
  announce: "발표 11/25",
  url: "https://...",            // 원문·응모 페이지 (https 필수)
  urlLabel: "설문 열기",
  source: "출처 표기",
  checked: "2026-11-17",         // 마지막 확인 날짜
  verified: true,                // false 면 카드에 '공유 정보' 배지 + 참여 전 재확인 안내
  posted: "2026-11-17",          // 최신순 정렬 기준
  tip: "한 줄 팁"
}
```

- **마감이 지난 항목은 넣지 않아도 됩니다.** 사이트가 방문 시점 기준으로 자동으로 숨깁니다. (숨긴 개수는 결과 문구에 표시)
- 데이터를 고친 뒤 `site/tools/make-noscript.js` 를 한 번 돌리면 자바스크립트 없는 방문자·검색 크롤러용 `<noscript>` 목록도 함께 갱신됩니다.
- `updatedAt`(맨 위)은 데이터 기준일입니다. 14일이 지나면 목록 위에 “이 목록은 ○○ 기준입니다” 안내가 자동으로 뜹니다.
- 카테고리를 늘리려면 `categories` 배열과 `style.css`의 `.badge--*` 색상만 추가하면 됩니다.

## 2. 이미지

사진 대신 **직접 생성한 일러스트**를 씁니다. 다른 사이트의 캠페인 사진을 스크랩·핫링크하지 않기 위한 선택입니다.

| 파일 | 쓰이는 곳 | 크기 |
| --- | --- | --- |
| `assets/hero.webp` | 히어로 오른쪽 104×104 썸네일 | 1440×810 (42KB) |
| `assets/hero-og.jpg` | 카카오톡·SNS 공유 미리보기(og:image) | 1200×630 (67KB) |
| `assets/prod-*.webp` | 육아템 13종 상품 썸네일(96px, 모바일 80px) | 정사각 |
| `assets/cat-*.webp` | 예비 일러스트 — 리디자인 카드에서는 쓰지 않음 | 800×450 |

- 카드가 고밀도로 바뀌면서 카테고리 대표 이미지는 카드에서 빼고, 색 테두리(`card--baby` 등)로 구분합니다.
- 상품 썸네일은 `loading="lazy"`, 히어로는 첫 화면에 보이므로 `fetchpriority="high"` 로 즉시 로드합니다. 모두 `width`·`height` 를 적어 두어 이미지가 늦게 떠도 글이 밀리지 않습니다.
- 새 일러스트를 만들 때는 같은 톤(크림 #f8f6f1 · 세이지 #2f6b57 · 코랄 #c9522c · 골드 #e5b53f, 글자 없는 플랫 벡터)을 유지하고, PNG 원본은 WebP 로 변환해 올립니다.

## 3. 제휴 링크 넣기 (수익화)

`data/events.js` 아래쪽 `affiliates` 13행에는 두 가지 링크 칸이 있습니다.

- `url` — 네이버 쇼핑커넥트(아린이네 크리에이터 스페이스) 발급 링크 → **네이버** 버튼 (13종 모두)
- `coupangUrl` — 쿠팡 파트너스 발급 링크 → **쿠팡** 버튼 (기존 5종만)

| 필드 | 카드에 나오는 곳 |
| --- | --- |
| `name` · `store` | 상품 이름 · 판매처 |
| `thumb` | 96×96 썸네일 |
| `point` | 핵심 포인트 1줄 |
| `price` · `reviews` | 가격대 · 리뷰 수 |
| `check` | 접힌 ‘고를 때 체크’ 안 |
| `product` | 정식 상품명(접힌 안, `name`과 다를 때만) |

1. 각 제휴 프로그램에서 상품 링크를 발급받습니다.
2. 해당 품목의 `url` / `coupangUrl` 에 넣습니다.
3. 저장하면 육아템 카드 아래에 버튼이 나옵니다. 한쪽 값이 비면 그 버튼만 빠집니다.

버튼에는 `rel="sponsored noopener noreferrer"` 가 이미 붙어 있어 검색엔진 정책(유료 링크 표시)도 충족합니다. 필수 고지 문구(네이버 쇼핑 커넥트·쿠팡 파트너스)는 비교표 아래와 `privacy.html` 6항에 들어 있고, `validate_site.py` 가 두 문구가 빠지지 않았는지 매번 검사합니다.

### 추천 쇼핑몰 섹션 — 애드픽

`index.html` 의 `section#view-picks`(‘추천 쇼핑몰’ 보기 탭)는 애드픽에서 발급받은 링크 3개를 카드로 보여 줍니다. 링크·수수료 조건 원본은 `affiliate/adpick-links-2026-11-17.md` 에 있습니다.

| 카드 | 링크 | 성격 |
| --- | --- | --- |
| 보리보리 (유아동 전문몰) | `https://bitl.bz/r22LhM` | CPS · 구매 시 3% |
| 애드픽 쇼핑메이트 | `https://deg.kr/521f142` | CPA · 무료 가입 |
| 11번가 | `https://bitl.bz/tJc2fZ` | CPS · 최대 2.1% |

- 버튼에는 `rel="sponsored noopener noreferrer"`, `target="_blank"` 를 붙입니다.
- 애드픽 규정상 대가성 문구는 확정형이어야 합니다(“제공받을 수 있습니다” ✗). 표준 문구 **“저는 위 상품·서비스를 소개하면서 애드픽으로부터 수수료를 받습니다.”** 를 섹션 상단과 `privacy.html` 6항에 함께 두고, `validate_site.py` 가 검사합니다.
- 링크를 바꾸거나 추가하면 `validate_site.py` 의 `ADPICK_LINKS` 와 `tools/test_dom.js` 의 링크 검사도 함께 고쳐 주세요.
- 쿠팡 파트너스 링크는 이미 비교표에 있으므로 이 섹션에는 넣지 않았습니다(중복·혼선 방지).

## 4. 광고(애드센스) 넣기

심사 신청 전에 꼭 해 둘 것:

1. **도메인 연결** — (완료) `index.html` 의 canonical 은 `https://arin-papa.github.io/` 로 설정되어 있고, `sitemap.xml` 을 추가해 `robots.txt` 에도 연결해 두었습니다.
2. **고정 페이지 확인** — `privacy.html`(개인정보·면책·문의)이 있고, 푸터에서 링크되는지 확인.
3. **문의 창구** — 현재는 아린이네 블로그 댓글로 안내합니다. 별도 이메일을 쓰려면 `index.html` 푸터와 `privacy.html` 7항을 바꿔 주세요.
4. **광고 코드 삽입 위치** — 목록 카드 사이에 넣을 때는 `.listings` 안, 카드 6~9번째 뒤가 자연스럽습니다. 광고임을 알 수 있게 `광고` 라벨을 붙이는 편이 안전합니다.

애드센스는 “복제·스크랩 콘텐츠” 사이트를 거절합니다. 이 사이트는 원문 본문을 옮기지 않고 사실만 요약했으니, **카드 문장을 다른 사이트에서 긁어오지 말고 항상 직접 요약**해 주세요.

## 5. 배포

현재 배포 주소: **https://arin-papa.github.io/** — 저장소 `arin-papa/arin-papa.github.io` 의 `main` 브랜치 루트에서 GitHub Pages로 서빙 중입니다. 이 폴더의 배포 대상 파일(`index.html`, `privacy.html`, `style.css`, `app.js`, `data/`, `assets/`, `robots.txt`, `sitemap.xml`)을 그대로 복사해 푸시하면 1분 안에 반영됩니다. (`tools/` 는 개발용이라 올리지 않습니다.)

정적 파일이므로 다른 곳에도 올릴 수 있습니다.

- **Netlify / Cloudflare Pages** — `site` 폴더를 드래그해 업로드
- **GitHub Pages** — 저장소 `docs/` 또는 `gh-pages` 브랜치에 `site/` 내용을 올림
- **surge.sh** — `npx surge site 내도메인.surge.sh`

배포 후 `https://도메인/` 이 열리고, 카테고리 탭·검색·정렬·안내 모달이 동작하는지 한 번 확인해 주세요.

## 6. 검증

작업 폴더 기준으로 아래 두 스크립트를 돌리면 구조·문법·동작을 한 번에 확인합니다.

```bash
python3 site/tools/validate_site.py               # HTML/CSS/JS 구조 + duktape 동작 검사
<node> site/tools/test_site.js                    # Node 로 필터·검색·정렬·표시형식 54건
<node> site/tools/test_dom.js                     # 가짜 DOM 으로 렌더·보기 탭·모달·육아템 카드 배선 46건
<node> site/tools/make-noscript.js                # 데이터를 고친 뒤 <noscript> 목록 재생성
```

`<node>` 는 이 환경의 `~/.local/lib/python3.12/site-packages/playwright/driver/node` 입니다(npm 미설치).

## 7. 하지 말아야 할 것

- `modan.kr`(모두의체험단) 등 타 사이트의 디자인·CSS·문구·상세 본문 복제
- 크롤링으로 긁은 캠페인 본문·이미지를 그대로 게시
- ‘0원’이라고 적어 놓고 실제로는 배송비·선구매가 필요한 항목을 넣는 것 (사이트 신뢰도와 애드센스 정책 양쪽에 문제)
