import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Privacy Policy | Monetized Accounts",
  description: "Privacy policy for Monetized Accounts - how we collect, use, and protect your data.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-black mb-8">Privacy Policy</h1>
            <p className="text-gray-500 mb-8">Last updated: January 1, 2026</p>
            
            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">1. Information We Collect</h2>
                <p className="text-gray-600 mb-4">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Name and email address when you create an account or make a purchase</li>
                  <li>Payment information processed through our secure payment partners</li>
                  <li>Communication data when you contact our support team</li>
                  <li>Usage data including pages visited and features used</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">2. How We Use Your Information</h2>
                <p className="text-gray-600 mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Process your purchases and facilitate account transfers</li>
                  <li>Communicate with you about your orders and our services</li>
                  <li>Improve and optimize our website and services</li>
                  <li>Send promotional communications (with your consent)</li>
                  <li>Prevent fraud and ensure platform security</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">3. Information Sharing</h2>
                <p className="text-gray-600 mb-4">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Payment processors to complete transactions</li>
                  <li>Service providers who assist in our operations</li>
                  <li>Law enforcement when required by law</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">4. Data Security</h2>
                <p className="text-gray-600 mb-4">
                  We implement industry-standard security measures to protect your personal information, including encryption, secure servers, and regular security audits. However, no method of transmission over the Internet is 100% secure.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">5. Cookies and Tracking</h2>
                <p className="text-gray-600 mb-4">
                  We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can control cookie preferences through your browser settings.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">6. Your Rights</h2>
                <p className="text-gray-600 mb-4">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Data portability</li>
                </ul>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">7. Data Retention</h2>
                <p className="text-gray-600 mb-4">
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">8. Children&apos;s Privacy</h2>
                <p className="text-gray-600 mb-4">
                  Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">9. Contact Us</h2>
                <p className="text-gray-600 mb-4">
                  For questions about this Privacy Policy or to exercise your privacy rights, contact us at privacy@monetizedprofiles.com.
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
