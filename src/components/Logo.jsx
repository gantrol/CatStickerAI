'use client';

import Image from 'next/image';
import Link from 'next/link';

export function Logo({ size = 'md' }) {
  const dimensions = {
    sm: { width: 40, height: 40 },
    md: { width: 80, height: 80 },
    lg: { width: 120, height: 120 },
  };
  
  const { width, height } = dimensions[size] || dimensions.md;
  
  return (
    <Link href="/" className="inline-block">
      <Image 
        src="/logo.png" 
        alt="猫猫贴纸Logo" 
        width={width} 
        height={height} 
        className="transition-transform hover:scale-105 duration-300 rounded-full shadow-md"
      />
    </Link>
  );
}
