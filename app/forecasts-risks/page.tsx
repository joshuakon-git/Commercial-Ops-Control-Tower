import { ForecastRiskChartSwitcher } from "@/components/charts/ForecastRiskChartSwitcher";
import { RiskFeed } from "@/components/risks/RiskFeed";
import { formatCurrency } from "@/lib/formatting/currency";
import { buildRevenueForecastSeries } from "@/lib/metrics/transforms";
import {
  getLatestRevenueForecasts,
  getOperatingRiskEvents,
  getRecentMetricSnapshots,
  getSampleData,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function riskMatches(riskType: string, terms: string[]) {
  const normalized = riskType.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export default async function ForecastsRisksPage() {
  const [snapshots, forecasts, risks, sampleData] = await Promise.all([
    getRecentMetricSnapshots(),
    getLatestRevenueForecasts(),
    getOperatingRiskEvents(),
    getSampleData(),
  ]);
  const chartSeries = buildRevenueForecastSeries(snapshots, forecasts);
  const latestSnapshot = snapshots[0] ?? null;
  const latestForecast = forecasts.at(-1) ?? null;
  const targetReference = chartSeries.findLast((point) => point.targetRevenue !== null)?.targetRevenue ?? null;
  const pacingDelta =
    latestForecast && targetReference ? latestForecast.predictedValue - targetReference : null;
  const slippingDeals = risks.filter((risk) => riskMatches(risk.riskType, ["pipeline", "deal", "slip"]));
  const marginRisks = risks.filter((risk) => riskMatches(risk.riskType, ["margin"]));
  const expenseRisks = risks.filter((risk) => riskMatches(risk.riskType, ["cash", "expense", "cost"]));
  const capacityRisks = risks.filter((risk) => riskMatches(risk.riskType, ["capacity", "stock"]));

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Forecasts & Risks</p>
        <h1 className="page-title">Forward view and risk signals</h1>
        <p className="page-description">
          Review revenue projection, target pacing, slipping deals, margin pressure, and capacity risks in one operating surface.
        </p>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Forecast and risk charts</h2>
            <p>Switch between forecast pacing, pipeline quality, margin pressure, and capacity cover using the loaded data.</p>
          </div>
          <span className="tag">{latestForecast ? latestForecast.method : "No forecast"}</span>
        </div>
        <ForecastRiskChartSwitcher snapshots={snapshots} forecasts={forecasts} sampleData={sampleData} />
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Pacing notes</h2>
            <p>Current forecast and operating metrics that explain the forward view.</p>
          </div>
        </div>
        <div className="status-list">
          <div className="status-row">
            <strong>Forecast versus target</strong>
            <span>
              {pacingDelta === null
                ? "Waiting for forecast"
                : `${pacingDelta >= 0 ? "Ahead by" : "Behind by"} ${formatCurrency(Math.abs(pacingDelta))}`}
            </span>
          </div>
          <div className="status-row">
            <strong>Weighted pipeline</strong>
            <span>
              {latestSnapshot
                ? `${formatCurrency(latestSnapshot.weightedPipeline)} at ${latestSnapshot.pipelineCoverage.toFixed(1)}x coverage`
                : "No metric snapshot"}
            </span>
          </div>
          <div className="status-row">
            <strong>Margin trend</strong>
            <span>
              {latestSnapshot
                ? `${formatPercent(latestSnapshot.grossMarginPct)} margin, ${formatCurrency(latestSnapshot.grossMargin)} gross`
                : "No metric snapshot"}
            </span>
          </div>
          <div className="status-row">
            <strong>Expense pressure</strong>
            <span>
              {latestSnapshot
                ? `${formatCurrency(latestSnapshot.operatingCosts)} costs, ${latestSnapshot.cashPressureScore.toFixed(1)} pressure`
                : "No metric snapshot"}
            </span>
          </div>
          <div className="status-row">
            <strong>Capacity cover</strong>
            <span>
              {latestSnapshot
                ? `${latestSnapshot.stockRiskCount} stock risks currently flagged`
                : "No metric snapshot"}
            </span>
          </div>
        </div>
      </section>

      <div className="section-grid two-column">
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <h2>Slipping deals</h2>
              <p>Pipeline risks that can move the forecast.</p>
            </div>
          </div>
          <RiskFeed risks={slippingDeals} emptyLabel="No slipping deal risks" />
        </section>

        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <h2>Margin and expenses</h2>
              <p>Margin trend and expense pressure risks.</p>
            </div>
          </div>
          <RiskFeed risks={[...marginRisks, ...expenseRisks]} emptyLabel="No margin or expense risks" />
        </section>
      </div>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Capacity cover risks</h2>
            <p>Inventory or capacity constraints that could block near-term revenue.</p>
          </div>
        </div>
        <RiskFeed risks={capacityRisks} emptyLabel="No capacity cover risks" />
      </section>
    </>
  );
}
