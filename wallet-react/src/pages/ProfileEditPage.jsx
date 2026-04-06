import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Auth, isApiSession } from '../lib/auth';
import { fileToProfileDataUrl } from '../lib/profileImage';

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const [editNick, setEditNick] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editImage, setEditImage] = useState('');
  const [nickChecked, setNickChecked] = useState(false);
  const [nickMsg, setNickMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const s = Auth.getSession();
    if (!s) {
      navigate('/login?next=%2Fprofile%2Fedit', { replace: true });
      return;
    }
    setEditNick(s.nickname || '');
    setEditBio(s.bio || '');
    setEditImage(s.profileImage || '');
  }, [navigate]);

  const checkNicknameDuplicate = async () => {
    const s = Auth.getSession();
    const value = editNick.trim();
    if (!value) {
      setNickChecked(false);
      setNickMsg('* 닉네임을 먼저 입력해 주세요.');
      return;
    }
    if (value === (s?.nickname || '').trim()) {
      setNickChecked(true);
      setNickMsg('* 현재 사용 중인 닉네임입니다.');
      return;
    }
    try {
      if (isApiSession()) {
        const taken = await Auth.existsNicknameRemote(value);
        if (taken) {
          setNickChecked(false);
          setNickMsg('* 이미 사용 중인 닉네임입니다.');
          return;
        }
      } else if (Auth.isNicknameTaken(value, s?.id)) {
        setNickChecked(false);
        setNickMsg('* 이미 사용 중인 닉네임입니다.');
        return;
      }
      setNickChecked(true);
      setNickMsg('* 사용 가능한 닉네임입니다.');
    } catch {
      setNickChecked(false);
      setNickMsg('* 확인에 실패했습니다.');
    }
  };

  const saveProfile = async () => {
    const s = Auth.getSession();
    if (!s) return;
    setSaveMsg('');
    const trimmedNick = editNick.trim();
    const sameAsSaved = trimmedNick === (s.nickname || '').trim();
    if (!trimmedNick) {
      setSaveMsg('닉네임을 입력해 주세요.');
      return;
    }
    if (!sameAsSaved && !nickChecked) {
      setSaveMsg('닉네임을 변경하는 경우 중복확인을 먼저 진행해 주세요.');
      return;
    }
    const result = await Auth.updateProfile({
      nickname: trimmedNick,
      bio: editBio.trim(),
      profileImage: editImage,
    });
    if (!result.ok) {
      setSaveMsg(result.reason || '저장에 실패했습니다.');
      return;
    }
    alert('프로필이 저장되었습니다.');
    navigate('/profile');
  };

  return (
    <Layout>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile" className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-white">
            <iconify-icon icon="lucide:arrow-left" class="text-xl"></iconify-icon>
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900">프로필 수정</h2>
        </div>
        <section className="bg-white rounded-[2rem] border border-orange-50 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6">
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full overflow-hidden border bg-[#f4f5f7] flex items-center justify-center text-slate-500">
                {editImage ? (
                  <img src={editImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <iconify-icon icon="lucide:user-round" class="text-4xl"></iconify-icon>
                )}
              </div>
              <label className="mt-3 px-4 py-2 rounded-xl bg-slate-100 text-xs font-extrabold cursor-pointer">
                이미지 변경
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setEditImage(await fileToProfileDataUrl(file));
                    } catch {
                      alert('이미지 처리에 실패했습니다.');
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">닉네임</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={editNick}
                    onChange={(e) => {
                      setEditNick(e.target.value);
                      setNickChecked(false);
                      setNickMsg('');
                    }}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-100 text-sm"
                  />
                  <button
                    type="button"
                    onClick={checkNicknameDuplicate}
                    className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold"
                  >
                    중복확인
                  </button>
                </div>
                {nickMsg ? (
                  <p className={`text-[11px] font-bold mt-1 ${nickChecked ? 'text-green-600' : 'text-red-500'}`}>{nickMsg}</p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">소개</label>
                <textarea
                  rows={4}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-100 text-sm resize-none"
                  placeholder="간단한 자기소개"
                />
              </div>
              <button
                type="button"
                onClick={saveProfile}
                className="w-full py-3 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600"
              >
                저장
              </button>
              {saveMsg ? <p className="text-[12px] font-bold text-red-500">{saveMsg}</p> : null}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

