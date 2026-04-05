// components/Banner.tsx
'use client';

import Image from 'next/image';
import bannerImage from '@/../public/Images/bannar.jpg';

export default function Banner() {
  return (
    <div className="relative w-full h-[500px] sm:h-[550px] md:h-[600px] lg:h-[700px] max-w-6xl mx-auto bg-white pt-10">
      {/* Background Image - Full visible */}
      <Image
        src={bannerImage}
        alt='Food banner'
        // fill
        // priority
        className=""
        // sizes="100vw"
        // quality={95}
      />
    </div>
  );
}