/** 공통 사이트 크레딧 / 길드 홍보 / 저작권·상표 면책 바 (전 앱 공용, 맨 위 노출). */
export function SiteCredit() {
  return (
    <div className="siteCredit">
      <div className="guildPromo">
        <div className="guildPromoHead">
          <span className="guildPromoTitle">🛡️ Time 길드 길드원 모집 중!</span>
          <span className="guildPromoBtns">
            <a
              className="guildPromoYt"
              href="https://www.youtube.com/@vrcreator2026"
              target="_blank"
              rel="noopener noreferrer"
            >
              ▶ 길드 유튜브
            </a>
            <a
              className="guildPromoKakao"
              href="https://open.kakao.com/o/sAAVWMAg"
              target="_blank"
              rel="noopener noreferrer"
            >
              💬 피드백 · 문의 (카톡 오픈채팅)
            </a>
          </span>
        </div>
        <p className="guildPromoBody">
          함께 성장할 길드원을 찾습니다! 공략 · 장비 세팅 · 소환 꿀팁을 나누는 활발한 길드예요.
          <strong> 버그 제보 · 개선 제안 · 길드 가입 문의는 위 카카오톡 오픈채팅</strong>으로 편하게 남겨주세요
          (익명 OK). 본 사이트의 모든 계산기도 Time 길드가 직접 제작했습니다 — 더 많은 공략은{' '}
          <a href="https://www.youtube.com/@vrcreator2026" target="_blank" rel="noopener noreferrer">
            유튜브 채널
          </a>
          에서!
        </p>
      </div>
      <div className="siteCreditSub">
        본 페이지는 <strong>Time 길드</strong>(마스터 자일스) 제작 · 비공식 팬 도구입니다.
        <em> Watcher of Realms</em> 및 모든 게임 명칭·이미지·데이터의 저작권은 MOONTON Games(Shanghai Moonton
        Technology)에 있으며, 본 사이트는 게임사와 무관합니다. 확률·수치는 추정값이 포함될 수 있어 정확성을
        보증하지 않습니다. © 2026 Time 길드.
      </div>
    </div>
  )
}
