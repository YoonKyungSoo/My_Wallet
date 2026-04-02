import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Auth } from '../lib/auth';

export default function SignupPage() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [idChecked, setIdChecked] = useState(false);
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [idCheckMsg, setIdCheckMsg] = useState('');
  const [nicknameCheckMsg, setNicknameCheckMsg] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkIdDuplicate = async () => {
    const value = id.trim();
    if (!value) {
      setIdChecked(false);
      setIdCheckMsg('* 아이디를 먼저 입력해 주세요.');
      return;
    }
    try {
      const taken = await Auth.existsLoginIdRemote(value);
      if (taken) {
        setIdChecked(false);
        setIdCheckMsg('* 이미 사용 중인 아이디입니다.');
        return;
      }
      setIdChecked(true);
      setIdCheckMsg('* 사용 가능한 아이디입니다.');
    } catch {
      setIdChecked(false);
      setIdCheckMsg('* 확인에 실패했습니다. 네트워크를 확인해 주세요.');
    }
  };

  const checkNicknameDuplicate = async () => {
    const value = nickname.trim();
    if (!value) {
      setNicknameChecked(false);
      setNicknameCheckMsg('* 닉네임을 먼저 입력해 주세요.');
      return;
    }
    try {
      const taken = await Auth.existsNicknameRemote(value);
      if (taken) {
        setNicknameChecked(false);
        setNicknameCheckMsg('* 이미 사용 중인 닉네임입니다.');
        return;
      }
      setNicknameChecked(true);
      setNicknameCheckMsg('* 사용 가능한 닉네임입니다.');
    } catch {
      setNicknameChecked(false);
      setNicknameCheckMsg('* 확인에 실패했습니다. 네트워크를 확인해 주세요.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!idChecked || !nicknameChecked) {
      setSubmitMsg('* 아이디와 닉네임 중복확인을 먼저 진행해 주세요.');
      return;
    }
    setSubmitting(true);
    setSubmitMsg('');
    try {
      await Auth.signup({ id: id.trim(), password, nickname: nickname.trim() });
      navigate('/', { replace: true });
    } catch (err) {
      setSubmitMsg(`* ${err?.message || '가입에 실패했습니다.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout showAddButton={false}>
      <section className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-orange-100 rounded-[2rem] shadow-sm p-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">회원가입</h1>
          <p className="text-sm text-slate-500 mb-6">간단한 정보로 가입할 수 있어요.</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">아이디</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    setIdChecked(false);
                    setIdCheckMsg('');
                    setSubmitMsg('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={checkIdDuplicate}
                  className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800"
                >
                  중복확인
                </button>
              </div>
              {idCheckMsg ? (
                <p className={`text-[11px] font-bold ${idChecked ? 'text-green-600' : 'text-red-500'}`}>{idCheckMsg}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">닉네임</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setNicknameChecked(false);
                    setNicknameCheckMsg('');
                    setSubmitMsg('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={checkNicknameDuplicate}
                  className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800"
                >
                  중복확인
                </button>
              </div>
              {nicknameCheckMsg ? (
                <p className={`text-[11px] font-bold ${nicknameChecked ? 'text-green-600' : 'text-red-500'}`}>{nicknameCheckMsg}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">비밀번호</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:bg-white outline-none"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSubmitMsg('');
                }}
                required
              />
            </div>
            {submitMsg ? <p className="text-[11px] font-bold text-red-500">{submitMsg}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-orange-500 text-white py-3 rounded-2xl font-extrabold hover:bg-orange-600 transition-all disabled:opacity-60"
            >
              {submitting ? '처리 중…' : '가입하기'}
            </button>
          </form>
          <div className="mt-6 text-sm text-slate-600 flex items-center justify-between">
            <Link to="/login" className="font-bold text-orange-600 hover:underline">로그인</Link>
            <Link to="/" className="font-bold hover:underline">메인으로</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

