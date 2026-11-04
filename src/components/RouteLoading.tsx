import { Component, type ReactNode } from 'react'
import { useT } from '../i18n/useT'
import { Button, Page } from '../styles/ui'

class LoadBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function RouteLoading() {
  const t = useT()
  return <Page role="status">{t('common.loading')}</Page>
}

export function RouteLoadBoundary({ children }: { children: ReactNode }) {
  const t = useT()
  return (
    <LoadBoundary
      fallback={
        <Page role="alert">
          <p>{t('common.screenLoadFailed')}</p>
          <Button onClick={() => window.location.reload()}>{t('common.retry')}</Button>
        </Page>
      }
    >
      {children}
    </LoadBoundary>
  )
}
