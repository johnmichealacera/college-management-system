import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { Semester } from '@/types/database'
import {
  createSemester,
  deleteSemester,
  listSemesters,
  setActiveSemesterRpc,
  updateSemester,
} from '@/services/semesters'
import { useActiveSemester } from '@/contexts/active-semester-context'
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
import { schoolYearLabel } from '@/lib/school-year'
import { toast } from 'sonner'

const semesterSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    starts_on: z.string().min(1, 'Start date required'),
    ends_on: z.string().min(1, 'End date required'),
  })
  .refine((d) => d.ends_on >= d.starts_on, {
    message: 'End date must be on or after start',
    path: ['ends_on'],
  })

type SemesterForm = z.infer<typeof semesterSchema>

function formatDateRange(s: Semester) {
  return `${s.starts_on} → ${s.ends_on}`
}

export function SemestersPage() {
  const [rows, setRows] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Semester | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null)
  const { refreshSemesters, setSemesterId } = useActiveSemester()

  const form = useForm<SemesterForm>({
    resolver: zodResolver(semesterSchema),
    defaultValues: { name: '', starts_on: '', ends_on: '' },
  })

  const watchedStart = useWatch({ control: form.control, name: 'starts_on' })
  const watchedEnd = useWatch({ control: form.control, name: 'ends_on' })
  const previewSchoolYear = schoolYearLabel(watchedStart ?? '', watchedEnd ?? '')

  const load = useCallback(async () => {
    try {
      setRows(await listSemesters())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load terms')
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
    form.reset({ name: '', starts_on: '', ends_on: '' })
    setDialogOpen(true)
  }

  function openEdit(s: Semester) {
    setEditing(s)
    form.reset({
      name: s.name,
      starts_on: s.starts_on,
      ends_on: s.ends_on,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: SemesterForm) {
    try {
      if (editing) {
        await updateSemester(editing.id, {
          name: values.name,
          starts_on: values.starts_on,
          ends_on: values.ends_on,
        })
        toast.success('Term updated')
      } else {
        await createSemester({
          name: values.name,
          starts_on: values.starts_on,
          ends_on: values.ends_on,
        })
        toast.success('Term created')
      }
      setDialogOpen(false)
      await refreshSemesters()
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function makeActive(id: string) {
    try {
      await setActiveSemesterRpc(id)
      setSemesterId(id)
      toast.success('Active term updated')
      await refreshSemesters()
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not set active term')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteSemester(deleteTarget.id)
      toast.success('Term removed')
      setDeleteTarget(null)
      await refreshSemesters()
      void load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed'
      if (msg.includes('violates foreign key') || msg.includes('foreign key')) {
        toast.error('Cannot delete: enrollments or other records still reference this term.')
      } else {
        toast.error(msg)
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Semesters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan academic terms; each shows a <strong>school year</strong> label from its start and end
            dates (e.g. 2024–2025). The header uses the same label when you pick a term.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-lg">
          <Plus className="size-4" />
          Add term
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Term</TableHead>
                  <TableHead>School year</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No terms yet. Create one to organize enrollments by semester.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {schoolYearLabel(s.starts_on, s.ends_on)}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{formatDateRange(s)}</TableCell>
                      <TableCell>
                        {s.is_active ? (
                          <Badge className="rounded-md gap-1 font-normal">
                            <CheckCircle2 className="size-3.5" />
                            Active
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!s.is_active && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mr-1 rounded-lg"
                            onClick={() => makeActive(s.id)}
                          >
                            Set active
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          onClick={() => openEdit(s)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
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
            <DialogTitle>{editing ? 'Edit term' : 'New term'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the name and dates. The school year label updates from the years of start and end.'
                : 'Create Fall 2026, Spring 2027, etc. School year is derived from your dates (e.g. Aug 2026–May 2027 → 2026–2027). Use “Set active” after saving for the header default.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term name</FormLabel>
                    <FormControl>
                      <Input className="rounded-lg" placeholder="e.g. Fall 2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="starts_on"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts</FormLabel>
                    <FormControl>
                      <Input type="date" className="rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ends_on"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends</FormLabel>
                    <FormControl>
                      <Input type="date" className="rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">School year: </span>
                <span className="tabular-nums">{previewSchoolYear}</span>
              </p>
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
            <DialogTitle>Delete term?</DialogTitle>
            <DialogDescription>
              Removes <strong>{deleteTarget?.name}</strong>. Only allowed if no enrollments reference it.
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
