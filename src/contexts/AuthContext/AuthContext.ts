import React from 'react'
import { User } from 'src/types'

interface IAuthContext {
  user: User | null
  connectLichess: () => void
  logout: () => Promise<void>
}

export const AuthContext = React.createContext<IAuthContext>({
  user: null,
  connectLichess: () => {
    throw new Error('poorly provided AuthContext, missing connectLichess')
  },
  logout: () => {
    throw new Error('poorly provided AuthContext, missing logout')
  },
})
