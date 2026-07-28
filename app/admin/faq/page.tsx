"use client"

import { useEffect, useState } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { apiFetch, authHeaders, apiPath } from "@/lib/api"
import { Plus, Trash2, PencilLine, MessageSquare, Eye, EyeOff, GripVertical } from "lucide-react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { toast } from "sonner"

interface FaqItem {
  id: string
  question: string
  answer: string
  hidden?: boolean
  order?: number
}

export default function AdminFaqPage() {
  const { user, isLoading } = useAdminAuth()
  const [drafts, setDrafts] = useState<FaqItem[]>([])
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [editingId, setEditingId] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [draggedFaqId, setDraggedFaqId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await apiFetch(apiPath('/settings/faqs'))
        if (!res.ok) {
          console.error('Failed loading faqs', res.status)
          return
        }
        const data = await res.json()
        if (cancelled) return
        setDrafts(data.map((f: any) => ({ id: f.id, question: f.question, answer: f.answer, hidden: !!f.hidden, order: f.order })))
      } catch (err) {
        console.error('Error loading faqs', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const faqItems = [...drafts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const persistOrder = async (items: FaqItem[]) => {
    const updates = items.map((item, index) => updateFaqApi(item.id, item.question, item.answer, index))
    await Promise.all(updates)
  }

  const handleReorder = async (dragId: string, hoverId: string) => {
    if (dragId === hoverId) return

    const draggedIndex = faqItems.findIndex((item) => item.id === dragId)
    const hoverIndex = faqItems.findIndex((item) => item.id === hoverId)
    if (draggedIndex === -1 || hoverIndex === -1) return

    const updated = [...faqItems]
    const [removed] = updated.splice(draggedIndex, 1)
    updated.splice(hoverIndex, 0, removed)

    setDrafts(updated.map((item, index) => ({ ...item, order: index })))
    try {
      await persistOrder(updated)
      toast.success('FAQ order updated')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save FAQ order')
    }
  }

  if (isLoading) {
    return <div className="p-6 text-zinc-900">Loading...</div>
  }

  if (!user) return null

  const createFaq = async (q: string, a: string) => {
    const res = await apiFetch(apiPath('/settings/faqs'), { method: 'POST', headers: authHeaders(), body: JSON.stringify({ question: q, answer: a, order: drafts.length }) })
    if (!res.ok) throw new Error('Create failed')
    return await res.json()
  }

  const updateFaqApi = async (id: string, q: string, a: string, order?: number) => {
    const body: any = { question: q, answer: a }
    if (order !== undefined) body.order = order
    const res = await apiFetch(apiPath(`/settings/faqs/${id}`), { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
    if (!res.ok) throw new Error('Update failed')
    return await res.json()
  }

  const handleToggleHidden = async (item: FaqItem) => {
    try {
      const res = await apiFetch(apiPath(`/settings/faqs/${item.id}`), { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ question: item.question, answer: item.answer, hidden: !item.hidden, order: item.order }) })
      if (!res.ok) throw new Error('Toggle failed')
      const updated = await res.json()
      setDrafts(prev => prev.map(p => p.id === item.id ? { id: updated.id, question: updated.question, answer: updated.answer, hidden: !!updated.hidden, order: updated.order } : p))
      toast.success(updated.hidden ? 'FAQ hidden' : 'FAQ visible')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update visibility')
    }
  }

  const deleteFaqApi = async (id: string) => {
    const res = await apiFetch(apiPath(`/settings/faqs/${id}`), { method: 'DELETE', headers: authHeaders() })
    if (!res.ok && res.status !== 204) throw new Error('Delete failed')
  }

  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("Please provide both a question and an answer.")
      return
    }

    try {
      if (editingId) {
        const current = drafts.find((item) => item.id === editingId)
        const updated = await updateFaqApi(editingId, question.trim(), answer.trim(), current?.order)
        setDrafts(prev => prev.map(p => p.id === editingId ? { id: updated.id, question: updated.question, answer: updated.answer, hidden: !!updated.hidden, order: updated.order } : p))
        toast.success('FAQ updated')
      } else {
        const created = await createFaq(question.trim(), answer.trim())
        setDrafts(prev => [ { id: created.id, question: created.question, answer: created.answer, hidden: !!created.hidden, order: created.order }, ...prev ])
        toast.success('FAQ added')
      }
      setQuestion('')
      setAnswer('')
      setEditingId(null)
      setIsDialogOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save FAQ')
    }
  }

  const handleEdit = (item: FaqItem) => {
    setEditingId(item.id)
    setQuestion(item.question)
    setAnswer(item.answer)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteFaqApi(id)
      setDrafts(prev => prev.filter(p => p.id !== id))
      toast.success('FAQ removed')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete FAQ')
    }
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 pt-16 sm:pt-6 lg:pt-8 text-zinc-900">
      <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>FAQs</h1>
          <p className="text-[9px] sm:text-xs text-white">Manage help center answers shown on the storefront</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white text-[10px] sm:text-xs py-1.5 px-2 h-auto">
              <Plus className="mr-0.5 sm:mr-1 h-3 w-3" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm">Question</label>
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What is your refund policy?" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm">Answer</label>
                <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write the answer your customers should see on the public FAQ page." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingId(null); setQuestion(''); setAnswer('') }}>Cancel</Button>
              <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white" onClick={handleSubmit}>{editingId ? 'Save' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4">
          <CardTitle className="flex items-center gap-1 text-sm">
            <MessageSquare className="h-4 w-4 text-[#FE2C55]" />
            FAQs ({faqItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
            {faqItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200/20 p-6 text-center text-sm text-gray-400">
                No FAQs created yet.
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-3">
                {faqItems.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <div
                      draggable
                      onDragStart={() => setDraggedFaqId(item.id)}
                      onDragOver={(event) => {
                        event.preventDefault()
                        if (draggedFaqId && draggedFaqId !== item.id) {
                          handleReorder(draggedFaqId, item.id)
                        }
                      }}
                      onDragEnd={() => setDraggedFaqId(null)}
                      className="flex items-start justify-between gap-3 py-2"
                    >
                      <AccordionTrigger className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-zinc-400 cursor-grab" />
                            <p className="font-semibold text-black truncate">{item.question}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {item.hidden ? (
                          <Badge className="bg-yellow-600/10 text-yellow-300">Hidden</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-[#FE2C55]/15 text-[#FE2C55]">Live</Badge>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleToggleHidden(item)} className="text-black">
                          {item.hidden ? <EyeOff className="h-4 w-4 text-black" /> : <Eye className="h-4 w-4 text-black" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-black" onClick={() => handleEdit(item)}>
                          <PencilLine className="h-4 w-4 text-black" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <AccordionContent>
                      <div className="mt-2 text-sm text-black">
                        {item.answer}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <PencilLine className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
    </div>
  )
}
