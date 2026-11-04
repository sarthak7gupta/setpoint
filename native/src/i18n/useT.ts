import { useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { type TxKey, translate } from './index'

export function useT() {
  const { locale } = useApp()
  return useCallback(
    (key: TxKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )
}
