export interface UserView {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  status: "enabled" | "disabled";
}

export type ApiStatus = "active" | "disabled";
