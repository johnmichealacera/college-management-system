export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type Weekday = (typeof WEEKDAYS)[number]

export const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'] as const
