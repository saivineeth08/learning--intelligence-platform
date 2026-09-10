import { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchModal from "../components/SearchModal";
import ThemeToggle from "../components/ThemeToggle";

function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const aiDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(e.target)) {
        setIsAiDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAiDropdownOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  const navLinkClass = ({ isActive }) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
      isActive
        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold shadow-2xs"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  const isAiActive = location.pathname.startsWith("/ai");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5">
          {/* Left: Brand Logo & Desktop Navigation */}
          <div className="flex items-center gap-2 lg:gap-4 xl:gap-6">
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              className="flex items-center gap-2 text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white shrink-0"
            >
              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs text-xs sm:text-sm font-black">
                LI
              </span>
              <span className="hidden md:inline font-bold">Learning Intelligence</span>
            </Link>

            {/* Desktop Navigation - All Major Sections */}
            {isAuthenticated ? (
              <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/goals" className={navLinkClass}>
                  Goals
                </NavLink>
                <NavLink to="/tasks" className={navLinkClass}>
                  Tasks
                </NavLink>
                <NavLink to="/study-sessions" className={navLinkClass}>
                  Study
                </NavLink>
                <NavLink to="/resources" className={navLinkClass}>
                  Resources
                </NavLink>
                <NavLink to="/notes" className={navLinkClass}>
                  Notes
                </NavLink>
                <NavLink to="/analytics" className={navLinkClass}>
                  Analytics
                </NavLink>
                <NavLink to="/calendar" className={navLinkClass}>
                  Calendar
                </NavLink>

                {/* AI Dropdown Navigation Item */}
                <div className="relative" ref={aiDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsAiDropdownOpen((prev) => !prev)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isAiActive
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>✨ AI</span>
                    <svg className={`h-3 w-3 transition-transform ${isAiDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isAiDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <NavLink
                        to="/ai/chat"
                        onClick={() => setIsAiDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span>💬</span> Document Chat (RAG)
                      </NavLink>
                      <NavLink
                        to="/ai/quizzes"
                        onClick={() => setIsAiDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span>🧠</span> AI Assessment Quizzes
                      </NavLink>
                      <NavLink
                        to="/ai/recommendations"
                        onClick={() => setIsAiDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <span>💡</span> Smart Recommendations
                      </NavLink>
                    </div>
                  )}
                </div>
              </nav>
            ) : null}
          </div>

          {/* Right Side: Search, Theme, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                title="Search (Ctrl+K)"
                aria-label="Search platform"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Ctrl K
                </kbd>
              </button>
            )}

            {/* Theme Dropdown Toggle (Light / Dark / System) */}
            <ThemeToggle />

            {/* User Profile / Auth Actions */}
            {isAuthenticated ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1.5 pr-2.5 text-xs font-semibold text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                  <span className="hidden sm:inline max-w-[80px] truncate">{user?.username}</span>
                  {user?.is_email_verified && (
                    <span title="Verified Account" className="text-emerald-500 text-[11px]">✓</span>
                  )}
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.username}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span>👤</span> Profile &amp; Security
                    </NavLink>
                    <NavLink
                      to="/settings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span>⚙️</span> Settings
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Navigation Toggle Button */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                aria-label="Toggle mobile menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isAuthenticated && isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 space-y-1">
            <NavLink to="/dashboard" className={mobileNavLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/goals" className={mobileNavLinkClass}>
              Goals
            </NavLink>
            <NavLink to="/tasks" className={mobileNavLinkClass}>
              Tasks
            </NavLink>
            <NavLink to="/study-sessions" className={mobileNavLinkClass}>
              Study Sessions
            </NavLink>
            <NavLink to="/resources" className={mobileNavLinkClass}>
              Resources
            </NavLink>
            <NavLink to="/notes" className={mobileNavLinkClass}>
              Notes
            </NavLink>
            <NavLink to="/analytics" className={mobileNavLinkClass}>
              Analytics
            </NavLink>
            <NavLink to="/calendar" className={mobileNavLinkClass}>
              Calendar
            </NavLink>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                AI Services
              </p>
              <NavLink to="/ai/chat" className={mobileNavLinkClass}>
                ✨ AI Chat (RAG)
              </NavLink>
              <NavLink to="/ai/quizzes" className={mobileNavLinkClass}>
                🧠 AI Quizzes
              </NavLink>
              <NavLink to="/ai/recommendations" className={mobileNavLinkClass}>
                💡 Smart Recommendations
              </NavLink>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <NavLink to="/profile" className={mobileNavLinkClass}>
                Profile &amp; Security
              </NavLink>
              <NavLink to="/settings" className={mobileNavLinkClass}>
                Settings
              </NavLink>
              <button
                type="button"
                onClick={() => logout()}
                className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <Outlet />
      </main>

      {isAuthenticated && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
}

export default MainLayout;
