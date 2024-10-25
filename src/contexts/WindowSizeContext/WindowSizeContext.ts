import React from 'react'

interface IWindowSizeContext {
  height: number
  width: number
  isMobile: boolean
}

export const WindowSizeContext = React.createContext<IWindowSizeContext>({
  height: 0,
  width: 0,
  isMobile: false,
})
