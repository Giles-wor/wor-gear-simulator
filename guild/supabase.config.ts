// Supabase 연동 설정.
// 여기에 Project URL 과 anon(public) key 를 넣으면 "공동 편집 + 전원 반영"이 켜집니다.
// anon key 는 공개되어도 안전한 키입니다(읽기는 암호문만, 쓰기는 저장 함수의 편집 비밀번호로 보호).
// 비워두면 Supabase 없이 동작: 로컬(브라우저)에만 저장되고 번들 데이터로 표시됩니다.
//
// 설정 방법은 guild/supabase-setup.sql 과 guild/README.md 참고.
export const config = {
  /** 예: https://abcdxyz.supabase.co (프로젝트 ref: cegxyqtymolnazfhppgw) */
  url: 'https://cegxyqtymolnazfhppgw.supabase.co',
  /** Supabase 프로젝트 Settings → API Keys → publishable (sb_publishable_...). 공개 안전. */
  anonKey: 'sb_publishable_4r_qKYT292rMfJhrBA7AeQ_W9Vx-wEJ',
}
