export type AuthUser = {
  username: string
  displayName: string
  role: string
}

type MockUserRow = AuthUser & {
  password: string
}

const MOCK_USER_DB: Record<string, MockUserRow> = {
  admin: {
    username: 'admin',
    displayName: 'Admin Nissa',
    role: 'admin',
    password: 'admin123',
  },
  coach: {
    username: 'theo',
    displayName: 'Coach Principal',
    role: 'admin',
    password: 'coach123',
  },
  staff: {
    username: 'staff',
    displayName: 'Staff Medical',
    role: 'staff',
    password: 'staff123',
  },
}

export async function loginWithMockDb(
  username: string,
  password: string,
): Promise<AuthUser> {
  await new Promise((resolve) => {
    setTimeout(resolve, 250)
  })

  const normalizedUsername = username.trim().toLowerCase()
  const row = MOCK_USER_DB[normalizedUsername]

  if (!row || row.password !== password) {
    throw new Error('Identifiant ou mot de passe incorrect.')
  }

  return {
    username: row.username,
    displayName: row.displayName,
    role: row.role,
  }
}

export const mockUsersForDev = Object.values(MOCK_USER_DB).map((row) => ({
  username: row.username,
  password: row.password,
  role: row.role,
}))
