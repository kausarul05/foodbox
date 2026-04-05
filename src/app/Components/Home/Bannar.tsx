// components/Banner.tsx
'use client';

import Image from 'next/image';
import bannerImage from '@/../public/Images/bannar.jpg';

export default function Banner() {
  return (
    <div className="relative w-full h-[250px] sm:h-[400px] md:h-[500px] lg:h-[500px] max-w-6xl mx-auto bg-white">
      {/* Background Image - Full visible */}
      <Image
        src={bannerImage}
        alt='Food banner'
        fill
        // priority
        className="md:mt-10 mt-2"
        // sizes="100vw"
        // quality={95}
      />
    </div>
  );
}