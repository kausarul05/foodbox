import type { Metadata } from 'next';
import Order from '@/app/Components/Home/Order';
import PageHeader from '@/components/ui/PageHeader';

export const metadata: Metadata = {
  title: 'অর্ডার করুন',
  description: 'দিন আর বেলা বেছে নিন — বাকিটা আমরা দেখছি।',
};

export default function OrderPage() {
  return (
    <>
      <PageHeader
        eyebrow="অর্ডার"
        title="এই সপ্তাহের খাবার ঠিক করে ফেলুন"
        subtitle="কোন দিন কোন বেলা খাবেন বেছে নিন। যেকোনো দিন বাদ দিতে পারবেন, সময়ের আগে জানালেই হলো।"
      />
      <Order />
    </>
  );
}
