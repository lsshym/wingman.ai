# Scenario: API Response To UI Contract

The `/api/orders/:id` response changed `totalCents` to `amount.total_minor_units` and added `currency`. Update the existing React order summary component so it renders the new response correctly without hiding the contract mismatch in an ad-hoc parent mapper.
