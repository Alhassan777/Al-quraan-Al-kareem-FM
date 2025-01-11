"use client";

import React from "react";
import PropTypes from "prop-types";
import Link from "next/link";

const Header = ({ title, subtitle }) => {
  return (
    <header className="bg-[#112436] p-6 rounded-lg shadow-md text-[#C4A661] text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle && <p className="text-lg mt-2 font-medium">{subtitle}</p>}

      <nav className="mt-4 flex justify-center gap-8">
        <Link
          href="/"
          className="text-[#C4A661] underline hover:text-[#E3B862] transition duration-200"
        >
          البث المباشر للإذاعة
        </Link>
        <Link
          href="/schedule"
          className="text-[#C4A661] underline hover:text-[#E3B862] transition duration-200"
        >
          جدول البرامج
        </Link>
        <Link
          href="/contact"
          className="text-[#C4A661] underline hover:text-[#E3B862] transition duration-200"
        >
          تواصل معنا
        </Link>
      </nav>
    </header>
  );
};


Header.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

Header.defaultProps = {
  subtitle: "",
};

export default Header;
