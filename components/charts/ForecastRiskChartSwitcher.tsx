"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatting/currency";
import {
  buildCapacityRiskSeries,
  buildMarginCostSeries,
  buildPipelineStageSeries,
  buildRevenueForecastSeries,
} from "@/lib/metrics/transforms";
import type { Forecast, MetricSnapshot, SampleData } from "@/lib/metrics/types";

type ChartMode = "revenue" | "pipeline" | "margin" | "capacity";

type ForecastRiskChartSwitcherProps = {
  snapshots: MetricSnapshot[];
  forecasts: Forecast[];
  sampleData: SampleData;
};

const chartModes: { id: ChartMode; label: string; description: string }[] = [
  {
    id: "revenue",
    label: "Revenue pacing",
    description: "Actual revenue, forecast revenue, and cumulative weekly target pacing.",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    description: "Open pipeline by stage, comparing booked value with weighted value.",
  },
  {
    id: "margin",
    label: "Margin & costs",
    description: "Weekly sales and expense activity showing revenue, margin, operating costs, and contribution.",
  },
  {
    id: "capacity",
    label: "Capacity",
    description: "On-hand quantity compared with reorder points by resource.",
  },
];

function EmptyChart({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="chart-frame" aria-label={title}>
      <div className="empty-panel compact">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function currencyTooltip(value: unknown) {
  return formatCurrency(Number(value));
}

function numberTooltip(value: unknown) {
  return Number(value).toLocaleString("en-GB");
}

export function ForecastRiskChartSwitcher({
  snapshots,
  forecasts,
  sampleData,
}: ForecastRiskChartSwitcherProps) {
  const [selectedMode, setSelectedMode] = useState<ChartMode>("revenue");
  const activeMode = chartModes.find((mode) => mode.id === selectedMode) ?? chartModes[0];
  const revenueSeries = useMemo(() => buildRevenueForecastSeries(snapshots, forecasts), [snapshots, forecasts]);
  const pipelineSeries = useMemo(() => buildPipelineStageSeries(sampleData.pipelineDeals), [sampleData.pipelineDeals]);
  const marginCostSeries = useMemo(
    () => buildMarginCostSeries(sampleData.salesOrders, sampleData.expenses, snapshots),
    [sampleData.salesOrders, sampleData.expenses, snapshots],
  );
  const capacitySeries = useMemo(
    () => buildCapacityRiskSeries(sampleData.capacityPositions),
    [sampleData.capacityPositions],
  );

  return (
    <div className="chart-switcher">
      <div className="chart-switcher-bar">
        <div className="segmented-control" role="tablist" aria-label="Forecast and risk chart modes">
          {chartModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={selectedMode === mode.id}
              className="segmented-control-button"
              data-active={selectedMode === mode.id}
              onClick={() => setSelectedMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <span className="chart-mode-description">{activeMode.description}</span>
      </div>

      {selectedMode === "revenue" && <RevenuePacingChart data={revenueSeries} />}
      {selectedMode === "pipeline" && <PipelineChart data={pipelineSeries} />}
      {selectedMode === "margin" && <MarginCostChart data={marginCostSeries} />}
      {selectedMode === "capacity" && <CapacityChart data={capacitySeries} />}
    </div>
  );
}

function RevenuePacingChart({ data }: { data: ReturnType<typeof buildRevenueForecastSeries> }) {
  if (data.length === 0) {
    return (
      <EmptyChart
        title="No revenue forecast available"
        detail="Run the forecast/risk workflow to populate projected revenue."
      />
    );
  }

  return (
    <div className="chart-frame" aria-label="Revenue pacing chart">
      <ResponsiveContainer height={320} width="100%">
        <LineChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#dbe0d8" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#66716a", fontSize: 12 }} />
          <YAxis
            tickFormatter={(value) => formatCurrency(Number(value))}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#66716a", fontSize: 12 }}
            width={82}
          />
          <Tooltip
            formatter={currencyTooltip}
            labelStyle={{ color: "#17201b", fontWeight: 700 }}
            contentStyle={{
              borderColor: "#dbe0d8",
              borderRadius: 8,
              boxShadow: "0 12px 26px rgba(23, 32, 27, 0.12)",
            }}
          />
          <Line
            type="monotone"
            dataKey="actualRevenue"
            name="Actual revenue"
            stroke="#0f766e"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecastRevenue"
            name="Forecast revenue"
            stroke="#2563eb"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="targetRevenue"
            name="Cumulative target"
            stroke="#a16207"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-legend" aria-hidden>
        <span data-series="actual">Actual</span>
        <span data-series="forecast">Forecast</span>
        <span data-series="target">Cumulative target</span>
      </div>
    </div>
  );
}

function PipelineChart({ data }: { data: ReturnType<typeof buildPipelineStageSeries> }) {
  if (data.length === 0) {
    return (
      <EmptyChart
        title="No active pipeline available"
        detail="Pipeline stage value appears when CRM pipeline rows are loaded."
      />
    );
  }

  return (
    <div className="chart-frame" aria-label="Pipeline stage chart">
      <ResponsiveContainer height={320} width="100%">
        <BarChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#dbe0d8" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: "#66716a", fontSize: 12 }} />
          <YAxis
            tickFormatter={(value) => formatCurrency(Number(value))}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#66716a", fontSize: 12 }}
            width={82}
          />
          <Tooltip
            formatter={currencyTooltip}
            labelStyle={{ color: "#17201b", fontWeight: 700 }}
            contentStyle={{ borderColor: "#dbe0d8", borderRadius: 8 }}
          />
          <Bar dataKey="rawValue" name="Raw pipeline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="weightedValue" name="Weighted pipeline" fill="#0f766e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-legend" aria-hidden>
        <span data-series="raw">Raw pipeline</span>
        <span data-series="weighted">Weighted pipeline</span>
      </div>
    </div>
  );
}

function MarginCostChart({ data }: { data: ReturnType<typeof buildMarginCostSeries> }) {
  if (data.length === 0) {
    return (
      <EmptyChart
        title="No metric snapshots available"
        detail="Margin and cost pressure appears after metric snapshots are generated."
      />
    );
  }

  return (
    <div className="chart-frame" aria-label="Margin and costs chart">
      <ResponsiveContainer height={320} width="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#dbe0d8" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#66716a", fontSize: 12 }} />
          <YAxis
            tickFormatter={(value) => formatCurrency(Number(value))}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#66716a", fontSize: 12 }}
            width={82}
          />
          <Tooltip
            formatter={currencyTooltip}
            labelStyle={{ color: "#17201b", fontWeight: 700 }}
            contentStyle={{ borderColor: "#dbe0d8", borderRadius: 8 }}
          />
          <Bar dataKey="operatingCosts" name="Operating costs" fill="#a16207" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2.4} dot={{ r: 3 }} />
          <Line
            type="monotone"
            dataKey="grossMargin"
            name="Gross margin"
            stroke="#0f766e"
            strokeWidth={2.4}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="netContribution"
            name="Net contribution"
            stroke="#b42318"
            strokeWidth={2.2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend" aria-hidden>
        <span data-series="revenue">Revenue</span>
        <span data-series="margin">Gross margin</span>
        <span data-series="costs">Operating costs</span>
        <span data-series="net">Net contribution</span>
      </div>
    </div>
  );
}

function CapacityChart({ data }: { data: ReturnType<typeof buildCapacityRiskSeries> }) {
  if (data.length === 0) {
    return (
      <EmptyChart
        title="No capacity positions available"
        detail="Capacity risk appears when inventory or resource rows are loaded."
      />
    );
  }

  return (
    <div className="chart-frame" aria-label="Capacity cover chart">
      <ResponsiveContainer height={320} width="100%">
        <BarChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#dbe0d8" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#66716a", fontSize: 12 }} />
          <YAxis
            tickFormatter={(value) => Number(value).toLocaleString("en-GB")}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#66716a", fontSize: 12 }}
            width={64}
          />
          <Tooltip
            formatter={numberTooltip}
            labelStyle={{ color: "#17201b", fontWeight: 700 }}
            contentStyle={{ borderColor: "#dbe0d8", borderRadius: 8 }}
          />
          <Bar dataKey="quantityOnHand" name="Quantity on hand" fill="#0f766e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="reorderPoint" name="Reorder point" fill="#b42318" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-legend" aria-hidden>
        <span data-series="quantity">Quantity on hand</span>
        <span data-series="reorder">Reorder point</span>
      </div>
    </div>
  );
}
