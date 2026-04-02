import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Auth } from '../lib/auth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [accountPanel, setAccountPanel] = useState('menu');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const openPasswordPanel = () => {
    setAccountPanel('password');
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setPasswordError('');
    document.getElementById('panel-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitPasswordChange = async () => {
    setPasswordError('');
    if (!currentPassword.trim()) {
      setPasswordError('현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (!newPassword) {
      setPasswordError('새 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('새 비밀번호와 확인이 일치하지 않습니다.');
      return;
    }
    const res = await Auth.changePassword({ currentPassword, newPassword });
    if (!res.ok) {
      setPasswordError(res.reason || '비밀번호 변경에 실패했습니다.');
      return;
    }
    setAccountPanel('menu');
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    alert('비밀번호가 변경되었습니다.');
  };

  return (
    <Layout>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/profile" className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-white">
            <iconify-icon icon="lucide:arrow-left" class="text-xl"></iconify-icon>
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900">환경설정</h2>
        </div>

        <section className="space-y-6">
            <div id="panel-notice" className="bg-white rounded-[2rem] border border-orange-50 shadow-sm p-7 sm:p-10">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-4">알림 설정</h3>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-6 bg-slate-50 rounded-3xl p-5 border border-slate-100"><p className="text-sm font-extrabold text-slate-900">푸시 알림 설정</p><span className="text-xs font-bold text-green-600">ON</span></div>
                <div className="flex items-start justify-between gap-6 bg-slate-50 rounded-3xl p-5 border border-slate-100"><p className="text-sm font-extrabold text-slate-900">위치 정보 공유</p><span className="text-xs font-bold text-slate-400">OFF</span></div>
                <div className="flex items-start justify-between gap-6 bg-slate-50 rounded-3xl p-5 border border-slate-100"><p className="text-sm font-extrabold text-slate-900">이벤트 알림</p><span className="text-xs font-bold text-green-600">ON</span></div>
              </div>
            </div>

            <div id="panel-privacy" className="bg-white rounded-[2rem] border border-orange-50 shadow-sm p-7 sm:p-10">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-4">개인정보 설정</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100"><span className="font-bold text-slate-700">공개 프로필</span><span className="text-xs font-extrabold text-green-600">ON</span></div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100"><span className="font-bold text-slate-700">활동 이력 공개 범위</span><span className="text-xs font-extrabold text-orange-500">전체 공개</span></div>
              </div>
            </div>

            <div id="panel-account" className="bg-white rounded-[2rem] border border-orange-50 shadow-sm p-7 sm:p-10">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-4">계정 관리</h3>

              {accountPanel === 'password' ? (
                <div className="space-y-4 max-w-md">
                  <p className="text-sm font-bold text-slate-600">비밀번호 변경</p>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">현재 비밀번호</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordError('');
                      }}
                      className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">새 비밀번호</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError('');
                      }}
                      className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">새 비밀번호 확인</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPasswordConfirm}
                      onChange={(e) => {
                        setNewPasswordConfirm(e.target.value);
                        setPasswordError('');
                      }}
                      className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                    />
                  </div>
                  {passwordError ? <p className="text-sm font-bold text-red-500">{passwordError}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={submitPasswordChange}
                      className="px-6 py-3 rounded-2xl bg-orange-500 text-white font-extrabold hover:bg-orange-600"
                    >
                      비밀번호 저장
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountPanel('menu');
                        setPasswordError('');
                      }}
                      className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-800 font-extrabold hover:bg-slate-200"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={openPasswordPanel}
                    className="py-3 rounded-2xl bg-slate-50 border border-slate-100 font-extrabold text-sm text-slate-700 hover:bg-slate-100"
                  >
                    비밀번호 변경
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      alert('연동 관리 기능은 다음 버전 업데이트에서 제공할 예정입니다.')
                    }
                    className="py-3 rounded-2xl bg-slate-50 border border-slate-100 font-extrabold text-sm text-slate-700 hover:bg-slate-100"
                  >
                    연동 관리
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      Auth.logout();
                      navigate('/', { replace: true });
                    }}
                    className="py-3 rounded-2xl bg-red-50 border border-red-100 font-extrabold text-sm text-red-500 hover:bg-red-100/80"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
        </section>
      </main>
    </Layout>
  );
}

