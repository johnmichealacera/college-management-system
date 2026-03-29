import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Program } from '@/types/database'
import { createProgram, deleteProgram, listPrograms, updateProgram } from '@/services/programs'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

const programSchema = z.object({
  name: z.string().min(2, 'Program name is required'),
})

type ProgramForm = z.infer<typeof programSchema>

export function ProgramsPage() {
  const [rows, setRows] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null)

  const form = useForm<ProgramForm>({
    resolver: zodResolver(programSchema),
    defaultValues: { name: '' },
  })

  const load = useCallback(async () => {
    try {
      setRows(await listPrograms())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load programs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeRefresh(load)

  function openCreate() {
    setEditing(null)
    form.reset({ name: '' })
    setDialogOpen(true)
  }

  function openEdit(p: Program) {
    setEditing(p)
    form.reset({ name: p.name })
    setDialogOpen(true)
  }

  async function onSubmit(values: ProgramForm) {
    try {
      if (editing) {
        await updateProgram(editing.id, values.name)
        toast.success('Program updated')
      } else {
        await createProgram(values.name)
        toast.success('Program added')
      }
      setDialogOpen(false)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteProgram(deleteTarget.id)
      toast.success('Program removed')
      setDeleteTarget(null)
      void load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed'
      if (msg.includes('violates foreign key') || msg.includes('foreign key')) {
        toast.error('Cannot delete: students are still assigned to this program.')
      } else {
        toast.error(msg)
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Programs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Courses and degrees your school offers. New students pick from this list only.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-lg">
          <Plus className="size-4" />
          Add program
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Program name</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                      No programs yet. Add at least one before registering new students.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit program' : 'New program'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the name as it should appear to staff.' : 'e.g. Computer Science, Nursing, MBA'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program name</FormLabel>
                    <FormControl>
                      <Input className="rounded-lg" placeholder="Official program title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-lg">
                  {editing ? 'Save' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete program?</DialogTitle>
            <DialogDescription>
              Removes <strong>{deleteTarget?.name}</strong>. You cannot delete a program that still has students.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-lg" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-lg" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
