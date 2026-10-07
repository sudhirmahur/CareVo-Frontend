import { STORAGE_KEYS } from './constants';

// Only the access token is persisted - never application data.
// "Remember me" -> localStorage (survives restarts); otherwise sessionStorage.
// TODO: when POST /api/auth/refresh exists, prefer an httpOnly refresh cookie
// and keep the access token in memory only.
const read = (storage) => {
  try {
    return storage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
};

export const tokenStorage = {
  get() {
    return read(window.localStorage) || read(window.sessionStorage);
  },
  set(token, remember = true) {
    this.clear();
    try {
      (remember ? window.localStorage : window.sessionStorage).setItem(STORAGE_KEYS.TOKEN, token);
    } catch {
      /* storage unavailable (private mode) - session will not persist */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch {
      /* ignore */
    }
  },
};
