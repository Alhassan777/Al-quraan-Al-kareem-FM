"use client";

import React from 'react';

const Header = ({ title, subtitle }) => {
  return (
    <header className="bg-[#112436] p-6 rounded-lg shadow-md text-[#C4A661] text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-lg mt-2">{subtitle}</p>}
    </header>
  );
};

export default Header;
