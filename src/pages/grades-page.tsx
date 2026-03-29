import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  deleteGrade,
  listGradesWithRelations,
  upsertGrade,
} from '@/services/grades'
import { listStudents } from '@/services/students'
import { listSubjects } from '@/services/subjects'
import { useActiveSemester } from '@/contexts/active-semester-context'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { SearchableSelectFilter } from '@/components/table-filters/searchable-select-filter'
import { joinSearchParts, matchesText } from '@/lib/table-filter'
import type { GradeWithRelations, Program, StudentWithProgram, Subject } from '@/types/database'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

const PROGRAM_ALL = '__all__'

const gradeSchema = z
  .object({
    student_id: z.string().min(1, 'Pick a student'),
    subject_id: z.string().min(1, 'Pick a subject'),
    grade_mode: z.enum(['numeric', 'pass_fail']),
    numeric_value: z.string().optional(),
    pass_fail: z.enum(['pass', 'fail']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.grade_mode === 'numeric') {
      const n = Number(data.numeric_value)
      if (data.numeric_value === '' || Number.isNaN(n)) {
        ctx.addIssue({ code: 'custom', message: 'Enter a numeric grade', path: ['numeric_value'] })
      } else if (n < 0 || n > 100) {
        ctx.addIssue({ code: 'custom', message: 'Use 0–100', path: ['numeric_value'] })
      }
    } else if (!data.pass_fail) {
      ctx.addIssue({ code: 'custom', message: 'Select pass or fail', path: ['pass_fail'] })
    }
  })

type GradeForm = z.infer<typeof gradeSchema>

function formatGrade(g: GradeWithRelations) {
  if (g.grade_mode === 'numeric' && g.numeric_value != null) {
    return `${g.numeric_value}`
  }
  if (g.grade_mode === 'pass_fail' && g.pass_fail) {
    return g.pass_fail === 'pass' ? 'Pass' : 'Fail'
  }
  return '—'
}

