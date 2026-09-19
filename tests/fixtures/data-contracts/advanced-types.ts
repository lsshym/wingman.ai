export interface Contact {
  email?: string | null;
}

export interface UserView {
  id: string;
  displayName: string;
  contact: Contact;
  roles: string[];
  status: "enabled" | "disabled";
}

export type UserList = UserView[];
