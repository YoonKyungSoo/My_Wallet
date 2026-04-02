import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Auth } from '../lib/auth';
import { pushUnbanRequest } from '../lib/unbanRequests';

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = useMemo(() => params.get('next') || '/', [params]);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [bannedUserId, setBannedUserId] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBannedUserId(null);
    setBanReason('');
    setSubmitting(true);
    try {
      const res = await Auth.login({ id, password });
      if (!res.ok) {
        if (res.code === 'banned') {
          setBannedUserId(res.userId);
          // res.reason 을 정지 사유로 별도 표시 (백엔드 구현 시 정지사유를 여기에 내려주면 됨)
          setBanReason(res.reason || '');
          setLoginError('정지된 회원입니다.');
          return;
        }
        setLoginError(res.reason || '아이디 또는 비밀번호가 올바르지 않습니다.');
        return;
      }
      setLoginError('');
      navigate(next, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout showAddButton={false}>
      <section className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-orange-100 rounded-[2rem] shadow-sm p-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">로그인</h1>
          <p className="text-sm text-slate-500 mb-6">계정으로 로그인해 주세요.</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">아이디</label>
              <input
                className={`w-full px-4 py-3 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none ${
                  loginError ? 'bg-red-50 border border-red-200' : 'bg-slate-100'
                }`}
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  if (loginError) setLoginError('');
                  setBannedUserId(null);
                  setBanReason('');
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">비밀번호</label>
              <input
                type="password"
                className={`w-full px-4 py-3 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none ${
                  loginError ? 'bg-red-50 border border-red-200' : 'bg-slate-100'
                }`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError('');
                  setBannedUserId(null);
                  setBanReason('');
                }}
                required
              />
            </div>
            {loginError ? (
              <p className="text-[12px] font-bold text-red-500">* {loginError}</p>
            ) : null}
            {bannedUserId && banReason ? (
              <p className="text-[12px] font-bold text-amber-700">정지 사유: {banReason}</p>
            ) : null}
            {bannedUserId ? (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  관리자가 요청을 확인한 뒤 정지를 해제할 수 있습니다.
                </p>
                <button
                  type="button"
                  className="w-full py-3 rounded-xl bg-amber-600 text-white text-sm font-extrabold hover:bg-amber-700"
                  onClick={async () => {
                    const r = await pushUnbanRequest(bannedUserId);
                    alert(r.ok ? '정지 해제 요청이 접수되었습니다.' : r.reason);
                  }}
                >
                  정지 해제 요청하기
                </button>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-orange-500 text-white py-3 rounded-2xl font-extrabold hover:bg-orange-600 transition-all disabled:opacity-60"
            >
              {submitting ? '처리 중…' : '로그인'}
            </button>
          </form>
          <div className="mt-6 text-sm text-slate-600 flex items-center justify-between">
            <Link to="/signup" className="font-bold text-orange-600 hover:underline">회원가입</Link>
            <Link to="/" className="font-bold hover:underline">메인으로</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

