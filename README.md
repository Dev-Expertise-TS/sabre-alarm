# sabre-alarm

## 📌 프로젝트 개요
`sabre-alarm`은 **투어비스 셀렉트 고객 상담 데이터**를 기반으로,  
예약이 확정되지 않은 고객에게 상담했던 숙소 가격보다 **5천 원 이상 저렴한 가격이 Sabre API에서 확인되면**  
내부 CS 담당자가 포함된 **Slack 채널로 알람을 발송**하는 Node.js 기반 서비스입니다.

- 서버 환경: **DigitalOcean Droplet**
- 프로세스 관리: **pm2**
- 데이터 저장소: **Supabase**
- 외부 API: **Sabre API (호텔 가격 조회)**
- 참고 사항: https://github.com/Dev-Expertise-TS/sabreapi 프로젝트 코드와 통합되어있습니다.
  Github 소스(https://github.com/Dev-Expertise-TS/sabre-alarm) 는 별도의 형상관리 용도로만 사용됩니다.
  DigitalOcean Droplet 서버에 구성되어 있으며 서버 운영시 수동 배포가 편리하여 pm2로 직접 실행하는 형태로 운영됩니다.

---

## ⚙️ 주요 기능
- **Supabase 뷰 조회** → 예약 확정되지 않은 상담 데이터 가져오기
- **Sabre API 호출** → 실시간 객실 가격 비교
- **가격 조건 로직**
    - 상담가 - 제안가 ≥ 5,000원 → 알람 발송
    - 최초 제안가가 없을 경우 → 상담가 기준으로 비교
    - 이미 제안한 경우 → 이전 제안가 대비 5,000원 이상 저렴해야 재알람
- **Slack 알림 발송**
    - 상담 내역 및 가격 비교 정보를 Block Kit 형식으로 메시지 전송
- **배치 실행 (node-cron)**
    - 매주 월~금 오전 9시(KST)에 자동 실행

---

## 📂 프로젝트 구조
``````
/lib
├─ AlarmSend.js # Slack Web API 메시지 전송
├─ PriceAlarmBlocksTemplate.js # Slack 메시지 Block 템플릿
├─ SabreService.js # Sabre API 호출, 가격 비교, DB 업데이트 및 알람 발송 로직
/routes/ota
└─ consultReservationOfferPrice.js # Supabase 조회 → SabreService 실행
/services
└─ PriceAlarmService.js # Cron 스케줄링 (평일 9시 실행)
/config # 환경 설정
```````

---

## 🚀 설치 및 실행


###  서버 클론
```bash
git clone https://github.com/Dev-Expertise-TS/sabre-alarm.git
cd sabre-alarm
```

### 의존성 설치
```bash
npm install
```

### 환경 변수 설정 (.env)
SLACK_TOKEN=your_slack_bot_token
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_key
EXCHANGE_RATE_API_KEY=xxxxxx

### 실행 및 운영관리
https://tidesquare.atlassian.net/wiki/spaces/TE/pages/5561548946


### 📡 주요 동작 흐름
PriceAlarmService → node-cron으로 예약 실행
consultReservationOfferPrice → Supabase 조회
SabreService.saveOfferPriceHist → Sabre API 가격 가져오기 & 조건 검사
조건 충족 시 DB 업데이트 & AlarmSend → Slack 채널로 알람 발송


### 🛠️ 기술 스택
Node.js (Express 없음, 배치형 서비스)
pm2 (프로세스 관리)
Supabase (데이터 저장/조회)
Slack Web API (알람 발송)
Sabre API (호텔 요금 조회)
node-cron (스케줄링)
