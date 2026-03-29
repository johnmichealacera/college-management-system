import type { ComponentProps, PointerEvent } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type InputProps = ComponentProps<typeof Input>

/**
 * Sticky search inside Radix SelectContent. Wrapper preventDefault is skipped for the input so clicks
 * can focus it; elsewhere it avoids the menu treating the interaction like an outside dismiss.
 */
function allowInputFocus(e: PointerEvent<HTMLDivElement>) {
  const el = e.target as HTMLElement | null
  if (el?.closest?.('input, textarea, [contenteditable="true"]')) {
    return
  }
  e.preventDefault()
}

/** Sticky search field inside SelectContent; Radix Select already defers mount focus so this can take focus via autoFocus + ref. */
export function SearchableSelectFilter({
  autoFocus: autoFocusProp,
  ...inputProps
}: InputProps) {
  const shouldAutofocus = (autoFocusProp ?? true) && !inputProps.disabled
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!shouldAutofocus) return
    queueMicrotask(() => inputRef.current?.focus())
  }, [shouldAutofocus])

  return (
    <div
      className="sticky top-0 z-10 border-b border-border bg-popover p-2"
      onPointerDown={allowInputFocus}
    >
      <Input
        {...inputProps}
        ref={inputRef}
        autoFocus={shouldAutofocus}
        onPointerDown={(e) => {
          e.stopPropagation()
          inputProps.onPointerDown?.(e)
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          inputProps.onMouseDown?.(e)
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          inputProps.onKeyDown?.(e)
        }}
        className={cn('h-8 rounded-md', inputProps.className)}
      />
    </div>
  )
}
