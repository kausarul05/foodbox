import Image from 'next/image'
import bannar from '@/../public/Images/bannar.jpg'

export default function Bannar() {
  return (
    <Image
        src={bannar}
        alt='Bannar Image'
        width={1200}
        height={800}
        className='w-full md:h-[600px] object-cover'
    />
  )
}
