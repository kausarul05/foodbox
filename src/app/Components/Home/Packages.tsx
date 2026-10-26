'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertCircle, Check, Sparkles } from 'lucide-react';
import { menuAPI, packageAPI, subscriptionAPI, transactionAPI } from '@/lib/api';
import SectionHeading from '@/components/ui/SectionHeading';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Field';
import { useDialog } from '@/components/ui/DialogProvider';
import PaymentFields, { validatePayment, type PaymentDetails } from '@/components/ui/PaymentFields';
import { bn, taka } from '@/lib/format';
import { BOX_DEPOSIT, JOINING_FLOAT_DAYS, joiningMinimum, weekMealTotal } from '@/lib/rules';
import { useMySubscription } from '@/lib/useMySubscription';

interface PackageType {
  _id: string;
  name: string;
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  duration: number;
  discount: number;
  isActive: boolean;
}

const EMPTY_PAYMENT: PaymentDetails = { paymentMethod: 'bkash', transactionId: '', senderNumber: '' };

export default function Packages() {
  const router = useRouter();
  const { confirm } = useDialog();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<PackageType | null>(null);
  const [payment, setPayment] = useState<PaymentDetails>(EMPTY_PAYMENT);
  /** Which card is fetching its menu, so its button can show the wait. */
  const [preparing, setPreparing] = useState<string | null>(null);
  /**
   * What joining the selected package costs. `weekMeals` is a week of every
   * meal on its menu; `minimum` adds the fee and the box deposit. Null for a
   * returning customer, who has funded a wallet before and owes the fee alone.
   */
  const [joining, setJoining] = useState<{ weekMeals: number; minimum: number } | null>(null);
  const [amount, setAmount] = useState('');

  // A customer with a live or waiting subscription cannot request another — the
  // server refuses it — so the cards say so instead of offering a button that
  // can only fail.
  const { subscription: mine } = useMySubscription();
  const locked = mine?.status === 'active' || mine?.status === 'pending';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await packageAPI.getAllPackages();
        if (!cancelled) setPackages((res.data ?? []).filter((p: PackageType) => p.isActive));
      } catch {
        if (!cancelled) toast.error('প্যাকেজ লোড করা যায়নি');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSubscribe = async (pkg: PackageType) => {
    if (locked || preparing) return;
    if (!localStorage.getItem('userToken')) {
      toast.error('সাবস্ক্রাইব করতে আগে লগইন করুন');
      router.push('/login');
      return;
    }

    /**
     * Work out what this customer owes before showing them anything, because
     * the warning below has to name the real figure. A first-time joiner funds
     * the fee, a week of meals and the box deposit in one payment; someone who
     * has funded a wallet before owes only the fee. The server checks the same
     * thing — this is so the form cannot ask for the wrong number.
     */
    setPreparing(pkg._id);
    let plan: { weekMeals: number; minimum: number } | null = null;
    try {
      const [menuRes, txRes] = await Promise.all([
        menuAPI.getMenuByPackage(pkg.name),
        transactionAPI.getMyTransactions(),
      ]);
      const funded = (txRes.data ?? []).some((t: { status: string }) => t.status === 'approved');
      if (!funded) {
        const menu = menuRes.data ?? [];
        if (!menu.length) {
          toast.error('এই প্যাকেজের সাপ্তাহিক মেনু এখনো যোগ করা হয়নি');
          return;
        }
        const weekMeals = weekMealTotal(menu);
        plan = { weekMeals, minimum: joiningMinimum(pkg.price, weekMeals) };
      }
    } catch {
      toast.error('তথ্য লোড করা যায়নি, আবার চেষ্টা করুন');
      return;
    } finally {
      setPreparing(null);
    }

    // Asked before the payment form, so nobody sends money without seeing it.
    const agreed = await confirm({
      title: 'শুধু সাবস্ক্রিপশন ফি ফেরতযোগ্য নয়',
      message: plan
        ? `প্রথমবার সাবস্ক্রাইব করতে ${taka(plan.minimum)} পাঠাতে হবে — ${pkg.title} প্যাকেজের ফি ${taka(pkg.price)}, ${bn(JOINING_FLOAT_DAYS)} দিনের খাবারের ${taka(plan.weekMeals)}, আর খাবারের বক্সের ${taka(BOX_DEPOSIT)} ডিপোজিট। এর মধ্যে শুধু ফি'র ${taka(pkg.price)} ফেরতযোগ্য নয় — বাকি ${taka(plan.minimum - pkg.price)} আপনার ওয়ালেটেই থাকবে, খাবার ডেলিভারি হলে তখন কাটা হবে।`
        : `${pkg.title} প্যাকেজের সাবস্ক্রিপশন ফি ${taka(pkg.price)}। অনুমোদনের পর এই টাকা কোনো অবস্থাতেই ফেরত দেওয়া হবে না — সাবস্ক্রিপশন বাতিল করলেও না।`,
      confirmLabel: 'বুঝেছি, এগিয়ে যান',
      tone: 'warning',
    });
    if (!agreed) return;
    setPayment(EMPTY_PAYMENT);
    setJoining(plan);
    setAmount(String(plan ? plan.minimum : pkg.price));
    setSelected(pkg);
  };

  const confirmSubscribe = async () => {
    if (!selected) return;

    const sent = Number(amount);
    const least = joining ? joining.minimum : selected.price;
    if (!Number.isFinite(sent) || sent < least) {
      toast.error(
        joining
          ? `প্রথমবার সাবস্ক্রাইব করতে সর্বনিম্ন ${bn(least)} টাকা পাঠাতে হবে`
          : `সাবস্ক্রিপশন ফি ${bn(least)} টাকা পাঠাতে হবে`
      );
      return;
    }

    const problem = validatePayment(payment);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSubmitting(true);
    try {
      // address and zone are left empty on purpose — the API fills them from
      // the user's saved profile.
      const res = await subscriptionAPI.requestSubscription({
        package: selected.name,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId.trim(),
        senderNumber: payment.senderNumber.trim(),
        address: '',
        zone: '',
        amount: sent,
      });
      if (res.success) {
        toast.success('রিকোয়েস্ট পাঠানো হয়েছে! অ্যাডমিন অনুমোদনের অপেক্ষায়।');
        setSelected(null);
        router.push('/dashboard/profile');
      } else {
        toast.error(res.message || 'সাবস্ক্রিপশন ব্যর্থ হয়েছে');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'সাবস্ক্রিপশন ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="packages" className="scroll-mt-32 py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="প্যাকেজ"
          title="আপনার জন্য কোনটা ঠিক?"
          subtitle="মাসিক সাবস্ক্রিপশন নিলে প্রতি বেলার খরচ অনেক কমে যায়।"
        />

        {loading ? (
          <div className="mt-14 grid animate-pulse gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[28rem] rounded-3xl bg-ink-200" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-ink-200 bg-ink-50 p-10 text-center">
            <AlertCircle className="mx-auto size-10 text-ink-400" />
            <p className="mt-4 font-semibold text-ink-800">এখন কোনো প্যাকেজ চালু নেই</p>
          </div>
        ) : (
          <div className="mt-14 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg, i) => {
              // The middle card is the one we push; with two packages it is the
              // second, with one it is simply not highlighted.
              const featured = packages.length > 1 && i === Math.floor((packages.length - 1) / 2);
              const own = locked && mine?.package === pkg.name;
              return (
                <article
                  key={pkg._id}
                  className={`relative flex h-full flex-col rounded-3xl border p-7 transition duration-300 ${
                    own
                      ? 'border-leaf-400 bg-white shadow-lift ring-1 ring-leaf-200'
                      : featured
                        ? 'border-brand-300 bg-white shadow-lift lg:-translate-y-3'
                        : 'border-ink-200 bg-white shadow-card hover:-translate-y-1 hover:shadow-lift'
                  }`}
                >
                  {own ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-leaf-600 px-4 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-md">
                      {mine?.status === 'pending' ? 'আপনার রিকোয়েস্ট' : 'আপনার বর্তমান প্যাকেজ'}
                    </span>
                  ) : (
                    featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-md">
                        সবচেয়ে জনপ্রিয়
                      </span>
                    )
                  )}

                  <h3 className="text-xl font-bold text-ink-900">{pkg.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{bn(pkg.duration)} দিনের প্যাকেজ</p>

                  <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-4xl font-bold tracking-tight text-ink-900">{taka(pkg.price)}</span>
                    {pkg.originalPrice > pkg.price && (
                      <span className="text-sm text-ink-400 line-through">{taka(pkg.originalPrice)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-500">সাবস্ক্রিপশন ফি · ফেরতযোগ্য নয়</p>
                  {pkg.discount > 0 && (
                    <span className="mt-2 inline-flex w-fit rounded-full bg-leaf-100 px-2.5 py-1 text-xs font-semibold text-leaf-700">
                      {bn(pkg.discount)}% সাশ্রয়
                    </span>
                  )}

                  <ul className="mt-7 flex-1 space-y-3 border-t border-ink-100 pt-6">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-700">
                        <Check size={17} className="mt-0.5 shrink-0 text-leaf-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => void startSubscribe(pkg)}
                    disabled={locked || preparing !== null}
                    className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                      own
                        ? 'bg-leaf-100 text-leaf-700'
                        : locked
                          ? 'bg-ink-100 text-ink-500'
                          : featured
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700'
                            : 'border border-ink-300 bg-white text-ink-900 hover:border-brand-400 hover:text-brand-700'
                    }`}
                  >
                    {own ? (
                      <>
                        <Check size={16} />
                        {mine?.status === 'pending' ? 'অনুমোদনের অপেক্ষায়' : 'এটি আপনার চালু প্যাকেজ'}
                      </>
                    ) : locked ? (
                      'আপনার সাবস্ক্রিপশন চালু আছে'
                    ) : preparing === pkg._id ? (
                      'হিসাব করা হচ্ছে...'
                    ) : (
                      <>
                        <Sparkles size={16} />
                        সাবস্ক্রাইব করুন
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription request — same send-money-then-prove-it flow as the wallet */}
      {selected && (
        <Modal
          title="সাবস্ক্রিপশন রিকোয়েস্ট"
          description="টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন"
          busy={submitting}
          onClose={() => setSelected(null)}
          footer={
            <Button fullWidth size="lg" loading={submitting} icon={<Sparkles size={17} />} onClick={confirmSubscribe}>
              {submitting ? 'পাঠানো হচ্ছে...' : 'রিকোয়েস্ট পাঠান'}
            </Button>
          }
        >
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-ink-600">আপনি সাবস্ক্রাইব করছেন</p>
            <p className="mt-0.5 font-semibold text-brand-800">{selected.title}</p>
            <p className="mt-1 text-3xl font-bold text-ink-900">{taka(Number(amount) || 0)}</p>
            <p className="mt-0.5 text-xs text-ink-500">{bn(selected.duration)} দিনের জন্য</p>

            {/* What the one payment is made of, so no line is a surprise. */}
            {joining && (
              <dl className="mt-3 space-y-1 border-t border-brand-200/70 pt-3 text-xs text-ink-700">
                <div className="flex items-baseline justify-between gap-3">
                  <dt>সাবস্ক্রিপশন ফি</dt>
                  <dd className="font-semibold">{taka(selected.price)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt>{bn(JOINING_FLOAT_DAYS)} দিনের খাবার (ওয়ালেটে জমা থাকবে)</dt>
                  <dd className="font-semibold">{taka(joining.weekMeals)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt>খাবারের বক্সের ডিপোজিট (ফেরতযোগ্য)</dt>
                  <dd className="font-semibold">{taka(BOX_DEPOSIT)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-brand-200/70 pt-1.5 text-ink-900">
                  <dt className="font-semibold">সর্বনিম্ন</dt>
                  <dd className="font-bold">{taka(joining.minimum)}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="mt-5">
            <Field
              label="কত টাকা পাঠাচ্ছেন?"
              htmlFor="joiningAmount"
              required
              hint={
                joining
                  ? `সর্বনিম্ন ${bn(joining.minimum)} টাকা — বেশি পাঠালে বাকিটাও ওয়ালেটে জমা হবে।`
                  : `সাবস্ক্রিপশন ফি ${bn(selected.price)} টাকা — বেশি পাঠালে বাকিটা ওয়ালেটে জমা হবে।`
              }
            >
              <Input
                id="joiningAmount"
                type="number"
                inputMode="numeric"
                min={joining ? joining.minimum : selected.price}
                step={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-5">
            <PaymentFields amount={Number(amount) || 0} value={payment} onChange={setPayment} />
          </div>

          <p className="mt-5 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
            অ্যাডমিন ট্রানজেকশন আইডি মিলিয়ে দেখে অনুমোদন দিলে তবেই সাবস্ক্রিপশন চালু হবে। ভুল আইডি দিলে রিকোয়েস্ট
            বাতিল হয়ে যাবে। <strong>এর মধ্যে শুধু সাবস্ক্রিপশন ফি ফেরতযোগ্য নয়</strong>
            {joining && <> — বাকি {taka(joining.minimum - selected.price)} আপনার ওয়ালেটেই থাকবে।</>}
          </p>
        </Modal>
      )}
    </section>
  );
}
