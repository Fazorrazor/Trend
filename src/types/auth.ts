export interface User {
    id: string;
    email: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
    job_title?: string;
    department?: string;
    role?: string;
    created_at?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
    message?: string;
}

export interface AuthError {
    message: string;
    status?: number;
}
