import pytest

from forecast import (
    detect_deal_slippage,
    detect_expense_pressure,
    detect_margin_drop,
    detect_revenue_pacing,
    detect_stockout,
    forecast_revenue,
)


def test_forecast_revenue_projects_four_weeks_from_recent_average():
    result = forecast_revenue([10_000.0, 12_000.0, 11_000.0, 13_000.0])

    assert result == {
        "forecast_type": "revenue",
        "method": "four_week_average",
        "weeks_observed": 4,
        "average_weekly_revenue": 11_500.0,
        "projected_revenue": 46_000.0,
        "lower_bound": 40_000.0,
        "upper_bound": 52_000.0,
        "inputs_summary": {
            "weekly_revenue": [10_000.0, 12_000.0, 11_000.0, 13_000.0],
        },
    }


def test_forecast_revenue_requires_at_least_one_week():
    with pytest.raises(ValueError, match="weekly_revenue must include at least one value"):
        forecast_revenue([])


def test_detect_revenue_pacing_returns_high_risk_when_projection_is_more_than_ten_percent_below_target():
    risk = detect_revenue_pacing(projected=82_000.0, target=100_000.0)

    assert risk == {
        "risk_type": "revenue_pacing",
        "severity": "high",
        "metric_name": "projected_revenue",
        "metric_value": 82_000.0,
        "threshold_value": 90_000.0,
        "title": "Revenue is pacing below target",
        "explanation": "Projected revenue of 82000.00 is 18.0% below the target of 100000.00.",
        "recommended_action": "Review open pipeline and prioritize recoverable revenue for the current period.",
    }


def test_detect_margin_drop_returns_medium_risk_for_five_point_decline():
    risk = detect_margin_drop(current_pct=0.37, previous_pct=0.43)

    assert risk == {
        "risk_type": "margin_drop",
        "severity": "medium",
        "metric_name": "gross_margin_pct",
        "metric_value": 0.37,
        "threshold_value": 0.38,
        "title": "Gross margin percentage dropped",
        "explanation": "Gross margin fell by 6.0 percentage points from 43.0% to 37.0%.",
        "recommended_action": "Inspect discounts, product mix, and unit costs before approving new promotions.",
    }


def test_detect_expense_pressure_returns_medium_risk_when_expenses_outgrow_revenue():
    risk = detect_expense_pressure(revenue_growth=0.08, expense_growth=0.18)

    assert risk == {
        "risk_type": "expense_pressure",
        "severity": "medium",
        "metric_name": "expense_growth_minus_revenue_growth",
        "metric_value": 0.10,
        "threshold_value": 0.0,
        "title": "Expenses are growing faster than revenue",
        "explanation": "Expense growth is 10.0 percentage points higher than revenue growth.",
        "recommended_action": "Review variable costs and defer discretionary spend until revenue catches up.",
    }


def test_detect_stockout_returns_high_risk_when_cover_is_inside_lead_time():
    risk = detect_stockout(quantity_on_hand=15, weekly_units=35.0, lead_time_days=7)

    assert risk == {
        "risk_type": "stockout_risk",
        "severity": "high",
        "metric_name": "capacity_cover_days",
        "metric_value": 3.0,
        "threshold_value": 7.0,
        "title": "Inventory cover is inside lead time",
        "explanation": "On-hand quantity covers 3.0 days at current velocity, below the 7 day lead time.",
        "recommended_action": "Reorder inventory or shift demand away from the constrained SKU.",
    }


def test_detect_deal_slippage_returns_high_risk_for_open_past_due_deal():
    risk = detect_deal_slippage(
        expected_close_date="2000-01-01",
        status="open",
        value=75_000.0,
    )

    assert risk == {
        "risk_type": "deal_slippage",
        "severity": "high",
        "metric_name": "deal_value",
        "metric_value": 75_000.0,
        "threshold_value": 0.0,
        "title": "Open deal is past its expected close date",
        "explanation": "Deal worth 75000.00 is still open after its expected close date of 2000-01-01.",
        "recommended_action": "Confirm next step, update close date, or remove the deal from near-term forecast.",
    }
