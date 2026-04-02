import { apiFetch, isApiConfigured } from './api.js';

const USERS_KEY = 'wallet_users';
const LEGACY_USER_KEY = 'wallet_beggars_user';
const SESSION_KEY = 'wallet_beggars_session';

/** Spring `UserLookupService.LOGIN_HEADER` 와 동일 */
export const LOGIN_HEADER = 'X-Login-Id';
/** Spring `AdminUserController.ADMIN_LOGIN_HEADER` 와 동일 */
export const ADMIN_LOGIN_HEADER = 'X-Admin-Login-Id';

export const AUTH_CHANGED = 'wallet-auth-changed';

function notifyAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGED));
  }
}

function readRawSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Spring API 로그인 세션 (UserResponse 기반, JWT 없어도 동일).
 * 백엔드는 X-Login-Id / X-Admin-Login-Id 로 인증함.
 */
export function isApiSession() {
  const s = readRawSession();
  return s?.source === 'api' && Boolean(s?.id);
}

function sessionHeaders(includeAdmin) {
  const s = readRawSession();
  if (s?.source !== 'api' || !s?.id) return {};
  const h = { [LOGIN_HEADER]: s.id };
  if (includeAdmin && (s.role === 'admin' || s.role === 'ADMIN')) {
    h[ADMIN_LOGIN_HEADER] = s.id;
  }
  if (s.token) {
    h.Authorization = `Bearer ${s.token}`;
  }
  return h;
}

/** 일반 회원 API 요청 */
export function loginHeaders() {
  return sessionHeaders(false);
}

/** 관리자 전용 API (/api/admin/...) — 관리자 계정일 때만 X-Admin-Login-Id 포함 */
export function adminHeaders() {
  return sessionHeaders(true);
}

/** 구버전 호환: 기본은 일반 헤더만 (관리자 호출은 adminHeaders 사용) */
export function authHeaders() {
  return loginHeaders();
}

/**
 * Spring GET /api/admin/users — 관리자 전용. API 세션이 아니면 빈 배열.
 * @returns {Promise<{ id: string, nickname: string, role: string, banned: boolean }[]>}
 */
export async function fetchAdminUsersFromApi() {
  if (!isApiConfigured() || !isApiSession()) return [];
  if (!Auth.isAdmin()) return [];
  const res = await apiFetch('/api/admin/users', { headers: adminHeaders() });
  if (!res.ok) return [];
  const list = await res.json();
  return list.map((u) => ({
    id: u.loginId,
    nickname: u.nickname,
    role: u.role === 'admin' || u.role === 'ADMIN' ? 'admin' : 'user',
    banned: Boolean(u.banned),
  }));
}

export async function fetchMyStatsFromApi() {
  if (!isApiConfigured()) return null;
  const h = loginHeaders();
  if (Object.keys(h).length === 0) return null;
  const res = await apiFetch('/api/users/me/stats', { headers: h });
  if (!res.ok) return null;
  return res.json();
}

/** @param {Response} res */
export async function parseApiErrorMessage(res) {
  try {
    const text = await res.clone().text();
    if (!text) return '';
    const j = JSON.parse(text);
    if (typeof j.message === 'string' && j.message) return j.message;
    if (typeof j.error === 'string' && j.error) return j.error;
    return '';
  } catch {
    return '';
  }
}

/**
 * Spring UserResponse JSON → 세션 객체
 * @param {object} u
 */
function mapApiUserToSession(u) {
  const role = u.role === 'admin' || u.role === 'ADMIN' ? 'admin' : 'user';
  return {
    source: 'api',
    id: u.loginId,
    userPk: u.id,
    nickname: u.nickname ?? '',
    bio: u.bio ?? '',
    profileImage: u.profileImageUrl ?? '',
    role,
  };
}

