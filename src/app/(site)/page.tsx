import Hero from '@/app/Components/Home/Hero';
import HowItWorks from '@/app/Components/Home/HowItWorks';
import WeeklyMenu from '@/app/Components/Home/WeeklyMenu';
import Packages from '@/app/Components/Home/Packages';
import Features from '@/app/Components/Home/Features';
import DeliveryInfo from '@/app/Components/Home/DeliveryInfo';
import Testimonials from '@/app/Components/Home/Testimonials';
import Faq from '@/app/Components/Home/Faq';
import CtaBand from '@/app/Components/Home/CtaBand';

/**
 * Home page — a landing page, not an app screen.
 *
 * The old version embedded the full 1,200-line ordering form here, which meant
 * a first-time visitor hit a date/zone/meal form before learning what FoodBox
 * even is. Ordering now lives only on /order; the home page's job is to explain,
 * show the menu, and hand off.
 *
 * Order of sections follows the visitor's questions:
 *   what is this → how does it work → what will I eat → what does it cost →
 *   why you → when/where do you deliver → do others trust you → loose ends → act
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WeeklyMenu />
      <Packages />
      <Features />
      <DeliveryInfo />
      <Testimonials />
      <Faq />
      <CtaBand />
    </>
  );
}
