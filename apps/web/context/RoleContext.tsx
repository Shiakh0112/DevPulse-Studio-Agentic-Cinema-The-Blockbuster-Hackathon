"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "viewer" | "engineer" | "admin" | "executive";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: "engineer",
  setRole: () => {},
});

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>("engineer");

  useEffect(() => {
    const savedRole = localStorage.getItem("devpulse_user_role") as Role;
    if (savedRole && ["viewer", "engineer", "admin", "executive"].includes(savedRole)) {
      setRoleState(savedRole);
    }
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem("devpulse_user_role", newRole);
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
