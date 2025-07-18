import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../../src/hooks/useLocalStorage/useLocalStorage'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return initial value when localStorage is empty', () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default-value'),
    )

    expect(result.current[0]).toBe('default-value')
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should return stored value from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify('stored-value'))

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default-value'),
    )

    expect(result.current[0]).toBe('stored-value')
  })

  it('should update localStorage when value is set', () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default-value'),
    )

    act(() => {
      result.current[1]('new-value')
    })

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify('new-value'),
    )
    expect(result.current[0]).toBe('new-value')
  })

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn())

    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default-value'),
    )

    expect(result.current[0]).toBe('default-value')

    consoleSpy.mockRestore()
  })

  it('should handle invalid JSON in localStorage', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn())

    mockLocalStorage.getItem.mockReturnValue('invalid-json')

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default-value'),
    )

    expect(result.current[0]).toBe('default-value')

    consoleSpy.mockRestore()
  })
})
