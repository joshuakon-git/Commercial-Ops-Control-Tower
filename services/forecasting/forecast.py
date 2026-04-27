from __future__ import annotations

from datetime import date


def forecast_revenue(weekly_revenue: list[float]) -> dict:
    if not weekly_revenue:
        raise ValueError("weekly_revenue must include at least one value")

    values = [float(value) for value in weekly_revenue]
    average_weekly = round(sum(values) / len(values), 2)

    return {
        "forecast_type": "revenue",
        "method": "four_week_average",
        "weeks_observed": len(values),
        "average_weekly_revenue": average_weekly,
        "projected_revenue": round(average_weekly * 4, 2),
        "lower_bound": round(min(values) * 4, 2),
        "upper_bound": round(max(values) * 4, 2),
        "inputs_summary": {
            "weekly_revenue": values,
        },
    }


def detect_revenue_pacing(projected: float, target: float) -> dict | None:
    if target <= 0:
        return None

    threshold = round(target * 0.90, 2)
    if projected >= threshold:
        return None

    shortfall_pct = round(((target - projected) / target) * 100, 1)
    return {
        "risk_type": "revenue_pacing",
        "severity": "high",
        "metric_name": "projected_revenue",
        "metric_value": round(float(projected), 2),
        "threshold_value": threshold,
        "title": "Revenue is pacing below target",
        "explanation": (
            f"Projected revenue of {projected:.2f} is {shortfall_pct:.1f}% below "
            f"the target of {target:.2f}."
        ),
        "recommended_action": (
            "Review open pipeline and prioritize recoverable revenue for the current period."
        ),
    }


def detect_margin_drop(current_pct: float, previous_pct: float) -> dict | None:
    drop = previous_pct - current_pct
    if drop < 0.05:
        return None

    threshold = round(previous_pct - 0.05, 2)
    drop_points = round(drop * 100, 1)
    return {
        "risk_type": "margin_drop",
        "severity": "medium",
        "metric_name": "gross_margin_pct",
        "metric_value": round(float(current_pct), 2),
        "threshold_value": threshold,
        "title": "Gross margin percentage dropped",
        "explanation": (
            f"Gross margin fell by {drop_points:.1f} percentage points from "
            f"{previous_pct * 100:.1f}% to {current_pct * 100:.1f}%."
        ),
        "recommended_action": (
            "Inspect discounts, product mix, and unit costs before approving new promotions."
        ),
    }


def detect_expense_pressure(revenue_growth: float, expense_growth: float) -> dict | None:
    pressure = expense_growth - revenue_growth
    if pressure <= 0:
        return None

    pressure_points = round(pressure * 100, 1)
    return {
        "risk_type": "expense_pressure",
        "severity": "medium",
        "metric_name": "expense_growth_minus_revenue_growth",
        "metric_value": round(float(pressure), 2),
        "threshold_value": 0.0,
        "title": "Expenses are growing faster than revenue",
        "explanation": (
            f"Expense growth is {pressure_points:.1f} percentage points higher than revenue growth."
        ),
        "recommended_action": (
            "Review variable costs and defer discretionary spend until revenue catches up."
        ),
    }


def detect_stockout(
    quantity_on_hand: int,
    weekly_units: float,
    lead_time_days: int,
) -> dict | None:
    if weekly_units <= 0 or lead_time_days <= 0:
        return None

    cover_days = round((quantity_on_hand / (weekly_units / 7)), 1)
    if cover_days > lead_time_days:
        return None

    return {
        "risk_type": "stockout_risk",
        "severity": "high",
        "metric_name": "capacity_cover_days",
        "metric_value": cover_days,
        "threshold_value": float(lead_time_days),
        "title": "Inventory cover is inside lead time",
        "explanation": (
            f"On-hand quantity covers {cover_days:.1f} days at current velocity, "
            f"below the {lead_time_days} day lead time."
        ),
        "recommended_action": "Reorder inventory or shift demand away from the constrained SKU.",
    }


def detect_deal_slippage(expected_close_date: str, status: str, value: float) -> dict | None:
    if status.lower() != "open":
        return None

    close_date = date.fromisoformat(expected_close_date)
    if close_date >= date.today():
        return None

    return {
        "risk_type": "deal_slippage",
        "severity": "high",
        "metric_name": "deal_value",
        "metric_value": round(float(value), 2),
        "threshold_value": 0.0,
        "title": "Open deal is past its expected close date",
        "explanation": (
            f"Deal worth {value:.2f} is still open after its expected close date of "
            f"{expected_close_date}."
        ),
        "recommended_action": (
            "Confirm next step, update close date, or remove the deal from near-term forecast."
        ),
    }
