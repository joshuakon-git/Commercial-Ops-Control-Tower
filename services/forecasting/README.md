# Forecasting Service

Deterministic forecasting and risk-rule helpers for the AI Commercial Ops Control Tower.

This service is intentionally pure Python for Task 5. It does not read environment variables, connect to Supabase, or call dashboard code. Later workflows can import or mirror these rules to create `forecasts` and `risk_events` records.

## Verify

```powershell
python -m pytest services/forecasting/test_forecast.py -v
```

