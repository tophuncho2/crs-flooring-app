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

type RecordScrollSyncGroup = "parent" | "allocation"

type RecordScrollRegistry = Set<HTMLElement>

type RecordScrollSyncContextValue = {
  register: (group: RecordScrollSyncGroup, element: HTMLElement) => void
  unregister: (group: RecordScrollSyncGroup, element: HTMLElement) => void
  sync: (group: RecordScrollSyncGroup, source: HTMLElement) => void
}

const RecordScrollSyncContext = createContext<RecordScrollSyncContextValue | null>(null)

function createRegistry(): RecordScrollRegistry {
  return new Set<HTMLElement>()
}

export function RecordScrollSyncProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<RecordScrollRegistry>(createRegistry())
  const isSyncingRef = useRef(false)

  const register = useCallback((_group: RecordScrollSyncGroup, element: HTMLElement) => {
    const firstRegistered = registryRef.current.values().next().value as HTMLElement | undefined

    registryRef.current.add(element)

    if (firstRegistered && firstRegistered !== element) {
      element.scrollLeft = firstRegistered.scrollLeft
    }
  }, [])

  const unregister = useCallback((_group: RecordScrollSyncGroup, element: HTMLElement) => {
    registryRef.current.delete(element)
  }, [])

  const sync = useCallback((_group: RecordScrollSyncGroup, source: HTMLElement) => {
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
  group: RecordScrollSyncGroup,
): MutableRefObject<HTMLElement | null> {
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    return () => {
      if (context && elementRef.current) {
        context.unregister(group, elementRef.current)
      }
    }
  }, [context, group])

  return elementRef
}

export function useRecordScrollSync(group: RecordScrollSyncGroup) {
  const context = useContext(RecordScrollSyncContext)
  const elementRef = useRegisteredScrollElement(context, group)

  const setScrollElement = useCallback((element: HTMLElement | null) => {
    if (!context) {
      elementRef.current = element
      return
    }

    if (elementRef.current) {
      context.unregister(group, elementRef.current)
    }

    elementRef.current = element

    if (element) {
      context.register(group, element)
    }
  }, [context, elementRef, group])

  const onScroll = useCallback((event: UIEvent<HTMLElement>) => {
    context?.sync(group, event.currentTarget)
  }, [context, group])

  return {
    scrollRef: setScrollElement,
    onScroll,
  }
}
