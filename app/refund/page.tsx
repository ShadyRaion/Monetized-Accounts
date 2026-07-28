import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Shield, Clock, AlertCircle, CheckCircle } from "lucide-react"

export const metadata = {
  title: "Refund Policy | Monetized Accounts",
  description: "Our 30-day money-back guarantee and refund policy for monetized account purchases.",
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-[#25F4EE]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-[#25F4EE]" />
              </div>
              <h1 className="text-4xl font-bold text-black mb-4">Refund Policy</h1>
              <p className="text-gray-500">Last updated: January 1, 2026</p>
            </div>
            
            <div className="bg-[#FE2C55]/5 border border-[#FE2C55]/20 rounded-2xl p-6 mb-12">
              <h2 className="text-xl font-bold text-black mb-2">30-Day Money-Back Guarantee</h2>
              <p className="text-gray-600">
                We stand behind the quality of our accounts. If you&apos;re not satisfied with your purchase, we offer a full refund within 30 days of purchase, subject to the conditions outlined below.
              </p>
            </div>
            
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-black mb-4">Eligible for Refund</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#25F4EE] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Account suspended due to pre-existing issues within 30 days of purchase</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#25F4EE] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Monetization status not as advertised at time of transfer</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#25F4EE] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Follower count significantly different from listing (more than 10% variance)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#25F4EE] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Account credentials don&apos;t work or weren&apos;t provided properly</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#25F4EE] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">We fail to complete the transfer within the stated timeframe</p>
                  </div>
                </div>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-black mb-4">Not Eligible for Refund</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FE2C55] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Account suspended due to your actions after transfer (policy violations, etc.)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FE2C55] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Change of mind or buyer&apos;s remorse after successful transfer</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FE2C55] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Earnings lower than expected (earnings are estimates, not guarantees)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FE2C55] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Platform-wide changes that affect account performance</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FE2C55] flex-shrink-0 mt-0.5" />
                    <p className="text-gray-600">Requests made after 30 days from purchase date</p>
                  </div>
                </div>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-black mb-4">Refund Process</h2>
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-[#FE2C55] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Submit a Request</h3>
                      <p className="text-gray-600 text-sm">Contact our support team with your order number and reason for refund.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-[#FE2C55] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Review Process</h3>
                      <p className="text-gray-600 text-sm">Our team will review your request within 24-48 hours.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-[#FE2C55] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-black">Resolution</h3>
                      <p className="text-gray-600 text-sm">If approved, we&apos;ll offer a full refund or replacement account of equal value.</p>
                    </div>
                  </div>
                </div>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-black mb-4">Refund Timeline</h2>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#25F4EE] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-600">
                    Once approved, refunds are processed within 5-7 business days. The refund will be credited to the original payment method. Please allow additional time for your bank to process the transaction.
                  </p>
                </div>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-black mb-4">Contact Us</h2>
                <p className="text-gray-600">
                  For refund requests or questions about this policy, please contact us at refunds@monetizedprofiles.com or through our contact page.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
