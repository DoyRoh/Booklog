# 책숲 앱스토어·플레이스토어 출시 가이드

책숲은 Vercel에 배포된 웹앱(Next.js)을 **Capacitor**로 감싼 네이티브 앱으로 스토어에 올립니다.
앱은 웹을 그대로 띄우는 "원격 URL" 방식이라(`capacitor.config.ts`의 `server.url`),
화면·기능을 고치면 **웹을 배포하는 것만으로 앱도 같이 바뀝니다** — 스토어에 다시 올리는 건
아이콘·권한 문구·네이티브 설정을 바꿀 때뿐입니다.

이 저장소에 이미 들어 있는 것:

| 경로 | 내용 |
|---|---|
| `capacitor.config.ts` | 앱 ID(`com.chaeksup.app`), 이름(책숲), 서버 URL, 스플래시·상태바 설정 |
| `ios/` | Xcode 프로젝트(Swift Package Manager, CocoaPods 불필요). 카메라·마이크·사진첩 권한 문구, 세로 고정 포함 |
| `android/` | Android Studio 프로젝트. 카메라·마이크 권한, 세로 고정 포함 |
| `assets/` | 아이콘·스플래시 원본(1024·2732). `npm run cap:assets`로 양쪽 플랫폼 자산을 다시 생성 |
| `native/www/` | 서버에 못 닿을 때(비행기 모드 등) 보여주는 오프라인 안내 페이지 |
| `lib/native.ts` | 웹 쪽에서 네이티브 스플래시 내리기·상태바 색 바꾸기(브라우저에선 아무 동작 안 함) |

---

## 0. 먼저 결정할 것 (첫 업로드 전, 나중에 못 바꿈)

- **번들 ID / 패키지명**: 지금은 `com.chaeksup.app`. 바꾸려면 `capacitor.config.ts`의 `appId`, `android/app/build.gradle`의 `applicationId`, `android/app/src/main/res/values/strings.xml`의 `package_name`·`custom_url_scheme`, Xcode의 Bundle Identifier를 전부 같은 값으로.
- **서버 URL**: 지금은 `https://booklog-13xh.vercel.app`. 커스텀 도메인을 붙일 계획이면 **스토어에 올리기 전에** 도메인을 먼저 붙이고 `capacitor.config.ts`의 `SERVER_URL`을 바꾼 뒤 `npx cap sync`. (앱은 이 주소를 하드코딩해서 들고 나가므로, 나중에 주소가 바뀌면 앱 업데이트를 다시 올려야 합니다. 도메인이 있으면 Vercel 쪽만 옮기면 되니 훨씬 안전합니다.)
- **앱 이름**: 스토어 표시명은 "책숲". 이미 같은 이름의 앱이 있으면 "책숲 – 아이 독서 기록" 같은 부제를 붙이는 식으로 등록 단계에서 조정합니다.

## 1. 계정 만들기 (돈이 드는 유일한 단계)

| | Apple | Google |
|---|---|---|
| 프로그램 | Apple Developer Program | Google Play Console |
| 비용 | 연 $99 (약 13만 원) | 1회 $25 |
| 가입 | developer.apple.com/programs → Apple ID로 등록. 개인 명의 가능(법인은 D-U-N-S 번호 필요) | play.google.com/console → Google 계정으로 등록 |
| 승인 시간 | 보통 1~2일 | 즉시~2일. **신규 개인 계정은 본인 확인 + "테스터 20명 × 14일" 비공개 테스트를 거쳐야 정식 출시 가능**(2023년 11월 이후 정책) |

Google 쪽 "테스터 20명 14일" 조건은 지인·학부모에게 테스트 링크를 돌려 채우면 됩니다. 이 기간 동안엔 비공개 테스트 트랙만 쓸 수 있습니다.

## 2. Mac 준비

```bash
# Xcode: App Store에서 설치(용량 큼, 1시간 이상). 설치 후 한 번 실행해 추가 구성 요소 설치 승인.
xcode-select --install          # 커맨드라인 도구
# Android Studio: developer.android.com/studio 에서 설치. 첫 실행 마법사에서 SDK 설치.

# 저장소 받기 + 의존성
git clone <이 저장소>
cd Booklog
npm install
npx cap sync                    # 웹 자산(오프라인 페이지)·플러그인을 ios/, android/에 복사
```

## 3. iOS — 시뮬레이터에서 먼저 켜 보기

```bash
npm run cap:ios                 # Xcode가 열림
```

1. 왼쪽 프로젝트 → **App** 타깃 → **Signing & Capabilities** → Team에 본인 Apple 개발자 계정 선택. Bundle Identifier가 `com.chaeksup.app`인지 확인(다른 사람이 이미 쓴 ID면 여기서 바꿈).
2. 상단 기기 선택에서 iPhone 시뮬레이터 하나 고르고 ▶ 실행. 밤 숲 스플래시 → 로그인 화면이 뜨면 성공.
3. 실제 iPhone으로 보려면 USB로 연결 → 기기 선택 → ▶. 첫 실행 때 iPhone 설정 → 일반 → VPN 및 기기 관리에서 개발자 앱 신뢰.
4. **App Privacy 파일 추가(권장)**: File → New → File → "App Privacy" 선택 → `PrivacyInfo.xcprivacy` 생성. 내용은 추적 없음(Privacy Tracking Enabled = NO), 수집 데이터 없음으로 둡니다. 실제 데이터 수집 항목은 App Store Connect의 "앱 개인정보 보호" 설문에서 답합니다(아래 5단계).

