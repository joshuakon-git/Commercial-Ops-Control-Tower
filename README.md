# AI Commercial Ops Control Tower

A portfolio-grade operating layer for small businesses that turns sales, costs, pipeline, and capacity data into KPIs, forecasts, risk events, AI management summaries, and recommended actions.

## MVP

- Seeded demo commercial data
- Supabase operational database
- n8n-as-code automation workflows
- Explainable forecasting and risk rules
- AI weekly ops summary
- Next.js operator dashboard with four polished views

## Operating Loop

1. Ingest messy commercial data.
2. Normalize it into an operational database.
3. Calculate metrics and forecasts.
4. Detect risks.
5. Generate AI summaries.
6. Trigger recommended actions and alerts.

## Security

- Dashboard reads safe demo data through the Supabase anon key.
- Workflows and server scripts use service role or database credentials.
- Supabase RLS is enabled in the schema.
- Secrets are never committed.
