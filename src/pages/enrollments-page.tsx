import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import {
  deleteEnrollment,
  enrollStudent,
  listEnrollmentsWithRelations,
} from '@/services/enrollments'
import { listStudents } from '@/services/students'
import { listSubjectsWithEnrollment } from '@/services/subjects'
import { useActiveSemester } from '@/contexts/active-semester-context'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { SearchableSelectFilter } from '@/components/table-filters/searchable-select-filter'
import { joinSearchParts, matchesText } from '@/lib/table-filter'
import type { EnrollmentWithRelations, Program, StudentWithProgram } from '@/types/database'
import type { SubjectWithSlots } from '@/services/subjects'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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

export function EnrollmentsPage() {
  const { semesterId, semester, ready } = useActiveSemester()
  const [enrollments, setEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [students, setStudents] = useState<StudentWithProgram[]>([])
  const [subjects, setSubjects] = useState<SubjectWithSlots[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [studentId, setStudentId] = useState<string>('')
  const [subjectId, setSubjectId] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<EnrollmentWithRelations | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [tableProgramId, setTableProgramId] = useState(PROGRAM_ALL)
  const [modalStudentSearch, setModalStudentSearch] = useState('')
  const [modalSubjectSearch, setModalSubjectSearch] = useState('')
  const [modalProgramId, setModalProgramId] = useState(PROGRAM_ALL)

  const load = useCallback(async () => {
    if (!semesterId) {
      setEnrollments([])
      setStudents([])
      setSubjects([])
      setLoading(false)
      return
    }
    try {
      const [e, st, su] = await Promise.all([
        listEnrollmentsWithRelations(semesterId),
        listStudents(),
        listSubjectsWithEnrollment(semesterId),
      ])
      setEnrollments(e)
      setStudents(st)
      setSubjects(su)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [semesterId])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeRefresh(load)

  const selectedSubject = useMemo(() => subjects.find((s) => s.id === subjectId), [subjects, subjectId])

  const enrollmentCountBySubject = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of enrollments) {
      m.set(e.subject_id, (m.get(e.subject_id) ?? 0) + 1)
    }
    return m
  }, [enrollments])

  const programsInTable = useMemo(() => {
    const m = new Map<string, Program>()
    for (const e of enrollments) {
      const p = e.student?.program
      if (p?.id) m.set(p.id, p)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [enrollments])

  const programsForModal = useMemo(() => {
    const m = new Map<string, Program>()
    for (const s of students) {
      const p = s.program
      if (p?.id) m.set(p.id, p)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [students])

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((row) => {
      if (tableProgramId !== PROGRAM_ALL && row.student?.program?.id !== tableProgramId) {
        return false
      }
      const st = row.student
      const blob = joinSearchParts([
        st?.full_name,
        st?.student_id,
        st?.program?.name,
        row.subject?.name,
        row.subject?.code,
      ])
      return matchesText(blob, tableSearch)
    })
  }, [enrollments, tableSearch, tableProgramId])

  const modalStudentsFiltered = useMemo(() => {
    return students.filter((s) => {
      if (modalProgramId !== PROGRAM_ALL && s.program?.id !== modalProgramId) return false
      const blob = joinSearchParts([s.full_name, s.student_id, s.program?.name])
      return matchesText(blob, modalStudentSearch)
    })
  }, [students, modalProgramId, modalStudentSearch])

  const modalSubjectsFiltered = useMemo(() => {
    return subjects.filter((s) =>
      matchesText(joinSearchParts([s.name, s.code]), modalSubjectSearch),
    )
  }, [subjects, modalSubjectSearch])

  function openDialog() {
    setStudentId('')
    setSubjectId('')
    setModalStudentSearch('')
    setModalSubjectSearch('')
    setModalProgramId(PROGRAM_ALL)
    setDialogOpen(true)
  }

  function setEnrollDialogOpen(next: boolean) {
    setDialogOpen(next)
    if (!next) {
      setModalStudentSearch('')
      setModalSubjectSearch('')
      setModalProgramId(PROGRAM_ALL)
    }
  }

  async function submitEnroll() {
    if (!semesterId) {
      toast.error('Select a term in the header first.')
      return
    }
    if (!studentId || !subjectId) {
      toast.error('Choose both a student and a subject.')
      return
    }
    setSubmitting(true)
    try {
      await enrollStudent(studentId, subjectId, semesterId)
      toast.success('Student enrolled')
      setEnrollDialogOpen(false)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enrollment failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteEnrollment(deleteTarget.id)
      toast.success('Enrollment removed')
      setDeleteTarget(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Remove failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Enrollments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready && semester
              ? `Enrollments for ${semester.name}. Capacity and duplicates are enforced per term on the server.`
              : 'Seat limits and duplicate enrollments are enforced on the server per term.'}
          </p>
        </div>
        <Button onClick={openDialog} className="gap-2 rounded-lg">
          <Plus className="size-4" />
          Enroll student
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
                aria-label="Filter enrollments"
              />
            </div>
            {programsInTable.length > 0 && (
              <div className="w-full min-w-[12rem] sm:w-52">
                <Label className="mb-1.5 block text-xs text-muted-foreground">Program</Label>
                <Select value={tableProgramId} onValueChange={setTableProgramId}>
                  <SelectTrigger className="rounded-lg" aria-label="Filter by program">
                    <SelectValue placeholder="Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROGRAM_ALL}>All programs</SelectItem>
                    {programsInTable.map((p) => (
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
                  <TableHead>Capacity</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No enrollments yet.
                    </TableCell>
                  </TableRow>
                ) : filteredEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No rows match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map((row) => {
                    const sub = row.subject
                    const enrolled = enrollmentCountBySubject.get(row.subject_id) ?? 0
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.student?.full_name ?? '—'}
                          <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                            {row.student?.student_id}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.student?.program?.name ?? '—'}
                        </TableCell>
                        <TableCell>{row.subject?.name ?? '—'}</TableCell>
                        <TableCell>
                          {sub ? (
                            <Badge variant="outline" className="rounded-md font-normal">
                              {sub.max_capacity} max
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {sub ? (
                            <span className="tabular-nums">
                              {enrolled} enrolled
                              <span className="ml-2 text-muted-foreground">
                                ({Math.max(0, sub.max_capacity - enrolled)} open)
                              </span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                            aria-label="Remove enrollment"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New enrollment</DialogTitle>
            <DialogDescription>
              Applies to <strong>{semester?.name ?? 'the selected term'}</strong>. If the section is full
              or the student is already in this subject for this term, you will see a clear error.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {programsForModal.length > 0 && (
              <div className="space-y-2">
                <Label>Student program</Label>
                <Select value={modalProgramId} onValueChange={setModalProgramId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="All programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROGRAM_ALL}>All programs</SelectItem>
                    {programsForModal.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SearchableSelectFilter
                    placeholder="Search name, ID, program…"
                    value={modalStudentSearch}
                    onChange={(e) => setModalStudentSearch(e.target.value)}
                    aria-label="Search students"
                  />
                  {modalStudentsFiltered.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">No students match.</div>
                  ) : (
                    modalStudentsFiltered.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.student_id})
                        {s.program?.name ? ` · ${s.program.name}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SearchableSelectFilter
                    placeholder="Search subject or code…"
                    value={modalSubjectSearch}
                    onChange={(e) => setModalSubjectSearch(e.target.value)}
                    aria-label="Search subjects"
                  />
                  {modalSubjectsFiltered.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">No subjects match.</div>
                  ) : (
                    modalSubjectsFiltered.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.available_slots} slots left
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedSubject && (
              <Card className="border-dashed bg-muted/40">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Availability</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedSubject.enrolled_count} of {selectedSubject.max_capacity} seats filled.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => setEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-lg" disabled={submitting} onClick={submitEnroll}>
              {submitting ? 'Enrolling…' : 'Enroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove enrollment?</DialogTitle>
            <DialogDescription>
              Drops this student from the subject for this term. Their grade for this term (if any)
              remains until you remove it on the Grades page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-lg" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-lg" onClick={confirmDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
