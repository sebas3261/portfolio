import { useState, useEffect, useRef } from "react";
import { Menu, X, Moon, Sun } from "lucide";
import { MorphIcon } from "morphicons/react";

interface Props {
  lang: string;
  switchToDark: string;
  switchToLight: string;
  openMenu: string;
  closeMenu: string;
}

type Theme = "light" | "dark";

export default function NavBar({ lang, switchToDark, switchToLight, openMenu: openLabel, closeMenu: closeLabel }: Props) {
  const isEnglish = lang === "en";
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const SCROLL_THRESHOLD = 10;

  // — Theme —
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const initial: Theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    document.documentElement.style.colorScheme = initial;
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
  }

  // — Scroll —
  useEffect(() => {
    function handleScroll() {
      if (menuOpen) return;
      const currentY = window.scrollY;
      const atTop = currentY < SCROLL_THRESHOLD;
      const scrollingUp = currentY < lastScrollY.current;

      setScrolled(!atTop);
      setHidden(!atTop && !scrollingUp);
      lastScrollY.current = currentY;
    }

    lastScrollY.current = window.scrollY;
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen]);

  // — Menu —
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (menuOpen) {
      setScrolled(true);
      setHidden(false);
    } else {
      const atTop = window.scrollY < SCROLL_THRESHOLD;
      setScrolled(!atTop);
      setHidden(false);
      lastScrollY.current = window.scrollY;
    }
  }, [menuOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const dark = theme === "dark";

  const navLinks = [
    { href: `/${lang}/`, label: isEnglish ? "Home" : "Inicio" },
    { href: `/${lang}/projects/`, label: isEnglish ? "Projects" : "Proyectos" },
    { href: `/${lang}/about/`, label: isEnglish ? "About" : "Sobre mí" },
    { href: `/${lang}/blog/`, label: "Blog" },
  ];

  return (
    <>
      <header
        style={{
          background: menuOpen
            ? "transparent"
            : scrolled
              ? dark
                ? "rgba(9,9,11,0.6)"
                : "rgba(255,255,255,0.6)"
              : "transparent",
          backdropFilter: scrolled && !menuOpen ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled && !menuOpen ? "blur(20px) saturate(180%)" : "none",
          borderBottomColor: scrolled && !menuOpen
            ? dark ? "rgba(39,39,42,0.8)" : "rgba(228,228,231,0.8)"
            : "transparent",
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
        }}
        className="fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300"
      >
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <a
            href={`/${lang}/`}
            aria-label="Sebastian Sanchez - Home"
            className="shrink-0"
          >
            <img
              src="/logo-dark.svg"
              alt="Sebastian Sanchez"
              width="40"
              height="40"
              className={`select-none sm:size-11 ${dark ? "invert" : ""}`}
              draggable={false}
            />
          </a>

          {/* Nav desktop */}
          <nav
            aria-label="Main navigation"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-sm font-medium text-zinc-600 md:flex dark:text-zinc-300"
          >
          {navLinks.map(({ href, label }) => (
              <a key={href} href={href} className="relative text-zinc-600 transition-colors hover:text-zinc-950 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-zinc-950 after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 dark:text-zinc-300 dark:hover:text-white dark:after:bg-white">
                {label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <div className={`transition-opacity duration-200 ${menuOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={dark ? switchToLight : switchToDark}
                title={dark ? switchToLight : switchToDark}
                className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <MorphIcon icon={dark ? Sun : Moon} size={20} reducedMotion="user" />
              </button>
            </div>

            {/* Language */}
            <div className={`transition-opacity duration-200 ${menuOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <details className="group relative select-none">
                <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {isEnglish ? "EN" : "ES"}
                </summary>
                <div className="absolute right-0 top-full z-50 mt-3 min-w-36 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <a href="/en/" lang="en" className="block rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800">English</a>
                  <a href="/es/" lang="es" className="block rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800">Español</a>
                </div>
              </details>
            </div>

            {/* CTA desktop */}
            <a
              href={`/${lang}/contact/`}
              className={`ml-1 hidden select-none rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 md:inline-flex dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white ${menuOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              {isEnglish ? "Let's talk" : "Hablemos"}
            </a>

            {/* Menu toggle mobile */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? closeLabel : openLabel}
              aria-expanded={menuOpen}
              aria-controls="fullscreen-menu"
              className="ml-1 flex size-11 items-center justify-center text-zinc-600 transition-colors md:hidden dark:text-zinc-300"
            >
              <MorphIcon icon={menuOpen ? X : Menu} size={20} reducedMotion="user" />
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen menu */}
      <div
        id="fullscreen-menu"
        role="dialog"
        aria-modal="true"
        aria-label={isEnglish ? "Navigation menu" : "Menú de navegación"}
        className={`fixed inset-0 z-40 flex flex-col bg-white transition-transform duration-500 ease-in-out md:hidden dark:bg-zinc-950 ${menuOpen ? "translate-y-0" : "-translate-y-full pointer-events-none"}`}
      >
        <nav
          aria-label="Mobile navigation"
          className="flex flex-col items-start gap-1 px-8 pt-24"
        >
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-4xl font-semibold tracking-tight text-zinc-950 transition-colors hover:text-zinc-400 dark:text-white dark:hover:text-zinc-500"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto px-6 pb-10">
          <a
            href={`/${lang}/contact/`}
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center rounded-2xl bg-zinc-950 py-4 text-base font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isEnglish ? "Let's talk" : "Hablemos"}
          </a>
        </div>
      </div>
    </>
  );
}
