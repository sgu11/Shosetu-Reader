export type AuthStrategy = "default-user" | "profile" | "session";
export type UserLocale = "en" | "ko";
export type ReaderLanguage = "ja" | "ko";
export type UserTheme = "light" | "dark" | "system";

export interface UserContext {
  userId: string;
  authStrategy: AuthStrategy;
  isAuthenticated: boolean;
  email: string;
  displayName: string | null;
  preferredUiLocale: UserLocale;
  preferredReaderLanguage: ReaderLanguage;
  theme: UserTheme;
}
