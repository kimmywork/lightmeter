import React from 'react';

const Logo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="2"/>
    <circle cx="50" cy="50" r="35" stroke="white" strokeWidth="2"/>
    <circle cx="50" cy="50" r="5" fill="white"/>
    <line x1="50" y1="10" x2="50" y2="25" stroke="white" strokeWidth="2"/>
    <line x1="50" y1="75" x2="50" y2="90" stroke="white" strokeWidth="2"/>
    <line x1="90" y1="50" x2="75" y2="50" stroke="white" strokeWidth="2"/>
    <line x1="25" y1="50" x2="10" y2="50" stroke="white" strokeWidth="2"/>
  </svg>
);

export default Logo;