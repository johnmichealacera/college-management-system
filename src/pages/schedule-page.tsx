import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import {
  listSchedulesWithSubjects,
  saveScheduleForSubject,
  type ScheduleWithSubject,
} from '@/services/schedules'
import { listSubjects } from '@/services/subjects'
import { useActiveSemester } from '@/contexts/active-semester-context'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import { WEEKDAYS } from '@/lib/constants'
import type { Subject } from '@/types/database'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function SchedulePage() {
  const { semesterId, semester, ready } = useActiveSemester()
  const [schedules, setSchedules] = useState<ScheduleWithSubject[]>([])
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleWithSubject | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [day, setDay] = useState<string>(WEEKDAYS[0])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:30')
  const [room, setRoom] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!semesterId) {
      setSchedules([])
      setAllSubjects([])
      setLoading(false)
      return
    }
    try {
      const [sch, subj] = await Promise.all([
        listSchedulesWithSubjects(semesterId),
        listSubjects(),
      ])
      setSchedules(sch)
      setAllSubjects(subj)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [semesterId])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeRefresh(load)

  const byDay = useMemo(() => {
    const m = new Map<string, ScheduleWithSubject[]>()
    for (const d of WEEKDAYS) m.set(d, [])
    for (const s of schedules) {
      const list = m.get(s.day_of_week) ?? []
      list.push(s)
      m.set(s.day_of_week, list)
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return m
  }, [schedules])

  function openCreate() {
    setEditing(null)
    setSubjectId(allSubjects[0]?.id ?? '')
    setDay(WEEKDAYS[0])
    setStartTime('09:00')
    setEndTime('10:30')
    setRoom('')
    setDialogOpen(true)
  }

  function openEdit(s: ScheduleWithSubject) {
    setEditing(s)
    setSubjectId(s.subject_id)
    setDay(s.day_of_week)
    setStartTime(s.start_time)
    setEndTime(s.end_time)
    setRoom(s.room)
    setDialogOpen(true)
  }

  async function submitSchedule() {
    if (!semesterId) {
      toast.error('Select a term in the header first.')
      return
    }
    if (!subjectId) {
      toast.error('Select a subject.')
      return
    }
    setSubmitting(true)
    try {
      await saveScheduleForSubject(subjectId, semesterId, {
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        room: room || '',
      })
      toast.success(editing ? 'Schedule updated' : 'Schedule saved')
      setDialogOpen(false)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready && semester
              ? `Timetable for ${semester.name} — each subject can meet at different times each term.`
              : 'One time block per subject per term — quick week view for demos.'}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 rounded-lg"
          disabled={allSubjects.length === 0}
        >
          <Plus className="size-4" />
          Assign time
        </Button>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="rounded-lg">
          <TabsTrigger value="week" className="rounded-md">
            Week view
          </TabsTrigger>
          <TabsTrigger value="table" className="rounded-md">
            Table
          </TabsTrigger>
        </TabsList>
        <TabsContent value="week" className="mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {WEEKDAYS.map((d) => (
                <Card key={d} className="border-border/80 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="mb-3 text-sm font-semibold">{d}</h3>
                    <ul className="space-y-2">
                      {(byDay.get(d) ?? []).length === 0 ? (
                        <li className="text-xs text-muted-foreground">No classes</li>
                      ) : (
                        (byDay.get(d) ?? []).map((s) => (
                          <li
                            key={s.id}
                            className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                          >
                            <div className="font-medium">{s.subject?.name ?? 'Subject'}</div>
                            <div className="text-xs text-muted-foreground">
                              {s.start_time} – {s.end_time}
                              {s.room ? ` · ${s.room}` : ''}
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Subject</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead className="w-[80px] text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No schedule rows yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      schedules.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.subject?.name ?? '—'}</TableCell>
                          <TableCell>{s.day_of_week}</TableCell>
                          <TableCell className="tabular-nums">
                            {s.start_time} – {s.end_time}
                          </TableCell>
                          <TableCell>{s.room || '—'}</TableCell>
                          <TableCell className="text-right">
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
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit class time' : 'Assign class time'}</DialogTitle>
            <DialogDescription>
              For <strong>{semester?.name ?? 'the selected term'}</strong> — link a subject to a day, time
              window, and optional room.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!!editing}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editing && (
                <p className="text-xs text-muted-foreground">
                  If this subject already has a slot this term, saving will update it.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="time"
                  className="rounded-lg"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  type="time"
                  className="rounded-lg"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Input
                className="rounded-lg"
                placeholder="e.g. Hall A"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-lg" disabled={submitting || !subjectId} onClick={submitSchedule}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