export function GradesPage() {
  const { semesterId, semester, ready } = useActiveSemester()
  const [grades, setGrades] = useState<GradeWithRelations[]>([])
  const [students, setStudents] = useState<StudentWithProgram[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GradeWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GradeWithRelations | null>(null)
  const [tableSearch, setTableSearch] = useState('')
  const [tableProgramId, setTableProgramId] = useState(PROGRAM_ALL)
  const [gradeModalStudentSearch, setGradeModalStudentSearch] = useState('')
  const [gradeModalSubjectSearch, setGradeModalSubjectSearch] = useState('')
  const [gradeModalProgramId, setGradeModalProgramId] = useState(PROGRAM_ALL)

  const form = useForm<GradeForm>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      student_id: '',
      subject_id: '',
      grade_mode: 'numeric',
      numeric_value: '',
      pass_fail: undefined,
    },
  })

  const mode = form.watch('grade_mode')

  const load = useCallback(async () => {
    if (!semesterId) {
      setGrades([])
      setStudents([])
      setSubjects([])
      setLoading(false)
      return
    }
    try {
      const [g, st, su] = await Promise.all([
        listGradesWithRelations(semesterId),
        listStudents(),
        listSubjects(),
      ])
      setGrades(g)
      setStudents(st)
      setSubjects(su)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load grades')
    } finally {
      setLoading(false)
    }
  }, [semesterId])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeRefresh(load)

  const programsInGradesTable = useMemo(() => {
    const m = new Map<string, Program>()
    for (const row of grades) {
      const p = row.student?.program
      if (p?.id) m.set(p.id, p)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [grades])

  const programsForGradeModal = useMemo(() => {
    const m = new Map<string, Program>()
    for (const s of students) {
      const p = s.program
      if (p?.id) m.set(p.id, p)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [students])

  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      if (tableProgramId !== PROGRAM_ALL && g.student?.program?.id !== tableProgramId) {
        return false
      }
      const st = g.student
      const blob = joinSearchParts([
        st?.full_name,
        st?.student_id,
        st?.program?.name,
        g.subject?.name,
        g.subject?.code,
      ])
      return matchesText(blob, tableSearch)
    })
  }, [grades, tableSearch, tableProgramId])

  const gradeModalStudentsFiltered = useMemo(() => {
    return students.filter((s) => {
      if (gradeModalProgramId !== PROGRAM_ALL && s.program?.id !== gradeModalProgramId) return false
      const blob = joinSearchParts([s.full_name, s.student_id, s.program?.name])
      return matchesText(blob, gradeModalStudentSearch)
    })
  }, [students, gradeModalProgramId, gradeModalStudentSearch])

  const gradeModalSubjectsFiltered = useMemo(() => {
    return subjects.filter((s) =>
      matchesText(joinSearchParts([s.name, s.code]), gradeModalSubjectSearch),
    )
  }, [subjects, gradeModalSubjectSearch])

  function resetGradeDialogFilters() {
    setGradeModalStudentSearch('')
    setGradeModalSubjectSearch('')
    setGradeModalProgramId(PROGRAM_ALL)
  }

  function setGradeDialogOpen(next: boolean) {
    setDialogOpen(next)
    if (!next) resetGradeDialogFilters()
  }

  function openCreate() {
    setEditing(null)
    resetGradeDialogFilters()
    form.reset({
      student_id: students[0]?.id ?? '',
      subject_id: subjects[0]?.id ?? '',
      grade_mode: 'numeric',
      numeric_value: '',
      pass_fail: undefined,
    })
    setDialogOpen(true)
  }

  function openEdit(g: GradeWithRelations) {
    setEditing(g)
    resetGradeDialogFilters()
    form.reset({
      student_id: g.student_id,
      subject_id: g.subject_id,
      grade_mode: g.grade_mode,
      numeric_value: g.numeric_value != null ? String(g.numeric_value) : '',
      pass_fail: g.pass_fail ?? undefined,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: GradeForm) {
    if (!semesterId) {
      toast.error('Select a term in the header first.')
      return
    }
    try {
      await upsertGrade({
        student_id: values.student_id,
        subject_id: values.subject_id,
        semester_id: semesterId,
        grade_mode: values.grade_mode,
        numeric_value:
          values.grade_mode === 'numeric' ? Number(values.numeric_value) : null,
        pass_fail: values.grade_mode === 'pass_fail' ? values.pass_fail ?? null : null,
      })
      toast.success(editing ? 'Grade updated' : 'Grade saved')
      setGradeDialogOpen(false)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteGrade(deleteTarget.id)
      toast.success('Grade removed')
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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Grades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready && semester
              ? `Grades for ${semester.name} — one row per student per subject per term.`
              : 'Numeric (0–100) or pass/fail — one grade per student per subject per term.'}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 rounded-lg"
          disabled={students.length === 0 || subjects.length === 0}
        >
          <Plus className="size-4" />
          Add grade
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="relative min-w-[min(100%,16rem)] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search student, ID, program, subject…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="rounded-lg pl-9"
                aria-label="Filter grades"
              />
            </div>
            {programsInGradesTable.length > 0 && (
              <div className="w-full min-w-[12rem] sm:w-52">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Program</Label>
                <Select value={tableProgramId} onValueChange={setTableProgramId}>
                  <SelectTrigger className="rounded-lg" aria-label="Filter grades by program">
                    <SelectValue placeholder="Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROGRAM_ALL}>All programs</SelectItem>
                    {programsInGradesTable.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No grades recorded yet.
                    </TableCell>
                  </TableRow>
                ) : filteredGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No rows match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGrades.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        {g.student?.full_name ?? '—'}
                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                          {g.student?.student_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {g.student?.program?.name ?? '—'}
                      </TableCell>
                      <TableCell>{g.subject?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-md font-normal capitalize">
                          {g.grade_mode.replace('_', '/')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{formatGrade(g)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg"
                          onClick={() => openEdit(g)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(g)}
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

      <Dialog open={dialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit grade' : 'Record grade'}</DialogTitle>
            <DialogDescription>
              One entry per student and subject for <strong>{semester?.name ?? 'this term'}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Term</Label>
                <Input className="rounded-lg" value={semester?.name ?? '—'} disabled readOnly />
              </div>
              {programsForGradeModal.length > 0 && (
                <div className="space-y-2">
                  <Label>Student program</Label>
                  <Select
                    value={gradeModalProgramId}
                    onValueChange={setGradeModalProgramId}
                    disabled={!!editing}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="All programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PROGRAM_ALL}>All programs</SelectItem>
                      {programsForGradeModal.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <FormField
                control={form.control}
                name="student_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!editing}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        <SearchableSelectFilter
                          placeholder="Search name, ID, program…"
                          value={gradeModalStudentSearch}
                          onChange={(e) => setGradeModalStudentSearch(e.target.value)}
                          disabled={!!editing}
                          aria-label="Search students"
                        />
                        {gradeModalStudentsFiltered.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No students match.
                          </div>
                        ) : (
                          gradeModalStudentsFiltered.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name} ({s.student_id})
                              {s.program?.name ? ` · ${s.program.name}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!editing}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        <SearchableSelectFilter
                          placeholder="Search subject or code…"
                          value={gradeModalSubjectSearch}
                          onChange={(e) => setGradeModalSubjectSearch(e.target.value)}
                          disabled={!!editing}
                          aria-label="Search subjects"
                        />
                        {gradeModalSubjectsFiltered.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No subjects match.
                          </div>
                        ) : (
                          gradeModalSubjectsFiltered.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grade_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grading type</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v)
                        form.setValue('numeric_value', '')
                        form.setValue('pass_fail', undefined)
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="numeric">Numeric (0–100)</SelectItem>
                        <SelectItem value="pass_fail">Pass / Fail</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode === 'numeric' ? (
                <FormField
                  control={form.control}
                  name="numeric_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} step="0.01" className="rounded-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="pass_fail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="rounded-lg" onClick={() => setGradeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-lg">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete grade?</DialogTitle>
            <DialogDescription>This removes the grade record only.</DialogDescription>
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
