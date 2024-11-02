import Head from 'next/head'
import { AuthenticatedWrapper, UserProfile } from 'src/components'

export default function AuthenticatedProfilePage() {
  return (
    <AuthenticatedWrapper>
      <Head>
        <title>Profile – Maia Chess</title>
        <meta name="description" content="User profile and statistics" />
      </Head>
      <UserProfile />
    </AuthenticatedWrapper>
  )
}
