import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Instructor } from '@/types/database'
import {
  createInstructor,
  deleteInstructor,
  listInstructors,
  updateInstructor,
} from '@/services/instructors'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { Badge } from '@/components/ui/badge'
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

const instructorSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type InstructorForm = z.infer<typeof instructorSchema>

export function InstructorsPage() {
  const [rows, setRows] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Instructor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Instructor | null>(null)

  const form = useForm<InstructorForm>({
    resolver: zodResolver(instructorSchema),
    defaultValues: { full_name: '', email: '' },
  })

  const load = useCallback(async () => {
    try {
      setRows(await listInstructors())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load instructors')
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
    form.reset({ full_name: '', email: '' })
    setDialogOpen(true)
  }

  function openEdit(i: Instructor) {
    setEditing(i)
    form.reset({ full_name: i.full_name, email: i.email })
    setDialogOpen(true)
  }

  async function onSubmit(values: InstructorForm) {
    try {
      if (editing) {
        await updateInstructor(editing.id, {
          full_name: values.full_name,
          email: values.email,
        })
        toast.success('Instructor updated')
      } else {
        await createInstructor(values)
        toast.success('Instructor added')
      }
      setDialogOpen(false)
      void load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        toast.error('That email is already used by another instructor.')
      } else {
        toast.error(msg)
      }
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteInstructor(deleteTarget.id)
      toast.success('Instructor removed')
      setDeleteTarget(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Instructors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faculty directory with work email. Link each person to a Supabase Auth user (same email) when they
            should sign in to enter grades for their subjects.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-lg">
          <Plus className="size-4" />
          Add instructor
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>App access</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No instructors yet. Add people here, then assign them on the Subjects page.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{i.email}</TableCell>
                      <TableCell>
                        {i.user_id ? (
                          <Badge variant="secondary" className="rounded-md font-normal">
                            Linked
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          onClick={() => openEdit(i)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(i)}
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
            <DialogTitle>{editing ? 'Edit instructor' : 'New instructor'}</DialogTitle>
            <DialogDescription>
              Use the email they will use to log in. After creating the user in Supabase Auth with this email,
              link the account in SQL or a future admin tool so <strong>App access</strong> shows Linked.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input className="rounded-lg" placeholder="e.g. Dr. Helen Vargas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        className="rounded-lg"
                        placeholder="name@school.edu"
                        {...field}
                      />
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
            <DialogTitle>Delete instructor?</DialogTitle>
            <DialogDescription>
              Removes <strong>{deleteTarget?.full_name}</strong> from the directory. Subjects that pointed to them
              will have no instructor until you assign someone else.
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
