import { type HTMLAttributes, type ReactNode, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const stack: HTMLElement[] = []
const focusables = (node: HTMLElement) =>
  Array.from(
    node.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hidden && !el.closest('[inert]'))

/** One web modal seam, including nested sheets. Content and appearance stay local. */
export function Dialog({
  children,
  onDismiss,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; onDismiss?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const dismiss = useRef(onDismiss)
  useLayoutEffect(() => {
    dismiss.current = onDismiss
  }, [onDismiss])
  useLayoutEffect(() => {
    const node = ref.current!
    const previous = document.activeElement as HTMLElement | null
    const root = document.getElementById('root')
    const rootWasInert = root?.inert ?? false
    const overflow = document.body.style.overflow
    const underneath = stack.at(-1)
    if (underneath) underneath.inert = true
    if (root) root.inert = true
    stack.push(node)
    document.body.style.overflow = 'hidden'
    ;(focusables(node)[0] ?? node).focus()
    const keydown = (event: KeyboardEvent) => {
      if (stack.at(-1) !== node) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        dismiss.current?.()
      }
      if (event.key === 'Tab') {
        const items = focusables(node)
        const index = items.indexOf(document.activeElement as HTMLElement)
        if (!items.length) {
          event.preventDefault()
          node.focus()
          return
        }
        // Advance explicitly: Safari can otherwise skip buttons when its
        // system keyboard-navigation preference is disabled.
        event.preventDefault()
        const next = event.shiftKey
          ? index <= 0
            ? items.length - 1
            : index - 1
          : index < 0 || index === items.length - 1
            ? 0
            : index + 1
        items[next].focus()
      }
    }
    const focusin = (event: FocusEvent) => {
      if (stack.at(-1) === node && !node.contains(event.target as Node))
        (focusables(node)[0] ?? node).focus()
    }
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('focusin', focusin)
    return () => {
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('focusin', focusin)
      const i = stack.indexOf(node)
      if (i >= 0) stack.splice(i, 1)
      if (underneath?.isConnected) underneath.inert = false
      if (root) root.inert = rootWasInert
      document.body.style.overflow = overflow
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus()
    }
  }, [])
  return createPortal(
    <div {...props} ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>
      {children}
    </div>,
    document.body,
  )
}
