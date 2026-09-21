import { NavLink, Outlet } from "react-router-dom";
import logoUrl from "../../assets/images/ualberta-logo.png";

const navigation = [
  ["Home", "/"],
  ["Schedule", "/schedule"],
  ["Booths", "/booths"],
  ["Map", "/map"],
  ["Passport", "/passport"],
] as const;

export function AppLayout() {
  return (
    <>
      <header className="site-header">
        <NavLink to="/" aria-label="Open House home">
          <img src={logoUrl} alt="University of Alberta" />
        </NavLink>
        <span>MEC E Open House 2026</span>
      </header>
      <nav className="site-nav" aria-label="Primary navigation">
        {navigation.map(([label, path]) => (
          <NavLink key={path} to={path}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
