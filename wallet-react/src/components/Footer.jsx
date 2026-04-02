export default function Footer() {
  return (
    <footer className="hidden md:block bg-slate-900 text-slate-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <iconify-icon icon="lucide:wallet" class="text-white"></iconify-icon>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                <span className="text-orange-500">지갑</span>지키미
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              물가 상승 시대, 우리의 지갑을 지켜주는 정직한 가성비 식당 정보를 공유합니다. 모든 정보는 사용자들의
              자발적인 참여로 만들어집니다.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold">서비스</h4>
              <span className="relative inline-flex w-fit group">
                <span className="text-sm border-b border-dotted border-slate-500 text-slate-400 cursor-default group-hover:border-orange-500 group-hover:text-orange-500 transition-colors">
                  지갑지키미란?
                </span>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-[calc(100%+10px)] left-0 z-20 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-orange-400/40 bg-gradient-to-br from-orange-500 to-amber-600 px-4 py-3 text-xs font-extrabold leading-snug text-white shadow-lg opacity-0 translate-y-1 invisible transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible"
                >
                  세금은 늘고,, 연봉은 안늘고,, 물가는 오르고,, 견뎌,,!
                  <span className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 border-b border-r border-orange-400/40 bg-amber-600" aria-hidden />
                </span>
              </span>
              <a href="/" className="hover:text-orange-500 transition-colors text-sm">가성비 지도</a>
              <a href="/profile" className="hover:text-orange-500 transition-colors text-sm">프로 등급 안내</a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold">용돈주기</h4>
              <p className="text-sm leading-relaxed text-slate-400">
                국민은행 <span className="font-mono text-slate-300">937702-00-284643</span>
                <br />
                윤경수
              </p>
              <a
                href="mailto:edward4992@naver.com"
                className="hover:text-orange-500 transition-colors text-sm font-bold text-slate-300"
              >
                문의하기 · edward4992@naver.com
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-bold">커뮤니티</h4>
              <a href="#" className="hover:text-orange-500 transition-colors text-sm">지갑 지키기 팁</a>
              <a href="#" className="hover:text-orange-500 transition-colors text-sm">베스트 리뷰어</a>
              <a href="#" className="hover:text-orange-500 transition-colors text-sm">인스타그램</a>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium">
          <p>&copy; 2024 지갑지키미 (WalletKeeper). All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">이용약관</a>
            <a href="#" className="hover:text-white">개인정보처리방침</a>
            <a href="#" className="hover:text-white">위치기반서비스 이용약관</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

