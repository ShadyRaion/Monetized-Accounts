"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { useStoreData, type Ticket } from "@/lib/store-data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MessageSquare, Mail, Trash2, Reply, Send, User } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { formatSafeDate } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  open: "bg-amber-400 text-amber-950",
  opened: "bg-gray-500 text-white",
  replied: "bg-green-500 text-white",
  closed: "bg-red-500 text-white"
}

export default function MessagesPage() {
  const { user, isLoading } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  if (!user) return null

  return <MessagesClient />
}

function MessagesClient() {
  const { tickets, addTicketReply, markTicketAsOpened, updateTicketStatus, deleteTicket, refreshTickets, clearOpenTickets, reopenTicket } = useStoreData()
  const [activeTab, setActiveTab] = useState<string>("all")
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const selectedTicket = useMemo(
    () => selectedTicketId ? tickets.find(ticket => ticket.id === selectedTicketId) || null : null,
    [selectedTicketId, tickets]
  )
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [isScrolledDown, setIsScrolledDown] = useState(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refreshTickets().catch((error) => {
      console.error('Failed to refresh admin tickets on mount:', error)
    })
  }, [refreshTickets])

  useEffect(() => {
    clearOpenTickets?.()
  }, [clearOpenTickets])

  // Poll for ticket updates while a ticket is open
  useEffect(() => {
    if (!selectedTicket) return

    const pollInterval = setInterval(() => {
      refreshTickets().catch(console.error)
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [selectedTicket, refreshTickets])

  // Auto-scroll when selected ticket changes or messages update
  useEffect(() => {
    if (selectedTicket && messagesContainerRef.current) {
      setTimeout(scrollToBottom, 50)
    }
  }, [selectedTicket?.id, selectedTicket?.replies.length])

  // Update selected ticket if it changes in the context

  useEffect(() => {
    if (!hasNewMessages) return
    toast.success("New message received")
  }, [hasNewMessages])

  // Filter tickets by active status tab
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (activeTab === "all") return true
      if (activeTab === "open") return ticket.status === "open" || ticket.status === "opened"
      return ticket.status === activeTab
    })
  }, [activeTab, tickets])

  // Counts
  const openCount = useMemo(() => tickets.filter(t => t.status === "open" || t.status === "opened").length, [tickets])
  const repliedCount = useMemo(() => tickets.filter(t => t.status === "replied").length, [tickets])
  const closedCount = useMemo(() => tickets.filter(t => t.status === "closed").length, [tickets])

  const openTicket = async (ticket: Ticket) => {
    console.debug('[admin messages] openTicket', ticket.id, ticket.subject, ticket.replies.length)
    setSelectedTicketId(ticket.id)
    setIsDetailModalOpen(true)
    setReplyText("")
    setIsScrolledDown(true)
    setHasNewMessages(false)
    // Scroll to bottom after modal opens
    setTimeout(scrollToBottom, 100)

    // Only change status to opened when the ticket is currently open.
    if (ticket.status !== "open") return

    try {
      await markTicketAsOpened(ticket.id)
    } catch (err) {
      console.warn('Failed to update ticket status:', err)
    }
  }

  useEffect(() => {
    if (selectedTicket) {
      console.debug('[admin messages] selectedTicket selected', selectedTicket.id, selectedTicket.subject, selectedTicket.replies.length, selectedTicket)
    }
  }, [selectedTicket])

  const handleDelete = () => {
    if (!deleteTicketId) return
    deleteTicket(deleteTicketId)
    setDeleteTicketId(null)
    setIsDeleteDialogOpen(false)
    setIsDetailModalOpen(false)
    setSelectedTicketId(null)
    toast.success("Ticket deleted")
  }

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
    if (isAtBottom && hasNewMessages) {
      setHasNewMessages(false)
    }
  }

  const handleReplyChange = (value: string) => {
    setReplyText(value)
    if (hasNewMessages) {
      setHasNewMessages(false)
    }
  }

  const handleSendReply = () => {
    if (!selectedTicket || !replyText.trim()) return
    addTicketReply(selectedTicket.id, replyText.trim(), true)
    setReplyText("")
    setHasNewMessages(false)
    setTimeout(scrollToBottom, 50)
    toast.success("Reply sent successfully")
  }

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      handleSendReply()
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = replyText.substring(0, start) + "\n" + replyText.substring(end)
      setReplyText(newText)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
    }
  }

  const handleCloseTicket = (ticketId: string) => {
    updateTicketStatus(ticketId, "closed")
    toast.success("Ticket closed")
  }

  const handleReopenTicket = async (ticketId: string) => {
    await reopenTicket(ticketId)
    toast.success("Ticket reopened")
  }

  // Helper to break message into lines with up to 40 characters per line
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

    for (const word of words) {
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

  return (
    <div className="p-2 sm:p-4 lg:p-6 pt-16 sm:pt-6 lg:pt-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-2 sm:mb-3 text-[8px] sm:text-xs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ks7q" className="text-[8px] sm:text-xs text-white">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Messages</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Messages</h1>
          <p className="text-[9px] sm:text-xs text-white">Customer support tickets and inquiries</p>
        </div>
        {openCount > 0 && (
          <Badge className="bg-[#FE2C55] text-white text-[9px] py-0.5 px-1.5 w-fit">
            {openCount} new
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-2 sm:mb-3 w-full overflow-x-auto">
        <TabsList className="h-8 text-[9px] sm:text-xs w-full justify-start">
          <TabsTrigger value="all" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">All ({tickets.length})</TabsTrigger>
          <TabsTrigger value="open" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Open ({openCount})</TabsTrigger>
          <TabsTrigger value="replied" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Replied ({repliedCount})</TabsTrigger>
          <TabsTrigger value="closed" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Closed ({closedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tickets List */}
      <Card>
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4">
          <CardTitle className="flex items-center gap-1 text-sm">
            <MessageSquare className="h-4 w-4" />
            Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-6 sm:py-12">
              <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
              <p className="text-[9px] sm:text-sm text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className={cn(
                    "flex flex-col gap-1 p-2 sm:p-3 cursor-pointer transition-all duration-200 border rounded-lg",
                    ticket.status === "open" && "bg-yellow-200 border-yellow-400 hover:bg-yellow-300 hover:shadow-md",
                    ticket.status === "opened" && "bg-gray-200 border-gray-400 hover:bg-gray-300 hover:shadow-md",
                    ticket.status === "replied" && "bg-green-200 border-green-400 hover:bg-green-300 hover:shadow-md",
                    ticket.status === "closed" && "bg-red-200 border-red-400 hover:bg-red-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className={cn(
                      "text-[9px] sm:text-xs font-medium truncate max-w-[60%]",
                      ticket.status === "open" && "font-bold"
                    )}>
                      {ticket.name}
                    </span>
                    <Badge className={cn(statusColors[ticket.status], "text-[9px] sm:text-xs py-1 px-2 whitespace-nowrap font-semibold")}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-[8px] sm:text-xs text-muted-foreground truncate">{ticket.email}</p>
                  <p className={cn(
                    "text-[8px] sm:text-xs truncate",
                    ticket.status === "open" ? "font-semibold" : "font-medium"
                  )}>
                    {ticket.subject}
                  </p>
                  <p className="text-[8px] sm:text-xs text-muted-foreground truncate">
                    {ticket.message.substring(0, 50)}...
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] sm:text-xs text-muted-foreground">
                      {formatSafeDate(ticket.createdAt, "MMM d, h:mm a")}
                    </span>
                    {ticket.replies.length > 0 && (
                      <span className="text-[7px] sm:text-xs text-muted-foreground">
                        {ticket.replies.length} {ticket.replies.length === 1 ? "reply" : "replies"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal with Conversation */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl w-full h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-4 border-b shrink-0 pr-4">
            <div className="flex items-center justify-between gap-2 w-full">
              <DialogTitle className="text-sm sm:text-base truncate max-w-sm">
                {selectedTicket?.subject}
              </DialogTitle>
              <div className="flex items-center gap-1 flex-wrap shrink-0 ml-2">
                {hasNewMessages && (
                  <Badge className="bg-[#FE2C55] text-white text-[8px] sm:text-xs shrink-0">
                    New message
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {selectedTicket && (
            <>
              {/* Customer Info */}
              <div className="px-3 sm:px-4 py-2 bg-muted/30 border-b shrink-0">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedTicket.name}</span>
                    <span className="text-muted-foreground">({selectedTicket.email})</span>
                  </div>
                  {selectedTicket && (
                    <Badge className={cn(statusColors[selectedTicket.status], "text-[9px] sm:text-xs shrink-0 font-semibold py-1 px-2") }>
                      {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
                    </Badge>
                  )}
                </div>
                <div className="text-[8px] sm:text-xs text-muted-foreground mt-1">
                  Started {formatSafeDate(selectedTicket.createdAt, "MMM d, yyyy 'at' h:mm a")}
                  {selectedTicket.userId && <span className="ml-2 text-blue-600">Registered User</span>}
                </div>
              </div>

              {/* Conversation Thread */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 py-3 relative"
              >
                <div className="space-y-3">
                  {/* Original Message */}
                  <div>
                    <div className="bg-gray-100 rounded-lg p-3 max-w-[40ch]">
                      <div className="flex items-center mb-2">
                        <span className="text-xs font-medium text-gray-700">{selectedTicket.name}</span>
                      </div>
                      {wrapMessage(selectedTicket.message, 40).map((line, i) => (
                        <p key={i} className="text-xs sm:text-sm whitespace-pre-wrap">{line}</p>
                      ))}
                    </div>
                    <div className="text-[8px] text-muted-foreground mt-1 text-right">{formatSafeDate(selectedTicket.createdAt, "MMM d, h:mm a")}</div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.replies.map((reply) => (
                    <div key={reply.id} className={cn("flex w-full", reply.isAdmin ? "justify-end" : "justify-start")}>
                      <div className={cn("flex flex-col", reply.isAdmin ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "rounded-xl p-2 shadow-sm max-w-[40ch]",
                            reply.isAdmin ? "bg-[#FE2C55]/10 text-[#3d0711] border border-[#FE2C55]/40" : "bg-gray-100 text-gray-900"
                          )}
                          style={{ display: 'inline-block', wordBreak: 'break-word', whiteSpace: 'normal' }}
                        >
                          {wrapMessage(reply.message, 40).map((line, i) => (
                            <div key={i} className="text-xs sm:text-sm whitespace-pre-wrap" style={{ fontSize: '0.85rem', lineHeight: 1.25 }}>{line}</div>
                          ))}
                        </div>
                        <div className="text-[8px] text-muted-foreground mt-1" style={{ textAlign: reply.isAdmin ? 'right' : 'left' }}>{formatSafeDate(reply.createdAt, "MMM d, h:mm a")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>



              {/* Reply Input or Closed Notice */}
              <div className="border-t px-3 py-2 sm:px-4 sm:py-3 shrink-0">
                {selectedTicket.status !== "closed" ? (
                  <div className="space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => handleReplyChange(e.target.value)}
                      onKeyDown={handleReplyKeyDown}
                      placeholder="Type your reply... (Enter to send, Ctrl+Enter for new line)"
                      rows={2}
                      className="text-xs sm:text-sm"
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[8px] sm:text-xs h-7"
                          onClick={() => handleCloseTicket(selectedTicket.id)}
                        >
                          Close Ticket
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-[8px] sm:text-xs h-7"
                          onClick={() => {
                            setDeleteTicketId(selectedTicket.id)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-[8px] sm:text-xs h-7"
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">This conversation is closed. You can view the messages but cannot add new replies.</p>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[8px] sm:text-xs h-7"
                        onClick={() => handleReopenTicket(selectedTicket.id)}
                      >
                        Reopen Ticket
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-[8px] sm:text-xs h-7"
                        onClick={() => {
                          setDeleteTicketId(selectedTicket.id)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

