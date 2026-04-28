"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatting/currency";
import type { RevenueForecastPoint } from "@/lib/metrics/types";

type RevenueForecastChartProps = {
  data: RevenueForecastPoint[];
};

export function RevenueForecastChart({ data }: RevenueForecastChartProps) {
  if (data.length === 0) {
    return (
      <div className="empty-panel">
        <strong>No revenue forecast available</strong>
        <span>Run forecast/risk workflow to populate projected revenue.</span>
      </div>
    );
  }

  return (
    <div className="chart-frame" aria-label="Revenue forecast chart">
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
            formatter={(value) => formatCurrency(Number(value))}
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
            name="Target reference"
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
        <span data-series="target">Target</span>
      </div>
    </div>
  );
}
