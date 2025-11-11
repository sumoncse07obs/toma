import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Topnav() {
  const { pathname } = useLocation();

  const navItems = [
    { name: "Learning Center", to: "https://tomaa.tech/learning-center" },
    { name: "Contact Us", to: "https://tomaa.tech/contact-us" },
  ];

  return (
    <header className="absolute top-0 left-0 z-20 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo / Brand */}
        <Link
          to="https://tomaa.tech/"
          className="text-white text-lg font-bold tracking-tight hover:text-sky-400 transition"
        >
          TOMA<span className="text-sky-400">A</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`transition hover:text-sky-400 ${
                pathname === item.to ? "text-sky-400" : ""
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Placeholder (optional) */}
        <button
          className="md:hidden text-white hover:text-sky-400 focus:outline-none"
          aria-label="Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
    </header>
  );
}
