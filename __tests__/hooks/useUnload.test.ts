import { renderHook } from '@testing-library/react'
import { useUnload } from '../../src/hooks/useUnload/useUnload'

describe('useUnload', () => {
  let mockAddEventListener: jest.SpyInstance
  let mockRemoveEventListener: jest.SpyInstance

  beforeEach(() => {
    mockAddEventListener = jest.spyOn(window, 'addEventListener')
    mockRemoveEventListener = jest.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    jest.clearAllMocks()
    mockAddEventListener.mockRestore()
    mockRemoveEventListener.mockRestore()
  })

  it('should add beforeunload event listener on mount', () => {
    const handler = jest.fn()
    renderHook(() => useUnload(handler))

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    )
  })

  it('should remove beforeunload event listener on unmount', () => {
    const handler = jest.fn()
    const { unmount } = renderHook(() => useUnload(handler))

    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    )
  })

  it('should call handler when beforeunload event is triggered', () => {
    const handler = jest.fn()
    renderHook(() => useUnload(handler))

    // Get the event listener that was added
    const eventListener = mockAddEventListener.mock.calls[0][1]

    // Create a mock beforeunload event
    const mockEvent = {
      defaultPrevented: false,
      returnValue: '',
    } as BeforeUnloadEvent

    eventListener(mockEvent)

    expect(handler).toHaveBeenCalledWith(mockEvent)
  })

  it('should update handler when handler prop changes', () => {
    const initialHandler = jest.fn()
    const newHandler = jest.fn()

    const { rerender } = renderHook(({ handler }) => useUnload(handler), {
      initialProps: { handler: initialHandler },
    })

    // Get the event listener
    const eventListener = mockAddEventListener.mock.calls[0][1]

    // Create a mock event
    const mockEvent = {
      defaultPrevented: false,
      returnValue: '',
    } as BeforeUnloadEvent

    // Call with initial handler
    eventListener(mockEvent)
    expect(initialHandler).toHaveBeenCalledWith(mockEvent)
    expect(newHandler).not.toHaveBeenCalled()

    // Update handler
    rerender({ handler: newHandler })

    // Call with new handler
    eventListener(mockEvent)
    expect(newHandler).toHaveBeenCalledWith(mockEvent)
  })

  it('should set returnValue to empty string when event is defaultPrevented', () => {
    const handler = jest.fn()
    renderHook(() => useUnload(handler))

    const eventListener = mockAddEventListener.mock.calls[0][1]

    const mockEvent = {
      defaultPrevented: true,
      returnValue: 'initial value',
    } as BeforeUnloadEvent

    eventListener(mockEvent)

    expect(mockEvent.returnValue).toBe('')
  })

  it('should set returnValue and return string when handler returns string', () => {
    const returnMessage = 'Are you sure you want to leave?'
    const handler = jest.fn(() => returnMessage)
    renderHook(() => useUnload(handler))

    const eventListener = mockAddEventListener.mock.calls[0][1]

    const mockEvent = {
      defaultPrevented: false,
      returnValue: '',
    } as BeforeUnloadEvent

    const result = eventListener(mockEvent)

    expect(mockEvent.returnValue).toBe(returnMessage)
    expect(result).toBe(returnMessage)
  })

  it('should not set returnValue when handler returns undefined', () => {
    const handler = jest.fn(() => undefined)
    renderHook(() => useUnload(handler))

    const eventListener = mockAddEventListener.mock.calls[0][1]

    const mockEvent = {
      defaultPrevented: false,
      returnValue: '',
    } as BeforeUnloadEvent

    const result = eventListener(mockEvent)

    expect(mockEvent.returnValue).toBe('')
    expect(result).toBeUndefined()
  })

  it('should handle non-function handler gracefully', () => {
    // This shouldn't happen in practice, but test for robustness
    const handler = null as any
    renderHook(() => useUnload(handler))

    const eventListener = mockAddEventListener.mock.calls[0][1]

    const mockEvent = {
      defaultPrevented: false,
      returnValue: '',
    } as BeforeUnloadEvent

    expect(() => eventListener(mockEvent)).not.toThrow()
  })

  it('should handle handler that throws error', () => {
    const handler = jest.fn(() => {
      throw new Error('Handler error')
    })
    renderHook(() => useUnload(handler))

    const eventListener = mockAddEventListener.mock.calls[0][1]

    const mockEvent = {
      defaultPrevented: false,
      returnValue: '',
    } as BeforeUnloadEvent

    expect(() => eventListener(mockEvent)).toThrow('Handler error')
  })

  it('should handle both defaultPrevented and string return value', () => {
    const returnMessage = 'Custom message'
    const handler = jest.fn(() => returnMessage)
    renderHook(() => useUnload(handler))

    const eventListener = mockAddEventListener.mock.calls[0][1]

    const mockEvent = {
      defaultPrevented: true,
      returnValue: 'initial',
    } as BeforeUnloadEvent

    const result = eventListener(mockEvent)

    // Should set returnValue to empty string first due to defaultPrevented
    // Then set it to the return value
    expect(mockEvent.returnValue).toBe(returnMessage)
    expect(result).toBe(returnMessage)
  })
})