function readUsersRaw() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
    const leg = localStorage.getItem(LEGACY_USER_KEY);
    if (leg) {
      const u = JSON.parse(leg);
      const arr = [{ ...u, role: u.role || 'user' }];
      localStorage.setItem(USERS_KEY, JSON.stringify(arr));
      localStorage.removeItem(LEGACY_USER_KEY);
      return arr;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUsersList() {
  return readUsersRaw();
}

function findUserById(id) {
  if (!id) return null;
  return getUsersList().find((u) => u.id === id) || null;
}

export const Auth = {
  getUsersList,

  getUser() {
    const s = this.getSession();
    if (!s?.id) return null;
    if (isApiSession()) {
      return {
        id: s.id,
        nickname: s.nickname,
        bio: s.bio ?? '',
        profileImage: s.profileImage || '',
        role: s.role || 'user',
        banned: false,
      };
    }
    return findUserById(s.id);
  },

  getSession() {
    try {
      const session = readRawSession();
      if (!session?.id) return null;

      if (session.source === 'api') {
        return {
          id: session.id,
          nickname: session.nickname,
          bio: session.bio ?? '',
          profileImage: session.profileImage || '',
          role: session.role || 'user',
        };
      }

      const user = findUserById(session.id);
      if (!user) return null;
      if (user.banned) {
        localStorage.removeItem(SESSION_KEY);
        notifyAuthChanged();
        return null;
      }
      return {
        id: user.id,
        nickname: user.nickname,
        bio: user.bio ?? '',
        profileImage: user.profileImage || '',
        role: user.role || 'user',
      };
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return Boolean(this.getSession()?.id);
  },

  isAdmin() {
    return this.getSession()?.role === 'admin';
  },

  isIdTaken(id) {
    const v = id?.trim();
    if (!v) return false;
    return getUsersList().some((u) => u.id === v);
  },

  /**
   * 서버: GET /api/auth/exists/login
   * @param {string} loginId
   */
  async existsLoginIdRemote(loginId) {
    const v = loginId?.trim();
    if (!v) return false;
    if (!isApiConfigured()) return this.isIdTaken(v);
    const res = await apiFetch(`/api/auth/exists/login?loginId=${encodeURIComponent(v)}`);
    if (!res.ok) return true;
    const j = await res.json();
    return Boolean(j.exists);
  },

  /**
   * 서버: GET /api/auth/exists/nickname
   * @param {string} nickname
   */
  async existsNicknameRemote(nickname) {
    const v = nickname?.trim();
    if (!v) return false;
    if (!isApiConfigured()) return this.isNicknameTaken(v);
    const res = await apiFetch(`/api/auth/exists/nickname?nickname=${encodeURIComponent(v)}`);
    if (!res.ok) return true;
    const j = await res.json();
    return Boolean(j.exists);
  },

  /**
   * @param {string} nickname
   * @param {string} [excludeUserId] 본인 계정은 제외 (프로필 수정 시)
   */
  isNicknameTaken(nickname, excludeUserId) {
    const v = nickname?.trim();
    if (!v) return false;
    return getUsersList().some((u) => u.nickname === v && u.id !== excludeUserId);
  },

  signupLocal({ id, password, nickname }) {
    const users = getUsersList();
    const row = {
      id: id.trim(),
      password,
      nickname: nickname.trim(),
      bio: '',
      profileImage: '',
      role: 'user',
      banned: false,
    };
    writeUsers([...users, row]);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        id: row.id,
        nickname: row.nickname,
        bio: '',
        role: 'user',
      }),
    );
    notifyAuthChanged();
  },

  /**
   * 로컬 전용 로그인
   */
  loginLocal({ id, password }) {
    const u = findUserById(id?.trim());
    if (!u) return { ok: false, reason: '회원가입 정보가 없습니다.' };
    if (u.password !== password)
      return { ok: false, reason: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    if (u.banned)
      return {
        ok: false,
        code: 'banned',
        userId: u.id,
        reason: '정지된 회원입니다.',
      };
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        id: u.id,
        nickname: u.nickname,
        bio: u.bio || '',
        role: u.role || 'user',
      }),
    );
    notifyAuthChanged();
    return { ok: true };
  },

  /**
   * Spring POST /api/auth/login
   */
  async loginApi({ id, password }) {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId: id.trim(), password }),
    });
    if (res.ok) {
      const body = await res.json();
      const user = body.user ?? body;
      const token = body.accessToken;
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ ...mapApiUserToSession(user), ...(token ? { token } : {}) }),
      );
      notifyAuthChanged();
      return { ok: true };
    }
    if (res.status === 403) {
      const msg = await parseApiErrorMessage(res);
      return {
        ok: false,
        code: 'banned',
        userId: id.trim(),
        reason: msg || '정지된 회원입니다.',
      };
    }
    const msg = await parseApiErrorMessage(res);
    return { ok: false, reason: msg || '아이디 또는 비밀번호가 올바르지 않습니다.' };
  },

  /**
   * @returns {Promise<{ ok: boolean, reason?: string, code?: string, userId?: string }>}
   */
  async login({ id, password }) {
    if (isApiConfigured()) {
      return this.loginApi({ id, password });
    }
    return this.loginLocal({ id, password });
  },

  /**
   * Spring POST /api/auth/signup 후 자동 로그인
   */
  async signupApi({ id, password, nickname }) {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        loginId: id.trim(),
        password,
        nickname: nickname.trim(),
      }),
    });
    if (!res.ok) {
      const msg = await parseApiErrorMessage(res);
      throw new Error(msg || '회원가입에 실패했습니다.');
    }
    const body = await res.json();
    const user = body.user ?? body;
    const token = body.accessToken;
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...mapApiUserToSession(user), ...(token ? { token } : {}) }),
    );
    notifyAuthChanged();
  },

  /**
   * @returns {Promise<void>}
   */
  async signup({ id, password, nickname }) {
    if (isApiConfigured()) {
      await this.signupApi({ id, password, nickname });
      return;
    }
    this.signupLocal({ id, password, nickname });
  },

  async updateProfile({ nickname, bio, profileImage }) {
    if (isApiSession()) {
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { ...loginHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, bio, profileImageUrl: profileImage }),
      });
      if (!res.ok) {
        return { ok: false, reason: (await parseApiErrorMessage(res)) || '프로필 저장에 실패했습니다.' };
      }
      const u = await res.json();
      const raw = readRawSession();
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ ...mapApiUserToSession(u), ...(raw?.token ? { token: raw.token } : {}) }),
      );
      notifyAuthChanged();
      return { ok: true };
    }
    const session = this.getSession();
    if (!session) return { ok: false, reason: '로그인이 필요합니다.' };

    const users = getUsersList();
    const idx = users.findIndex((u) => u.id === session.id);
    if (idx < 0) return { ok: false, reason: '로그인이 필요합니다.' };

    const prev = users[idx];
    const nextNick = (nickname ?? prev.nickname).trim();
    if (!nextNick) return { ok: false, reason: '닉네임을 입력해 주세요.' };
    if (nextNick !== prev.nickname.trim() && this.isNicknameTaken(nextNick, session.id)) {
      return { ok: false, reason: '이미 사용 중인 닉네임입니다.' };
    }

    const nextUser = {
      ...prev,
      nickname: nextNick,
      bio: bio ?? prev.bio ?? '',
      profileImage: profileImage ?? prev.profileImage ?? '',
    };

    const nextUsers = [...users];
    nextUsers[idx] = nextUser;

    try {
      writeUsers(nextUsers);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: session.id,
          nickname: nextUser.nickname,
          bio: nextUser.bio,
          role: nextUser.role || 'user',
        }),
      );
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        return {
          ok: false,
          reason: '저장 용량 초과입니다. 더 작은 이미지로 다시 시도해 주세요.',
        };
      }
      throw e;
    }
    notifyAuthChanged();
    return { ok: true };
  },

  async changePassword({ currentPassword, newPassword }) {
    if (isApiSession()) {
      const res = await apiFetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { ...loginHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        return { ok: false, reason: (await parseApiErrorMessage(res)) || '비밀번호 변경에 실패했습니다.' };
      }
      return { ok: true };
    }
    const session = this.getSession();
    if (!session) return { ok: false, reason: '로그인이 필요합니다.' };
    const users = getUsersList();
    const idx = users.findIndex((u) => u.id === session.id);
    if (idx < 0) return { ok: false, reason: '로그인이 필요합니다.' };
    const prev = users[idx];
    if (prev.password !== currentPassword) {
      return { ok: false, reason: '현재 비밀번호가 올바르지 않습니다.' };
    }
    const next = [...users];
    next[idx] = { ...prev, password: newPassword };
    writeUsers(next);
    return { ok: true };
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    notifyAuthChanged();
  },

  /**
   * 로컬 전용 목록. API 로그인 시에는 `fetchAdminUsersFromApi` 사용.
   * @returns {{ id: string, nickname: string, role: string, banned: boolean }[] | null}
   */
  adminListUsers() {
    if (!this.isAdmin()) return null;
    if (isApiSession()) return null;
    return getUsersList().map((u) => ({
      id: u.id,
      nickname: u.nickname,
      role: u.role || 'user',
      banned: Boolean(u.banned),
    }));
  },

  /** @returns {Promise<{ ok: boolean, reason?: string }>} */
  async adminSetUserBanned(targetId, banned) {
    if (isApiSession()) {
      const id = targetId?.trim();
      if (!id) return { ok: false, reason: '아이디가 없습니다.' };
      if (!this.isAdmin()) return { ok: false, reason: '권한이 없습니다.' };
      try {
        const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}/banned`, {
          method: 'PATCH',
          headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ banned: Boolean(banned) }),
        });
        if (!res.ok) {
          return { ok: false, reason: (await parseApiErrorMessage(res)) || '처리에 실패했습니다.' };
        }
        const me = this.getSession();
        if (me?.id === id && banned) {
          this.logout();
        } else {
          notifyAuthChanged();
        }
        return { ok: true };
      } catch {
        return { ok: false, reason: '네트워크 오류입니다.' };
      }
    }
    if (!this.isAdmin()) return { ok: false, reason: '권한이 없습니다.' };
    const id = targetId?.trim();
    if (!id) return { ok: false, reason: '아이디가 없습니다.' };
    const users = getUsersList();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return { ok: false, reason: '사용자를 찾을 수 없습니다.' };
    const next = [...users];
    next[idx] = { ...next[idx], banned: Boolean(banned) };
    writeUsers(next);
    const me = this.getSession();
    if (me?.id === id && banned) localStorage.removeItem(SESSION_KEY);
    notifyAuthChanged();
    return { ok: true };
  },

  /** @returns {Promise<{ ok: boolean, reason?: string }>} */
  async adminSetUserRole(targetId, role) {
    if (isApiSession()) {
      const id = targetId?.trim();
      if (!id || (role !== 'admin' && role !== 'user')) return { ok: false, reason: '역할이 올바르지 않습니다.' };
      if (!this.isAdmin()) return { ok: false, reason: '권한이 없습니다.' };
      try {
        const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}/role`, {
          method: 'PATCH',
          headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        if (!res.ok) {
          return { ok: false, reason: (await parseApiErrorMessage(res)) || '처리에 실패했습니다.' };
        }
        const u = await res.json();
        const me = this.getSession();
        if (me?.id === id) {
          const raw = readRawSession();
          if (raw?.source === 'api') {
            const nextRole = u.role === 'admin' || u.role === 'ADMIN' ? 'admin' : 'user';
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({
                ...raw,
                role: nextRole,
                ...(raw?.token ? { token: raw.token } : {}),
              }),
            );
          }
        }
        notifyAuthChanged();
        return { ok: true };
      } catch {
        return { ok: false, reason: '네트워크 오류입니다.' };
      }
    }
    if (!this.isAdmin()) return { ok: false, reason: '권한이 없습니다.' };
    const id = targetId?.trim();
    if (!id || (role !== 'admin' && role !== 'user')) return { ok: false, reason: '역할이 올바르지 않습니다.' };
    const users = getUsersList();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return { ok: false, reason: '사용자를 찾을 수 없습니다.' };
    const target = users[idx];
    if (target.role === 'admin' && role === 'user') {
      const admins = users.filter((u) => u.role === 'admin');
      if (admins.length <= 1) return { ok: false, reason: '마지막 관리자 권한은 해제할 수 없습니다.' };
    }
    const next = [...users];
    next[idx] = { ...next[idx], role };
    writeUsers(next);
    const me = this.getSession();
    if (me?.id === id) {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: me.id,
          nickname: me.nickname,
          bio: me.bio ?? '',
          role,
        }),
      );
    }
    notifyAuthChanged();
    return { ok: true };
  },

  /** @returns {Promise<{ ok: boolean, reason?: string }>} */
  async adminDeleteUser(targetId) {
    if (isApiSession()) {
      const id = targetId?.trim();
      if (!id) return { ok: false, reason: '아이디가 없습니다.' };
      if (!this.isAdmin()) return { ok: false, reason: '권한이 없습니다.' };
      try {
        const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: adminHeaders(),
        });
        if (!res.ok && res.status !== 204) {
          return { ok: false, reason: (await parseApiErrorMessage(res)) || '삭제에 실패했습니다.' };
        }
        const me = this.getSession();
        if (me?.id === id) {
          this.logout();
        } else {
          notifyAuthChanged();
        }
        return { ok: true };
      } catch {
        return { ok: false, reason: '네트워크 오류입니다.' };
      }
    }
    if (!this.isAdmin()) return { ok: false, reason: '권한이 없습니다.' };
    const id = targetId?.trim();
    if (!id) return { ok: false, reason: '아이디가 없습니다.' };
    const users = getUsersList();
    const target = users.find((u) => u.id === id);
    if (!target) return { ok: false, reason: '사용자를 찾을 수 없습니다.' };
    if (target.role === 'admin') {
      const admins = users.filter((u) => u.role === 'admin');
      if (admins.length <= 1) return { ok: false, reason: '마지막 관리자는 삭제할 수 없습니다.' };
    }
    writeUsers(users.filter((u) => u.id !== id));
    const me = this.getSession();
    if (me?.id === id) localStorage.removeItem(SESSION_KEY);
    notifyAuthChanged();
    return { ok: true };
  },
};
