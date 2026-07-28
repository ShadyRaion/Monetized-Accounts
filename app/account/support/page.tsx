"use client"

import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserAuth, type SupportTicket } from "@/lib/user-auth-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { ArrowLeft, MessageSquare, Plus, Send, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function SupportPage() {
  const { user, isAuthenticated, supportTickets, createSupportTicket, addTicketResponse, updateTicketStatus, refreshSupportTickets } = useUserAuth()
  const { settings } = useStoreSettings()
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [subjectType, setSubjectType] = useState("")
  const [customSubject, setCustomSubject] = useState("")
  const [message, setMessage] = useState("")
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const [isScrolledDown, setIsScrolledDown] = useState(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [ticketsHovered, setTicketsHovered] = useState(false)
  const [thumbHovered, setThumbHovered] = useState(false)
  const [thumbPosition, setThumbPosition] = useState({ top: 0, height: 0 })
  const [isDraggingThumb, setIsDraggingThumb] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const ticketListRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ startY: number; scrollTop: number } | null>(null)

  const userTickets = supportTickets

  // Find the selected ticket
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

  useEffect(() => {
    if (!selectedTicketId) return
    const updatedTicket = userTickets.find(t => t.id === selectedTicketId)
    if (updatedTicket && updatedTicket !== selectedTicket) {
      setSelectedTicket(updatedTicket)
    }
  }, [selectedTicketId, userTickets, selectedTicket])

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      setIsScrolledDown(true)
      setHasNewMessages(false)
    }
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setIsScrolledDown(isAtBottom)
  }

  const updateTicketListThumb = () => {
    const el = ticketListRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight) {
      setThumbPosition({ top: 0, height: clientHeight })
      return
    }

    const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 32)
    const maxScroll = scrollHeight - clientHeight
    const maxThumbTop = clientHeight - thumbHeight
    const top = (scrollTop / maxScroll) * maxThumbTop
    setThumbPosition({ top, height: thumbHeight })
  }

  const handleThumbMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const el = ticketListRef.current
    if (!el) return
    event.preventDefault()
    dragStartRef.current = { startY: event.clientY, scrollTop: el.scrollTop }
    setIsDraggingThumb(true)
  }

  useEffect(() => {
    if (!isDraggingThumb) return

    const handleMouseMove = (event: MouseEvent) => {
      const el = ticketListRef.current
      const start = dragStartRef.current
      if (!el || !start) return

      const { scrollHeight, clientHeight } = el
      if (scrollHeight <= clientHeight) return

      const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 32)
      const maxScroll = scrollHeight - clientHeight
      const maxThumbTop = clientHeight - thumbHeight
      const deltaY = event.clientY - start.startY
      const newScrollTop = Math.min(Math.max(start.scrollTop + (deltaY / maxThumbTop) * maxScroll, 0), maxScroll)
      el.scrollTop = newScrollTop
      updateTicketListThumb()
    }

    const handleMouseUp = () => {
      setIsDraggingThumb(false)
      dragStartRef.current = null
      document.body.style.userSelect = ''
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [isDraggingThumb])

  useEffect(() => {
    scrollToBottom()
  }, [selectedTicketId])

  useEffect(() => {
    if (!selectedTicket) return
    // When replies change, ensure we scroll to the latest message
    setTimeout(() => {
      scrollToBottom()
    }, 50)
  }, [selectedTicket?.responses.length])

  // Real-time polling for ticket updates: fetch latest tickets then update selected ticket
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (!selectedTicketId || !selectedTicket) return

      try {
        // refresh support tickets in context so `userTickets` is updated
        await refreshSupportTickets()
      } catch (err) {
        console.warn('poll refresh failed', err)
      }

      const updatedTicket = userTickets.find(t => t.id === selectedTicketId)
      if (!updatedTicket) return

      if (updatedTicket.responses.length > selectedTicket.responses.length) {
        setSelectedTicket(updatedTicket)
        setHasNewMessages(true)
        toast.success("New message received")
        setTimeout(scrollToBottom, 50)
        return
      }

      if (updatedTicket.status !== selectedTicket.status) {
        setSelectedTicket(updatedTicket)
      }
    }, 1000)

    return () => clearInterval(pollInterval)
  }, [selectedTicketId, userTickets, selectedTicket, refreshSupportTickets])

  // Update selected ticket if it changes in the context
  useEffect(() => {
    if (selectedTicket) {
      const updatedTicket = userTickets.find(t => t.id === selectedTicket.id)
      if (updatedTicket && updatedTicket !== selectedTicket) {
        setSelectedTicket(updatedTicket)
      }
    }
  }, [selectedTicket, userTickets])

  const getTicketTypeFromSubject = (subjectValue: string) => {
    switch (subjectValue) {
      case "purchase": return "Purchase"
      case "support": return "Technical"
      case "transfer": return "Transfer"
      case "refund": return "Refund"
      case "affiliate": return "Affiliate"
      default: return "Other"
    }
  }

  const getSubjectLabel = (subjectValue: string) => {
    switch (subjectValue) {
      case "purchase": return "Purchase Inquiry"
      case "support": return "Technical Support"
      case "transfer": return "Account Transfer"
      case "refund": return "Refund Request"
      case "affiliate": return "Affiliate Program"
      default: return "Other"
    }
  }

  const displayTicketSubject = (subject: string) => {
    switch (subject.toLowerCase()) {
      case "purchase":
        return "Purchase Inquiry"
      case "support":
      case "technical":
        return "Technical Support"
      case "transfer":
        return "Account Transfer"
      case "refund":
        return "Refund Request"
      case "affiliate":
        return "Affiliate Program"
      default:
        return subject
    }
  }

  const wrapSubjectForList = (subject: string, maxLineLength = 14) => {
    if (!subject) return ""
    const words = subject.split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let currentLine = ""

    const flushLine = () => {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ""
      }
    }

    const appendChunk = (chunk: string) => {
      if (!currentLine) {
        currentLine = chunk
      } else if (currentLine.length + 1 + chunk.length <= maxLineLength) {
        currentLine += ` ${chunk}`
      } else {
        flushLine()
        currentLine = chunk
      }
    }

    for (const word of words) {
      if (word.length <= maxLineLength) {
        appendChunk(word)
        continue
      }

      if (currentLine) {
        flushLine()
      }

      let remaining = word
      while (remaining.length > maxLineLength) {
        lines.push(`${remaining.slice(0, maxLineLength - 1)}-`)
        remaining = remaining.slice(maxLineLength - 1)
      }
      currentLine = remaining
    }

    flushLine()
    return lines.join("\n")
  }

  const handleCreateTicket = async () => {
    if (!user) return
    const finalSubject = subjectType === "other" ? customSubject.trim().slice(0, 40) : getSubjectLabel(subjectType)
    if (!finalSubject || !message.trim()) return

    const newTicketId = await createSupportTicket(finalSubject, message.trim(), getTicketTypeFromSubject(subjectType))
    
    setSubject("")
    setSubjectType("")
    setCustomSubject("")
    setMessage("")
    setNewTicketOpen(false)
    
    // Auto-select the newly created ticket
    if (newTicketId) {
      setSelectedTicketId(newTicketId)
    }
  }

  useEffect(() => {
    updateTicketListThumb()
    const handleResize = () => updateTicketListThumb()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [userTickets.length])

  const handleSendReply = () => {
    if (!selectedTicketId || !replyMessage.trim()) return
    addTicketResponse(selectedTicketId, replyMessage.trim())
    setReplyMessage("")
    setHasNewMessages(false)
    setTimeout(scrollToBottom, 100)
  }

  const handleCloseTicket = (ticketId: string) => {
    updateTicketStatus(ticketId, "closed")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <CheckCircle className="w-4 h-4" />
      case "opened": return <AlertCircle className="w-4 h-4" />
      case "replied": return <Clock className="w-4 h-4" />
      case "closed": return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-800"
      case "opened": return "bg-gray-100 text-gray-800"
      case "replied": return "bg-yellow-100 text-yellow-800"
      case "closed": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open": return "Replied"
      case "opened": return "Opened"
      case "replied": return "Open"
      case "closed": return "Closed"
      default: return status
    }
  }

  // Break message into lines with up to 40 characters per line so bubble width matches the text content
  const wrapMessage = (text: string, maxChars = 40) => {
    if (!text) return ['']
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length === 0) return ['']
    const lines: string[] = []
    let currentLine = ''

    const flushLine = () => {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ''
      }
    }

    const breakLongWord = (word: string) => {
      while (word.length > maxChars) {
        lines.push(`${word.slice(0, maxChars - 1)}-`)
        word = word.slice(maxChars - 1)
      }
      return word
    }

    for (let word of words) {
      if (!currentLine) {
        currentLine = word.length > maxChars ? breakLongWord(word) : word
        continue
      }

      if (currentLine.length + 1 + word.length <= maxChars) {
        currentLine += ` ${word}`
        continue
      }

      flushLine()
      currentLine = word.length > maxChars ? breakLongWord(word) : word
    }

    flushLine()
    return lines
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold mb-2">Please log in to view your messages</h2>
          <p className="text-gray-500 mb-4">You need to be logged in to access your support tickets.</p>
          <Link href="/login">
            <Button style={{ backgroundColor: settings.primaryColor }} className="text-white">
              Log In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-4 pb-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/account" className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Account
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Messages</h1>
          <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: settings.primaryColor }} className="text-white gap-2">
                <Plus className="w-4 h-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send a Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subjectType} onValueChange={setSubjectType}>
                    <SelectTrigger>
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
                {subjectType === "other" && (
                  <div className="space-y-2">
                    <Label htmlFor="customSubject">Please specify your topic</Label>
                    <Input
                      id="customSubject"
                      placeholder="Enter your topic..."
                      value={customSubject}
                      maxLength={40}
                      onChange={(e) => setCustomSubject(e.target.value.slice(0, 40))}
                    />
                    <p className="text-xs text-gray-500">
                      {customSubject.length}/40 characters
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue or question in detail..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateTicket} 
                  className="w-full text-white"
                  style={{ backgroundColor: settings.primaryColor }}
                  disabled={(!subjectType || (subjectType === "other" && !customSubject.trim())) || !message.trim()}
                >
                  Send Message
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {userTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-gray-500 mb-4">Send us a message if you need help with your orders or account</p>
              <Button 
                onClick={() => setNewTicketOpen(true)}
                style={{ backgroundColor: settings.primaryColor }} 
                className="text-white"
              >
                Send Your First Message
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-5 gap-6">
            {/* Ticket List */}
            <div className="md:col-span-2">
              <div className="h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-[28px] bg-white/90 shadow-sm border border-transparent">
                <div
                  className="relative h-full overflow-hidden"
                  onMouseEnter={() => setTicketsHovered(true)}
                  onMouseLeave={() => setTicketsHovered(false)}
                >
                  <div
                    ref={ticketListRef}
                    onScroll={updateTicketListThumb}
                    className="support-ticket-list h-full overflow-y-auto overflow-x-hidden p-3 pr-8 space-y-3"
                  >
                    {userTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={cn(
                          "cursor-pointer rounded-2xl border border-gray-200/70 bg-white p-4 transition-all",
                          selectedTicketId === ticket.id ? "ring-2 ring-slate-300" : "hover:shadow-sm"
                        )}
                        style={{ 
                          borderColor: selectedTicketId === ticket.id ? settings.primaryColor : undefined,
                          boxShadow: selectedTicketId === ticket.id ? `0 0 0 2px ${settings.primaryColor}` : undefined
                        }}
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-medium text-sm whitespace-pre-wrap break-words">
                            {wrapSubjectForList(displayTicketSubject(ticket.subject), 20)}
                          </h3>
                          <Badge className={cn(getStatusColor(ticket.status), "text-xs shrink-0")}>
                            {getStatusLabel(ticket.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                        </p>
                        {ticket.responses.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {ticket.responses.length} {ticket.responses.length === 1 ? "reply" : "replies"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div
                    className={cn(
                      "pointer-events-auto absolute inset-y-0 right-0 flex items-start justify-end pr-6 transition-opacity duration-200 ease-out",
                      ticketsHovered ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-auto rounded-full transition-all duration-200 ease-out custom-ticket-scroll-thumb cursor-grab",
                        ticketsHovered && "visible",
                        thumbHovered ? "w-4" : "w-2"
                      )}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: thumbPosition.top,
                        height: thumbPosition.height,
                      }}
                      onMouseEnter={() => setThumbHovered(true)}
                      onMouseLeave={() => setThumbHovered(false)}
                      onMouseDown={handleThumbMouseDown}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Detail / Conversation */}
            <div className="md:col-span-3">
              {selectedTicket ? (
                <Card className="flex flex-col py-3 h-[calc(100vh-200px)] min-h-[500px] max-h-[85vh]">
                  <CardHeader className="border-b shrink-0 h-12 overflow-hidden p-0">
                    <div className="flex h-full items-center justify-between px-4 py-0">
                      <div className="max-w-[calc(100%-12rem)] overflow-hidden">
                        <CardTitle className="text-base whitespace-pre-wrap break-words leading-tight m-0">
                          {wrapSubjectForList(displayTicketSubject(selectedTicket.subject), 24)}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={getStatusColor(selectedTicket.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(selectedTicket.status)}
                            {getStatusLabel(selectedTicket.status)}
                          </span>
                        </Badge>
                        {selectedTicket.status !== "closed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCloseTicket(selectedTicket.id)}
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 p-0 min-h-0 overflow-hidden">
                    {/* Conversation Thread */}
                    <div 
                      ref={messagesContainerRef}
                      onScroll={handleScroll}
                      className="flex-1 overflow-y-auto px-3 pt-3 pb-0 relative"
                    >
                      <div className="space-y-2">
                        {/* Original Message */}
                        {(() => {
                          const isOriginalLast = selectedTicket.responses.length === 0;
                          return (
                            <div className="flex w-full justify-end">
                              <div className={cn("flex flex-col items-end", isOriginalLast && "mb-2")}>
                                <div className="bg-[#FE2C55]/10 text-[#3d0711] border border-[#FE2C55]/40 rounded-lg p-2.5 max-w-[40ch]">
                                  {wrapMessage(selectedTicket.message, 40).map((line, i) => (
                                    <p key={i} className="text-sm text-[#3d0711] whitespace-pre-wrap">
                                      {line}
                                    </p>
                                  ))}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1 text-right">{format(new Date(selectedTicket.createdAt), "MMM d, h:mm a")}</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Replies */}
                        {selectedTicket.responses.map((reply, idx) => {
                          const isLast = idx === selectedTicket.responses.length - 1;
                          return (
                            <div key={reply.id} className={cn("flex w-full", reply.isAdmin ? "justify-start" : "justify-end")}>
                              <div className={cn("flex flex-col", reply.isAdmin ? "items-start" : "items-end", isLast && "mb-2")}>
                                <div className={cn("rounded-xl p-2 shadow-sm max-w-[40ch]", reply.isAdmin ? "bg-gray-100 text-gray-900" : "bg-[#FE2C55]/10 text-[#3d0711] border border-[#FE2C55]/40")} style={{ display: 'inline-block', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                  {wrapMessage(reply.message, 40).map((line, i) => (
                                    <div key={i} className="text-xs sm:text-sm whitespace-pre-wrap" style={{ fontSize: '0.85rem', lineHeight: 1.25 }}>{line}</div>
                                  ))}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1" style={{ textAlign: reply.isAdmin ? 'left' : 'right' }}>{format(new Date(reply.createdAt), "MMM d, h:mm a")}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {selectedTicket.status !== "closed" ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-white border-t shrink-0 h-fit min-h-0">
                        <Input
                          placeholder="Type your reply..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                          className="my-0 h-6 text-sm"
                        />
                        <Button
                          onClick={handleSendReply}
                          style={{ backgroundColor: settings.primaryColor }}
                          size="sm"
                          className="text-white my-0 h-6 px-2"
                          disabled={!replyMessage.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
                        <p className="text-sm">This conversation is closed. You can view the messages but cannot add new replies.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] max-h-[85vh] justify-center">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Select a message to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
