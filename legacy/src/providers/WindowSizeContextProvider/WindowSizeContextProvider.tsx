import { ReactNode, useMemo } from 'react'
import { WindowSizeContext } from 'src/contexts'
import { useWindowSize } from 'src/hooks'

export const WindowSizeContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode
}) => {
  const { width, height } = useWindowSize()
  const isMobile = useMemo(() => width > 0 && width <= 670, [width])
  return (
    <WindowSizeContext.Provider value={{ width, height, isMobile }}>
      {children}
    </WindowSizeContext.Provider>
  )
}
