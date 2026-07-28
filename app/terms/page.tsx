import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Terms of Service | Monetized Accounts",
  description: "Terms and conditions for using Monetized Accounts services.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-black mb-8">Terms of Service</h1>
            <p className="text-gray-500 mb-8">Last updated: January 1, 2026</p>
            
            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-600 mb-4">
                  By accessing or using Monetized Accounts, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">2. Services Description</h2>
                <p className="text-gray-600 mb-4">
                  Monetized Accounts provides a marketplace for the sale of pre-monetized social media accounts, including but not limited to TikTok and YouTube accounts. We facilitate the secure transfer of account ownership between sellers and buyers.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">3. Account Purchases</h2>
                <p className="text-gray-600 mb-4">
                  When you purchase an account through our platform:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>You acknowledge that you are purchasing an existing social media account</li>
                  <li>Account transfer typically takes 24-72 hours depending on the platform</li>
                  <li>All sales are subject to our refund policy</li>
                  <li>You agree to comply with the respective platform&apos;s terms of service</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">4. User Responsibilities</h2>
                <p className="text-gray-600 mb-4">
                  As a user of Monetized Accounts, you agree to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Provide accurate and complete information during registration and purchase</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Not use purchased accounts for illegal or harmful activities</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">5. Payment Terms</h2>
                <p className="text-gray-600 mb-4">
                  All payments are processed securely through our payment partners. Prices are listed in USD and are subject to change without notice. We accept major credit cards, PayPal, and select cryptocurrencies.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">6. Disclaimer of Warranties</h2>
                <p className="text-gray-600 mb-4">
                  While we strive to provide accurate information about all accounts, we cannot guarantee future performance, earnings, or engagement rates. Past performance is not indicative of future results.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">7. Limitation of Liability</h2>
                <p className="text-gray-600 mb-4">
                  Monetized Accounts shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of our services. Our total liability shall not exceed the amount paid for the specific account in question.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">8. Modifications to Terms</h2>
                <p className="text-gray-600 mb-4">
                  We reserve the right to modify these terms at any time. Continued use of our services after any changes constitutes acceptance of the modified terms.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">9. Contact Information</h2>
                <p className="text-gray-600 mb-4">
                  For questions about these Terms of Service, please contact us at admin@example.com.
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
