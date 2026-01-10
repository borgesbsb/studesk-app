import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    hash: string
  }

  interface Session {
    user: {
      id: string
      hash: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    hash: string
  }
}
