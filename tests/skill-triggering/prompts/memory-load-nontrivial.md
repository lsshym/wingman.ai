# Scenario: Non-trivial Bug Fix

The checkout flow sometimes leaves an order in `pending_payment` even after the payment webhook succeeds. Please inspect the existing implementation, find the state transition bug, and patch it without changing unrelated checkout behavior.