확인할 것: 바코드 스캔(카메라 권한 팝업이 한글 문구로 뜨는지), 낭독 녹음(마이크), 사진 첨부(사진첩), 상태바 글자가 스플래시 땐 흰색·평소엔 진한 색인지, 하단 홈바와 탭바가 겹치지 않는지.

## 4. Android — 에뮬레이터에서 켜 보기

```bash
npm run cap:android             # Android Studio가 열림
```

1. 처음 열면 Gradle 동기화가 몇 분 걸립니다(오류가 나면 File → Sync Project with Gradle Files).
2. 상단 기기에서 에뮬레이터(없으면 Device Manager에서 Pixel 하나 생성) 고르고 ▶.
3. 실제 안드로이드 폰은 개발자 옵션 → USB 디버깅 켜고 연결.

확인할 것: 카메라·마이크 권한 팝업, 뒤로 가기 버튼이 화면 뒤로 가기로 동작하는지(맨 처음 화면에서 한 번 더 누르면 앱 종료), 상태바 색.

## 5. App Store 올리기

1. **App Store Connect**(appstoreconnect.apple.com) → 나의 앱 → + → 새로운 앱. 플랫폼 iOS, 이름 "책숲", 기본 언어 한국어, 번들 ID 선택(2단계 Xcode에서 한 번 실행하면 목록에 생김), SKU 아무 문자열.
2. Xcode에서 기기 선택을 **Any iOS Device (arm64)** 로 → Product → **Archive** → Organizer 창에서 **Distribute App** → App Store Connect → Upload. 5~30분 뒤 App Store Connect의 TestFlight 탭에 빌드가 뜹니다.
3. **TestFlight**로 먼저 배포: 내부 테스터(본인·가족)에게 TestFlight 앱으로 설치시켜 실기기에서 한 번 더 확인. 외부 테스터(학부모 등)는 간단 심사 후 최대 1만 명.
4. **앱 정보 채우기** — 필요한 자산:
   - 스크린샷: 6.7형(iPhone 15 Pro Max 등, 1290×2796) 최소 1장, 권장 3~6장. 6.5형·5.5형도 요구되면 같은 이미지를 리사이즈해 올려도 됨. 시뮬레이터에서 ⌘S로 찍으면 정확한 크기가 나옵니다.
   - 설명(4000자 이내), 부제(30자), 키워드(100자, 쉼표 구분: 독서기록,독서,어린이,그림책,책장,숙제,유치원,학원), 지원 URL(문의 받을 페이지 — 없으면 노션 페이지나 이메일 안내 페이지 하나), **개인정보 처리방침 URL: `https://<도메인>/privacy`** (이미 앱에 있음).
   - 연령 등급: 설문에 전부 "없음" → 4+.
   - 카테고리: 교육(주), 도서(부).
5. **앱 개인정보 보호** 설문(중요, 정직하게):
   - 수집하는 데이터: 이메일(계정), 이름(아이 이름 — "이름"), 사진 또는 비디오(선택 첨부), 오디오 데이터(선택 녹음), 사용자 콘텐츠(독서 메모). 전부 "앱 기능"용, "사용자와 연결됨", "추적에 사용 안 함".
   - 서드파티 추적/광고 SDK 없음 → 추적 없음.
6. 심사 제출. 심사 메모에 **테스트 계정(이메일·비밀번호)** 을 꼭 적습니다 — 로그인 없이는 화면을 못 보므로 없으면 바로 반려됩니다. 그룹·숙제가 들어 있는 계정이면 더 좋습니다.

### Apple 심사에서 걸릴 수 있는 것 (미리 알고 가기)

- **4.2 최소 기능**: "웹사이트를 그냥 감싼 앱"은 반려될 수 있습니다. 책숲은 카메라 바코드 스캔·녹음·사진 첨부·홈 화면 스플래시 등 앱다운 기능이 있어 통과 가능성이 높지만, 반려되면 답장에 이 기능들을 구체적으로 설명하고(리뷰어가 못 봤을 수 있음) 테스트 계정으로 재현 경로를 적어 재심사 요청합니다. 그래도 안 되면 **푸시 알림(숙제 알림)** 을 붙이는 게 가장 확실한 대응입니다 — 웹으로는 iOS에서 제한적인 기능이라 "앱이어야 하는 이유"가 됩니다(다음 라운드 후보).
- **5.1.1 개인정보**: 아이 정보를 다루므로 개인정보 처리방침 URL이 반드시 있어야 하고(있음), 회원 탈퇴/계정 삭제 방법이 앱 안에 있어야 합니다(**5.1.1(v)**). 지금 앱엔 계정 삭제 화면이 없습니다 — 심사 전에 "프로필·설정 → 계정 삭제" 를 추가하는 걸 권합니다(별도 라운드로 바로 만들 수 있음). 임시로는 처리방침 페이지에 "이메일로 요청 시 처리"를 명시하는 것도 허용되는 경우가 있으나 반려 위험이 있습니다.
- **키즈 카테고리**는 선택하지 않습니다(부모가 쓰는 앱). 키즈 카테고리로 넣으면 훨씬 엄격한 규정(외부 링크 제한 등)이 적용됩니다.
- 로그인 화면에 "Apple로 로그인"이 **필수는 아닙니다**(다른 소셜 로그인이 없고 이메일 로그인만 있으면 4.8 규정 미적용).

