export interface UserRegistration {
    name: string;
    email: string;
    password: string;
}

export interface UserLogin {
    email: string;
    password: string;
}

export type UserRole = "admin" | "viewer";

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
}

export interface AuthResponse {
    user: UserProfile;
    token: string;
}
