'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserProfile } from '@/app/actions/auth';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role?: string;
  companyName?: string;
  avatarFallback: string;
}

const getStoredUser = (): UserProfile => {
  if (typeof window === 'undefined') {
    return {
      name: 'User',
      email: '',
      role: 'OWNER',
      companyName: 'FlowERP Store',
      avatarFallback: 'US',
    };
  }

  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const email = parsed.email || '';
      const rawName = parsed.name || parsed.fullName || parsed.username || (email ? email.split('@')[0] : '');
      const name = rawName && rawName.trim() ? rawName.trim() : '';

      if (name) {
        const parts = name.split(/\s+/);
        const initials = parts.length > 1
          ? (parts[0][0] + (parts[1][0] || '')).toUpperCase()
          : name.slice(0, 2).toUpperCase();

        return {
          id: parsed.id,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email,
          role: parsed.role || 'OWNER',
          companyName: parsed.companyName || parsed.company || 'FlowERP Store',
          avatarFallback: initials || 'US',
        };
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  return {
    name: 'User',
    email: '',
    role: 'OWNER',
    companyName: 'FlowERP Store',
    avatarFallback: 'US',
  };
};

const DEFAULT_USER: UserProfile = {
  name: 'User',
  email: '',
  role: 'OWNER',
  companyName: 'FlowERP Store',
  avatarFallback: 'US',
};

export function useUser(): UserProfile {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  useEffect(() => {
    const localUser = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(localUser);

    getCurrentUserProfile().then((res) => {
      if (res.success && res.user) {
        const parts = res.user.name.split(/\s+/);
        const initials = parts.length > 1
          ? (parts[0][0] + (parts[1][0] || '')).toUpperCase()
          : res.user.name.slice(0, 2).toUpperCase();

        const formatted: UserProfile = {
          id: res.user.id,
          name: res.user.name.charAt(0).toUpperCase() + res.user.name.slice(1),
          email: res.user.email,
          role: res.user.role || 'OWNER',
          companyName: res.user.companyName || 'FlowERP Store',
          avatarFallback: initials || 'US',
        };
        localStorage.setItem('user', JSON.stringify(formatted));
        setUser(formatted);
      }
    });

    const handleStorage = () => setUser(getStoredUser());
    window.addEventListener('storage', handleStorage);
    window.addEventListener('user_login', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user_login', handleStorage);
    };
  }, []);

  return user;
}
