export interface UserRegistration {
    name: string;
    email: string;
    password: string;
}

export interface UserLogin {
    email: string;
    password: string;
}

// Fixed roles — defined in code, never created/edited/deleted at runtime.
export type UserRole = "admin" | "manager" | "user";

// A manager's professional specialty (only meaningful when role === "manager").
export type ManagerSpecialty = "personal_trainer" | "nutritionist";

// Granular capabilities. Pages declare the permission they need; the server
// enforces them. NEVER trust a permission/role sent by the client.
export type Permission =
    | "dashboard.view"
    | "reports.view"
    | "treinos.view"
    | "treinos.create"
    | "treinos.edit"
    | "treinos.archive"
    | "treinos.delete"
    | "nutrition.view"
    | "nutrition.edit"
    | "diet.view"
    | "diet.edit"
    | "users.manage";

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    specialty?: ManagerSpecialty | null;
    permissions: Permission[];
    avatar?: string | null;
    createdAt: string;
}

export interface AuthResponse {
    user: UserProfile;
    token: string;
}

export interface ProfileUpdate {
    name?: string;
    avatar?: string | null;
    currentPassword?: string;
    newPassword?: string;
}

// Admin-only: payload to change a user's role/specialty.
export interface RoleUpdate {
    role: UserRole;
    specialty?: ManagerSpecialty | null;
}
