from dataclasses import dataclass
from typing import Optional


@dataclass
class UserView:
    id: str
    display_name: str
    email: Optional[str]
    status: str
