export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      semesters: {
        Row: {
          id: string
          name: string
          starts_on: string
          ends_on: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          starts_on: string
          ends_on: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          starts_on?: string
          ends_on?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          id: string
          full_name: string
          student_id: string
          program_id: string
          year_level: string
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          student_id?: string
          program_id: string
          year_level: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          student_id?: string
          program_id?: string
          year_level?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'students_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
        ]
      }
      subjects: {
        Row: {
          id: string
          name: string
          code: string | null
          instructor: string
          max_capacity: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          instructor?: string
          max_capacity: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          instructor?: string
          max_capacity?: number
          created_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          semester_id: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          subject_id: string
          semester_id: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          subject_id?: string
          semester_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'enrollments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enrollments_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enrollments_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
        ]
      }
      schedules: {
        Row: {
          id: string
          subject_id: string
          semester_id: string
          day_of_week: string
          start_time: string
          end_time: string
          room: string
          created_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          semester_id: string
          day_of_week: string
          start_time: string
          end_time: string
          room?: string
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          semester_id?: string
          day_of_week?: string
          start_time?: string
          end_time?: string
          room?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedules_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
        ]
      }
      grades: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          semester_id: string
          grade_mode: 'numeric' | 'pass_fail'
          numeric_value: number | null
          pass_fail: 'pass' | 'fail' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          subject_id: string
          semester_id: string
          grade_mode: 'numeric' | 'pass_fail'
          numeric_value?: number | null
          pass_fail?: 'pass' | 'fail' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          subject_id?: string
          semester_id?: string
          grade_mode?: 'numeric' | 'pass_fail'
          numeric_value?: number | null
          pass_fail?: 'pass' | 'fail' | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'grades_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'students'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'grades_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'grades_semester_id_fkey'
            columns: ['semester_id']
            isOneToOne: false
            referencedRelation: 'semesters'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      enroll_student: {
        Args: { p_student_id: string; p_subject_id: string; p_semester_id: string }
        Returns: Json
      }
      set_active_semester: {
        Args: { p_semester_id: string }
        Returns: null
      }
    }
  }
}

export type Semester = Database['public']['Tables']['semesters']['Row']
export type Program = Database['public']['Tables']['programs']['Row']
export type Student = Database['public']['Tables']['students']['Row']

export type StudentWithProgram = Student & {
  program?: Program | null
}
export type Subject = Database['public']['Tables']['subjects']['Row']
export type Enrollment = Database['public']['Tables']['enrollments']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type GradeRow = Database['public']['Tables']['grades']['Row']

export type EnrollmentWithRelations = Enrollment & {
  student?: StudentWithProgram | null
  subject?: Subject | null
  semester?: Semester | null
}

export type GradeWithRelations = GradeRow & {
  student?: StudentWithProgram | null
  subject?: Subject | null
  semester?: Semester | null
}
