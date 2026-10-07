import { useCallback } from 'react';
import { profileApi } from '../api/profile.api';
import useApi from './useApi';

/**
 * Loads GET /users/me/profile. A brand new account may not have a profile
 * document yet, so a 404 is treated as "empty profile", not an error.
 */
export default function useProfile() {
  const request = useCallback(async () => {
    try {
      return await profileApi.get();
    } catch (error) {
      if (error.status === 404) return {};
      throw error;
    }
  }, []);
  return useApi(request);
}
