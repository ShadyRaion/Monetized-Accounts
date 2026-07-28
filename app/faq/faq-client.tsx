"use client"

import { useStoreSettings } from "@/lib/store-settings-context"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { faqs as defaultFaqs } from "@/lib/data"
import { HelpCircle, MessageCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function FAQClient() {
  const { settings } = useStoreSettings()
  const [faqItems, setFaqItems] = useState<any[]>(settings.faqs?.length ? settings.faqs : defaultFaqs)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await apiFetch('/settings/faqs')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setFaqItems(data.filter((f: any) => !f.hidden))
      } catch (err) {
        console.error('Failed to load faqs', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        <section className="bg-black text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="w-16 h-16 bg-[#FE2C55] rounded-full flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to know about buying monetized accounts. Can&apos;t find the answer you&apos;re looking for? Contact our support team.
            </p>
          </div>
        </section>

        <section className="pt-12 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqItems.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-2 border-gray-200 bg-white rounded-2xl px-6 data-[state=open]:border-[#FE2C55]"
                  >
                    <AccordionTrigger className="text-left font-bold text-black hover:no-underline py-6">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-6">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="bg-gray-50 rounded-3xl p-8 text-center">
                <MessageCircle className="w-12 h-12 text-[#25F4EE] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-black mb-2">Still have questions?</h2>
                <p className="text-gray-600 mb-6">
                  Our support team is available 24/7 to help you with any questions.
                </p>
                <Link href="/contact">
                  <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full px-8">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
