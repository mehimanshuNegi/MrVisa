/**
 * User Profile Data Access Service
 */

import { mockDefaultUser } from '../data/mockUsers';
import { isMockMode } from './apiConfig';
import { apiClient } from './apiClient';

const PROFILE_STORAGE_KEY = 'mrvisa_profile';

/**
 * Normalizes user profile record
 */
export function normalizeUserProfile(raw) {
  if (!raw) return null;
  const firstName = raw.firstName || (raw.name ? raw.name.split(' ')[0] : 'Rahul');
  const lastName = raw.lastName || (raw.name ? raw.name.split(' ').slice(1).join(' ') : 'Sharma');
  return {
    id: raw.id || raw.userId || 'usr_guest_01',
    firstName,
    lastName,
    name: raw.name || `${firstName} ${lastName}`.trim(),
    email: raw.email || '',
    phone: raw.phone ? raw.phone.replace(/[^0-9]/g, '').slice(-10) : '',
    nationality: raw.nationality || 'Indian',
    countryOfResidence: raw.countryOfResidence || 'India',
    passportNumber: raw.passportNumber || ''
  };
}

class UserService {
  /**
   * Get customer profile
   */
  async getProfile() {
    if (isMockMode()) {
      try {
        const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return normalizeUserProfile({
            ...mockDefaultUser,
            ...parsed
          });
        }
      } catch (e) {
        console.warn('Failed to read profile from storage:', e);
      }
      return normalizeUserProfile(mockDefaultUser);
    }

    const raw = await apiClient('/user/profile');
    return normalizeUserProfile(raw.data || raw);
  }

  /**
   * Update customer profile
   */
  async updateProfile(profileData) {
    if (isMockMode()) {
      const updated = normalizeUserProfile(profileData);
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save profile to storage:', e);
      }
      return updated;
    }

    const raw = await apiClient('/user/profile', {
      method: 'PUT',
      body: profileData
    });
    return normalizeUserProfile(raw.data || raw);
  }
}

export const userService = new UserService();
export default userService;
