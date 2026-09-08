'use client';

/**
 * DevPulse Studio - UI Role Context & Simulation Layer
 *
 * DEMO & ARCHITECTURAL NOTE:
 * This React Context provides a UI-level role simulation (viewer | engineer | admin)
 * for live presentation purposes. It allows judges and presenters to switch roles in real-time
 * to observe role-based governance controls (e.g. approving patches or triggering emergency rollbacks).
 *
 * NOTE: In a production deployment, this client-side state will be replaced with enterprise 
 * authentication and RBAC identity providers (e.g., Firebase Auth, Google Identity, Okta, or NextAuth).
 */

import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'viewer' | 'engineer' | 'admin';

interface RoleContextType {
  role: UserRole;
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: 'viewer',
  currentRole: 'viewer',
  setRole: () => {},
});

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setRole] = useState<UserRole>('viewer');

  return (
    <RoleContext.Provider value={{ role: currentRole, currentRole, setRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
