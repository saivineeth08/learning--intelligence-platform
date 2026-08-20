import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  changePassword as changePasswordRequest,
  getProfile,
  loginUser,
  logoutUser,
  registerUser,
  updateProfile as updateProfileRequest,
} from "../services/auth";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../utils/tokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!getAccessToken() && !getRefreshToken()) {
      setUser(null);
      return null;
    }
    const profile = await getProfile();
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadProfile()
      .catch(() => {
        if (isMounted) {
          clearTokens();
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsInitializing(false);
        }
      });

    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener("auth:logout", handleLogout);

    return () => {
      isMounted = false;
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, [loadProfile]);

  const login = useCallback(
    async (credentials) => {
      const tokens = await loginUser(credentials);
      setTokens(tokens);
      return loadProfile();
    },
    [loadProfile],
  );

  const register = useCallback(async (payload) => {
    return registerUser(payload);
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh && getAccessToken()) {
        await logoutUser(refresh);
      }
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const profile = await updateProfileRequest(payload);
    setUser(profile);
    return profile;
  }, []);

  const changePassword = useCallback(async (payload) => {
    await changePasswordRequest(payload);
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isInitializing,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [user, isInitializing, login, register, logout, updateProfile, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
