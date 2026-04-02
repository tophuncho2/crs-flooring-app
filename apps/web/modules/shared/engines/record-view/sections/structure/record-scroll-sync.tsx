"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
  type UIEvent,
} from "react"

type RecordScrollRegistry = Set<HTMLElement>

type RecordScrollSyncContextValue = {
  register: (element: HTMLElement) => void
  unregister: (element: HTMLElement) => void
  sync: (source: HTMLElement) => void
}

const RecordScrollSyncContext = createContext<RecordScrollSyncContextValue | null>(null)

function createRegistry(): RecordScrollRegistry {
  return new Set<HTMLElement>()
}

export function RecordScrollSyncProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<RecordScrollRegistry>(createRegistry())
  const isSyncingRef = useRef(false)

  const register = useCallback((element: HTMLElement) => {
    const firstRegistered = registryRef.current.values().next().value as HTMLElement | undefined

    registryRef.current.add(element)

    if (firstRegistered && firstRegistered !== element) {
      element.scrollLeft = firstRegistered.scrollLeft
    }
  }, [])

  const unregister = useCallback((element: HTMLElement) => {
    registryRef.current.delete(element)
  }, [])

  const sync = useCallback((source: HTMLElement) => {
    if (isSyncingRef.current) {
      return
    }

    isSyncingRef.current = true
    const nextScrollLeft = source.scrollLeft

    for (const element of registryRef.current) {
      if (element === source) {
        continue
      }

      if (element.scrollLeft !== nextScrollLeft) {
        element.scrollLeft = nextScrollLeft
      }
    }

    isSyncingRef.current = false
  }, [])

  const value = useMemo<RecordScrollSyncContextValue>(() => ({
    register,
    unregister,
    sync,
  }), [register, sync, unregister])

  return (
    <RecordScrollSyncContext.Provider value={value}>
      {children}
    </RecordScrollSyncContext.Provider>
  )
}

function useRegisteredScrollElement(
  context: RecordScrollSyncContextValue | null,
): MutableRefObject<HTMLElement | null> {
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    return () => {
      if (context && elementRef.current) {
        context.unregister(elementRef.current)
      }
    }
  }, [context])

  return elementRef
}

export function useRecordScrollSync() {
  const context = useContext(RecordScrollSyncContext)
  const elementRef = useRegisteredScrollElement(context)

  const setScrollElement = useCallback((element: HTMLElement | null) => {
    if (!context) {
      elementRef.current = element
      return
    }

    if (elementRef.current) {
      context.unregister(elementRef.current)
    }

    elementRef.current = element

    if (element) {
      context.register(element)
    }
  }, [context, elementRef])

  const onScroll = useCallback((event: UIEvent<HTMLElement>) => {
    context?.sync(event.currentTarget)
  }, [context])

  return {
    scrollRef: setScrollElement,
    onScroll,
  }
}
