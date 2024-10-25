import { AuthenticatedWrapper, UserProfile } from 'src/components'

export default function AuthenticatedProfilePage() {
  return (
    <AuthenticatedWrapper>
      <UserProfile />
    </AuthenticatedWrapper>
  )
}
