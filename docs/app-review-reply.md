# App Review 답변 (2.1 — 추가 정보 요청)

App Store Connect → 앱 → 앱 심사 메시지(Resolution Center)에 답장으로 붙여 넣고,
**같은 내용을 버전 페이지 → 앱 심사 정보 → 메모(Notes)에도** 넣는다(Apple이 둘 다 요구).
메모 칸은 영상 파일을 못 받으므로 영상은 링크(구글 드라이브 "링크가 있는 사용자" 공개,
또는 유튜브 "일부 공개")로 넣고, 답장에는 영상 파일을 직접 첨부해도 된다.

`<...>` 부분만 채운다.

---

Hello App Review Team,

Thank you for reviewing Chaeksup (책숲). Please find the requested information below.

**1. Screen recording**

Recorded on a physical iPhone running iOS <버전, 예: 26.0>: <영상 링크>

The recording starts from launching the app and shows: sign-up with email, onboarding
(terms consent, adding a child profile), recording a book (title search, rating, feelings,
photo), the bookshelf, joining a group and viewing its recommended books and homework,
switching to the teacher ("forest keeper") profile and creating homework, reporting a
group and a question, blocking a group's creator, logging out and in, and deleting the
account (Profile tab → Settings → "계정 삭제하기").

**2. Purpose and target audience**

Chaeksup is a reading log for young children (roughly ages 3–10) that parents, teachers
and libraries keep together. The audience is parents and educators in Korea; accounts are
created and operated by adults (parents or teachers) on behalf of children. It is not
designed for children to use on their own and is not in the Kids category.

The problem: parents want a fast way to keep track of what their child reads, and teachers
who assign reading homework have no simple way to see which books each child has finished.
Chaeksup lets a parent log a book in under 30 seconds (barcode scan or title search,
star rating, feelings, an optional photo or voice note), see the child's bookshelf and
earned badges, and receive reading lists and homework from the child's class. Teachers
create a group, share an invite code, post recommended books and homework, and see each
child's completion — without access to the child's photos or voice recordings.

**3. How to access the main features**

Demo account (email / password): <sangwkk@naver.com> / <비밀번호>

There is a single account type. One account can hold both a child profile (parent view)
and a "forest keeper" (teacher/organization) profile; switch between them from the
Profile tab (rightmost tab) → "아이 / 숲지기".

- Parent view: 오늘 (Today) shows reading stats and homework; 책장 (Bookshelf) lists
  logged books; the green 추가 (Add) tab logs a new book — type a title (e.g. "구름빵")
  and pick a result, choose stars and feelings, then 저장; 그룹 (Group) shows homework
  and recommended books from groups the child belongs to.
- Teacher view (switch profile to 숲지기): dashboard, children, recommended books
  (+ 책 추가), and homework (+ 숙제 만들기).
- Report / block: open any public group (Profile → 그룹 찾기 → 둘러보기 → tap a group)
  and scroll to the bottom for "이 그룹 신고하기" (report) and "숲지기 차단하기" (block
  the creator). Questions in the "오늘의 질문" box (Add tab → 더 남기기) added by other
  users have a "신고" (report) button.
- Account deletion: Profile tab → bottom → "계정 삭제하기" → confirm twice.

No sample files are needed. Camera and microphone are optional (barcode scanning,
photos, voice notes).

**User-generated content and moderation.** Content that other users can see is limited
to group names/descriptions, recommended book lists and a shared bank of reading
questions; there is no chat, comments or messaging. Users can report a group or a
question and block a group's creator; reported content and everything from blocked users
disappears from the reporter's view immediately. Reports are stored in our database and
reviewed by the developer within 24 hours; offending content is removed and the account
suspended or deleted. Our Terms of Use (shown and agreed to at sign-up) state that
objectionable content and abusive users are not tolerated. Support:
https://booklog-13xh.vercel.app/support

**4. External services**

- Supabase — authentication (email/password), database and file storage (photos,
  voice notes).
- Vercel — hosting of the app's web content, which the iOS app loads.
- Kakao Book Search API (Kakao Developers) — book titles, authors, publishers and
  cover images for search and barcode lookup.
- Google Fonts — typefaces.

The app uses no payment processors, advertising, analytics or AI services.

**5. Regional differences**

The app functions identically in all regions. The interface is in Korean and the book
database mainly covers books published in Korea, but no feature is restricted or changed
by region.

**6. Regulated industry / third-party material**

The app does not operate in a regulated industry and contains no paid content. Book
metadata and cover images are provided through the Kakao Book Search API under the Kakao
Developers terms of service. All illustrations and characters in the app are original
artwork created by the developer.

Thank you,
<이름>
