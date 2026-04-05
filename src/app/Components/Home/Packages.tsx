import React from 'react'
import { Star, Diamond, CheckCircle, Truck, Coffee, Home, Gift, Sparkles, Crown, Zap, Shield } from 'lucide-react'

export default function Packages() {
    return (
        <section className="px-4 sm:px-8 md:px-[100px] lg:px-[150px] xl:px-[200px] py-[50px] md:py-[100px] bg-white">
            <div className='max-w-6xl mx-auto'>
                {/* Section Header */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">আমাদের প্যাকেজসমূহ</h2>
                    <p className="text-gray-500">আপনার প্রয়োজন অনুযায়ী প্যাকেজ সিলেক্ট করুন</p>
                </div>

                {/* Package Cards - Golden & Diamond */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* Golden Package */}
                    <div className="border-2 border-[#3B82F6] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] px-6 py-5 text-center">
                            <div className="flex justify-center mb-2">
                                <Star className="w-10 h-10 text-yellow-300" />
                            </div>
                            <h3 className="text-white text-2xl font-bold">✨ গোল্ডেন প্যাকেজ ✨</h3>
                            <p className="text-blue-200 text-sm">সপ্তাহিক স্পেশাল অফার</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Truck className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">⭐ সপ্তাহের ৭ দিন ডেলিভারি</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Coffee className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">⭐ প্রতিদিন ৩ বেলা খাবার</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Home className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">⭐ ফ্রি হোম ডেলিভারি</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Gift className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">⭐ এক্সট্রা আইটেম ফ্রি (প্রতি সপ্তাহে)</span>
                                </li>
                            </ul>
                            <div className="text-center pt-4 border-t border-blue-100">
                                <div className="mb-3">
                                    <span className="text-3xl font-bold text-[#3B82F6]">৳ ২৫০০</span>
                                    <span className="text-gray-400 line-through ml-3">৳ ৩৫০০</span>
                                </div>
                                <button className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-lg text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    গোল্ডেন প্যাকেজ অর্ডার করুন
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Diamond Package */}
                    <div className="border-2 border-[#3B82F6] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative">
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            BEST SELLER
                        </div>
                        <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] px-6 py-5 text-center">
                            <div className="flex justify-center mb-2">
                                <Diamond className="w-10 h-10 text-blue-300" />
                            </div>
                            <h3 className="text-white text-2xl font-bold">💎 ডায়মন্ড প্যাকেজ 💎</h3>
                            <p className="text-blue-200 text-sm">প্রিমিয়াম সার্ভিস</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Truck className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">💎 সপ্তাহের ৭ দিন ডেলিভারি</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Coffee className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">💎 প্রতিদিন ৩ বেলা খাবার</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Home className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">💎 ফ্রি হোম ডেলিভারি + হট ব্যাগ</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Gift className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">💎 এক্সট্রা ডেজার্ট আইটেম ফ্রি</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <Shield className="w-5 h-5 text-[#3B82F6]" />
                                    <span className="font-medium">💎 প্রায়োরিটি সাপোর্ট</span>
                                </li>
                            </ul>
                            <div className="text-center pt-4 border-t border-blue-100">
                                <div className="mb-3">
                                    <span className="text-3xl font-bold text-[#3B82F6]">৳ ৩৫০০</span>
                                    <span className="text-gray-400 line-through ml-3">৳ ৪৫০০</span>
                                </div>
                                <button className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-lg text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
                                    <Crown className="w-5 h-5" />
                                    ডায়মন্ড প্যাকেজ অর্ডার করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Extra Info */}
                <div className="text-center mt-8">
                    <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4 text-[#3B82F6]" />
                        উভয় প্যাকেজেই রয়েছে স্পেশাল ডিসকাউন্ট
                        <Zap className="w-4 h-4 text-[#3B82F6]" />
                    </p>
                </div>
            </div>
        </section>
    )
}