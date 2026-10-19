export type AuthUser = {
  id: string
  fullName: string
  email: string
  role: 'admin' | 'super_admin'
  customRoleId?: string | null
  companyId?: string | null
  permissions?: string[]
  activeBranchId?: string | null
}
