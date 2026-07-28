"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MessageCircle, Copy, CheckCircle, Mail, Disc } from "lucide-react"
import { useUserAuth } from "@/lib/user-auth-context"
import { useStoreData } from "@/lib/store-data-context"
import { useStoreSettings } from "@/lib/store-settings-context"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    customSubject: "",
    message: ""
  })
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const { isAuthenticated, user } = useUserAuth()
  const { addTicket } = useStoreData()
  const { settings } = useStoreSettings()
  const router = useRouter()

  // Pre-fill form with the current server-backed user.
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({ ...prev, name: user.name, email: user.email }))
    }
  }, [isAuthenticated, user])

  // Auto-submit if returning from login with pending form data
  useEffect(() => {
    if (pendingSubmit && isAuthenticated && user && formData.message && formData.subject) {
      const finalSubject = formData.subject === "other" ? formData.customSubject : formData.subject
      
      addTicket({
        userId: user.id,
        name: formData.name,
        email: formData.email,
        type: mapSubjectToType(formData.subject),
        subject: finalSubject,
        message: formData.message
      })
      
      setSubmitted(true)
      setPendingSubmit(false)
      // Remain on the contact page showing the submitted confirmation
    }
  }, [pendingSubmit, isAuthenticated, user, formData, addTicket, router])

  const copyEmail = () => {
    if (settings.storeEmail) {
      navigator.clipboard.writeText(settings.storeEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const normalizeUrl = (url?: string) => {
    if (!url) return ""
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return `https://${url.replace(/^\/+/, "")}`
  }

  const discordUrl = normalizeUrl(settings.storeDiscordLink)

  const mapSubjectToType = (subjectValue: string) => {
    switch (subjectValue) {
      case "purchase": return "Purchase"
      case "support": return "Technical"
      case "transfer": return "Transfer"
      case "refund": return "Refund"
      case "affiliate": return "Affiliate"
      default: return "Other"
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalSubject = formData.subject === "other" ? formData.customSubject : formData.subject
    
    // Require authentication without persisting form data in the browser.
    if (!isAuthenticated) {
      router.push(`/login?email=${encodeURIComponent(formData.email)}`)
      return
    }
    
    // Create ticket for logged-in users
    addTicket({
      userId: user?.id,
      name: formData.name,
      email: formData.email,
      type: mapSubjectToType(formData.subject),
      subject: finalSubject,
      message: formData.message
    })
    
    setSubmitted(true)
    // Stay on the same page after submission
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        <section className="bg-black text-white py-8 sm:py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FE2C55] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-6">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
              Contact Us
            </h1>
            <p className="text-gray-400 text-xs sm:text-base md:text-lg max-w-2xl mx-auto">
              Have a question? We&apos;re here for you 24/7.
            </p>
          </div>
        </section>
        
        <section className="py-8 sm:py-16">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-12 max-w-6xl mx-auto">
              <div className="lg:col-span-2">
                {submitted ? (
                  <div className="bg-[#25F4EE]/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-center">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-[#25F4EE] mx-auto mb-3 sm:mb-4" />
                    <h2 className="text-lg sm:text-2xl font-bold text-black mb-2">Message Sent!</h2>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      Your message has been sent. Our support team will get back to you soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
                      <div>
                        <Label htmlFor="name" className="text-xs sm:text-sm">Name</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                          className="rounded-lg mt-1 text-xs sm:text-sm py-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          className="rounded-lg mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Select 
                        value={formData.subject} 
                        onValueChange={(value) => setFormData({...formData, subject: value})}
                      >
                        <SelectTrigger className="rounded-lg mt-1">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="purchase">Purchase Inquiry</SelectItem>
                          <SelectItem value="support">Technical Support</SelectItem>
                          <SelectItem value="transfer">Account Transfer</SelectItem>
                          <SelectItem value="refund">Refund Request</SelectItem>
                          <SelectItem value="affiliate">Affiliate Program</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.subject === "other" && (
                      <div>
                        <Label htmlFor="customSubject">Please specify your topic</Label>
                        <Input
                          id="customSubject"
                          placeholder="Enter your topic..."
                          value={formData.customSubject}
                          onChange={(e) => setFormData({...formData, customSubject: e.target.value})}
                          required
                          className="rounded-lg mt-1"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us how we can help you..."
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        required
                        className="rounded-lg mt-1 min-h-[150px]"
                      />
                    </div>
                    
                    <Button 
                      type="submit"
                      className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full text-lg py-6"
                      disabled={formData.subject === "other" && !formData.customSubject.trim()}
                    >
                      Send Message
                    </Button>
                  </form>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <MessageCircle className="w-8 h-8 text-[#25F4EE] mb-4" />
                  <h3 className="font-bold text-black mb-2">Live Chat</h3>
                  <p className="text-gray-600 text-sm mb-2">Chat with our team in real-time</p>
                  <span className="text-[#25F4EE] font-medium">Available 24/7</span>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-6">
                  <Disc className="w-8 h-8 text-[#5865F2] mb-4" />
                  <h3 className="font-bold text-black mb-2">Discord Community</h3>
                  <p className="text-gray-600 text-sm mb-2">Join our community for instant help</p>
                  {discordUrl ? (
                    <a href={discordUrl} target="_blank" rel="noreferrer" className="text-[#5865F2] font-medium hover:underline">
                      Join Now
                    </a>
                  ) : (
                    <span className="text-gray-500 font-medium">Discord not set</span>
                  )}
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <Mail className="w-8 h-8 text-[#FE2C55] mb-4" />
                  <h3 className="font-bold text-black mb-2">Support Email</h3>
                  <p className="text-gray-600 text-sm mb-2">Reach our team directly</p>
                  {settings.storeEmail ? (
                    <button 
                      onClick={copyEmail}
                      className="flex items-center gap-2 text-[#25F4EE] font-medium hover:opacity-80 transition-opacity break-all"
                    >
                      <span>{settings.storeEmail}</span>
                      {copiedEmail ? (
                        <CheckCircle className="w-4 h-4 shrink-0 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                  ) : (
                    <span className="text-gray-500 font-medium">Email not set</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}
