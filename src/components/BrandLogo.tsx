import React from 'react'

export const BrandLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 40 40" 
    width="36" 
    height="36" 
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g fill="none" fillRule="evenodd">
      <rect width="40" height="40" rx="12" fill="var(--chakra-colors-brand-navy, #1A365D)" />
      
      {/* The 'W' representing Wear / Mountains / Waves */}
      <path
        d="M10 15 L15 27 L20 17 L25 27 L30 15"
        stroke="var(--chakra-colors-brand-arctic, #EBF8FF)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* The Sun / Weather motif */}
      <circle 
        cx="30" 
        cy="11" 
        r="3.5" 
        fill="var(--chakra-colors-brand-amber, #ED8936)" 
      />
    </g>
  </svg>
)
