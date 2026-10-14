import React from 'react';

interface LogoProps {
  className?: string;
  isDark?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8", isDark = false }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <svg 
        viewBox="0 0 230 80" 
        className="h-full w-auto" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <text 
          x="0" 
          y="62" 
          className="font-black" 
          style={{ 
            fill: isDark ? '#f1f5f9' : '#1a1a1b', 
            fontFamily: 'Inter, sans-serif', 
            fontSize: '72px', 
            fontWeight: 900,
            letterSpacing: '-0.05em' 
          }}
        >
          MP
        </text>
        <text 
          x="115" 
          y="62" 
          className="font-black" 
          style={{ 
            fill: '#c00000', 
            fontFamily: 'Inter, sans-serif', 
            fontSize: '72px', 
            fontWeight: 900,
            letterSpacing: '-0.05em' 
          }}
        >
          SP
        </text>
      </svg>
    </div>
  );
};

export default Logo;