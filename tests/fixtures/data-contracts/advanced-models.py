from dataclasses import dataclass
from typing import Literal, Optional


@dataclass
class Contact:
    email: Optional[str] = None


@dataclass
class Entity:
    created_at: str


@dataclass
class UserView(Entity):
    id: str
    display_name: str
    contact: Contact
    roles: list[str]
    status: Literal["enabled", "disabled"]
