import { ReactNode, useCallback, useEffect, useState } from 'react'
import { fetchAccount, connectLichessUrl, logoutAndFetchAccount } from 'src/api'
import {} from 'src/components'
import { AuthContext } from 'src/contexts'
import { User } from 'src/types'

export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode
}) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    async function getAndSetAccount() {
      const response = await fetchAccount()
      setUser(response)
    }

    getAndSetAccount()
  }, [])

  const connectLichess = useCallback(() => {
    window.location.assign(
      connectLichessUrl +
        '?redirect_url=' +
        encodeURIComponent(window.location.toString()),
    )
  }, [])

  const logout = useCallback(async () => {
    const response = await logoutAndFetchAccount()
    setUser(response)
  }, [])

  return (
    <AuthContext.Provider value={{ user, logout, connectLichess }}>
      {children}
    </AuthContext.Provider>
  )
}