## 6. Google Play 올리기

1. **서명 키 만들기** (한 번만, 절대 분실 금지 — 잃어버리면 같은 앱으로 업데이트를 영영 못 올림):
   ```bash
   keytool -genkey -v -keystore ~/chaeksup-upload.keystore -alias chaeksup -keyalg RSA -keysize 2048 -validity 10000
   ```
   비밀번호를 비밀번호 관리자에 저장. Play Console은 "Play 앱 서명"을 쓰므로 이 키는 "업로드 키"가 되고, 잃어버려도 구글에 재설정 요청은 가능하지만 번거롭습니다.
2. `android/keystore.properties` 파일을 만들고(**git에 올리지 마세요** — `.gitignore`에 추가돼 있음):
   ```
   storeFile=/Users/<이름>/chaeksup-upload.keystore
   storePassword=...
   keyAlias=chaeksup
   keyPassword=...
   ```
   `android/app/build.gradle`에 이 파일을 읽는 signingConfig가 들어 있습니다.
3. Android Studio → Build → **Generate Signed Bundle / APK** → **Android App Bundle(.aab)** → 위 키 선택 → release. 또는 터미널에서 `cd android && ./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`.
4. Play Console → 앱 만들기(이름 책숲, 기본 언어 한국어, 앱, 무료) → 대시보드의 "앱 설정" 항목을 순서대로: 개인정보 처리방침 URL, 앱 액세스 권한(**테스트 계정 정보 입력**), 광고 없음, 콘텐츠 등급 설문(전체 이용가), 타겟층(**18세 이상 — 부모가 쓰는 앱으로 등록**; "어린이 대상"으로 하면 가족 정책 심사가 추가됨), 데이터 보안 설문(Apple 5번과 같은 내용: 이메일·이름·사진·오디오·앱 활동, 암호화 전송, 삭제 요청 가능).
5. 스토어 등록정보: 아이콘 512×512(`assets/icon-only.png`를 512로 줄여서), 그래픽 이미지 1024×500(스플래시 그림을 가로로 잘라 쓰면 됨), 휴대전화 스크린샷 최소 2장(에뮬레이터에서 찍기), 간단한 설명(80자), 자세한 설명(4000자).
6. 테스트 → **비공개 테스트** 트랙에 .aab 업로드 → 테스터 이메일 목록 등록 → 링크 공유. 신규 개인 계정은 여기서 20명·14일을 채운 뒤 "프로덕션 액세스 신청" → 승인 후 프로덕션 트랙에 올립니다.

## 7. 업데이트할 때

- **화면·기능 수정**: 웹만 배포(지금처럼 git push → Vercel). 앱은 다음에 켤 때 그대로 새 화면을 봅니다. 스토어 심사 없음.
- **아이콘·스플래시·권한 문구·서버 주소·네이티브 플러그인 변경**: 버전 올리기 → 다시 빌드·업로드.
  - iOS: Xcode → App 타깃 → General → Version(1.0 → 1.1)과 Build(1 → 2). Build 번호는 업로드마다 항상 커져야 합니다.
  - Android: `android/app/build.gradle`의 `versionCode`(정수, 업로드마다 +1)와 `versionName`("1.1").
- 아이콘/스플래시 그림을 바꿨으면 `assets/` 원본을 갈고 `npm run cap:assets`.

## 8. 아직 안 한 것 / 다음 후보

- **계정 삭제 화면** — Apple 5.1.1(v) 대응, 심사 전 권장.
- **푸시 알림(숙제 등록·마감 알림)** — Apple 4.2 반려 시 가장 확실한 대응이자 실제 재방문을 만드는 기능. Firebase Cloud Messaging 또는 OneSignal + Supabase 함수가 필요해 별도 라운드.
- **딥링크/유니버설 링크** — 비밀번호 재설정 메일의 링크는 지금은 사파리/크롬에서 열리고 거기서 재설정이 끝납니다(동작엔 문제 없음). 앱 안에서 바로 열리게 하려면 도메인 소유 확인 파일(`apple-app-site-association`, `assetlinks.json`)이 필요합니다.
- **iPad 레이아웃** — iPhone 전용(세로)으로 제출해도 되고, iPad 지원을 켜면 큰 화면 스크린샷도 요구됩니다. 지금 설정은 iPhone·iPad 둘 다 켜져 있으니, iPad를 뺄 거면 Xcode → General → Supported Destinations에서 iPad 제거.
