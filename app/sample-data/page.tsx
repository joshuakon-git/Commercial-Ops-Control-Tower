import { formatCurrency } from "@/lib/formatting/currency";
import { formatShortDate } from "@/lib/formatting/dates";
import type {
  SampleCapacityPosition,
  SampleExpense,
  SamplePipelineDeal,
  SampleSalesOrder,
  SampleTarget,
} from "@/lib/metrics/types";
import { getSampleData } from "@/lib/supabase/queries";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type SampleDataSectionProps = {
  title: string;
  description: string;
  outputLink: string;
  rowCount: number;
  children: ReactNode;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function SampleDataSection({ title, description, outputLink, rowCount, children }: SampleDataSectionProps) {
  return (
    <section className="workspace-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
          <p className="source-link">{outputLink}</p>
        </div>
        <span className="tag">{rowCount} rows</span>
      </div>
      {rowCount > 0 ? children : <EmptyTableState label={`No ${title.toLowerCase()} records found`} />}
    </section>
  );
}

function EmptyTableState({ label }: { label: string }) {
  return (
    <div className="empty-panel compact">
      <strong>{label}</strong>
      <span>Seeded records will appear here after the Supabase seed has been loaded.</span>
    </div>
  );
}

function SalesOrdersTable({ rows }: { rows: SampleSalesOrder[] }) {
  return (
    <div className="table-frame">
      <table className="ops-table sample-data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Units</th>
            <th>Revenue</th>
            <th>Gross Margin</th>
            <th>Channel</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatShortDate(row.orderDate)}</td>
              <td>
                <strong>{row.customer}</strong>
                <span>{row.sku}</span>
              </td>
              <td>{row.product}</td>
              <td>{row.units}</td>
              <td>{formatCurrency(row.revenue)}</td>
              <td>
                <strong>{formatCurrency(row.grossMargin)}</strong>
                <span>Unit cost {formatCurrency(row.unitCost)}</span>
              </td>
              <td>{row.channel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PipelineTable({ rows }: { rows: SamplePipelineDeal[] }) {
  return (
    <div className="table-frame">
      <table className="ops-table sample-data-table">
        <thead>
          <tr>
            <th>Deal</th>
            <th>Stage</th>
            <th>Owner</th>
            <th>Close Date</th>
            <th>Value</th>
            <th>Probability</th>
            <th>Weighted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.dealName}</strong>
                <span>{row.status}</span>
              </td>
              <td>{row.stage}</td>
              <td>{row.owner}</td>
              <td>{formatShortDate(row.expectedCloseDate)}</td>
              <td>{formatCurrency(row.value)}</td>
              <td>{formatPercent(row.probability)}</td>
              <td>{formatCurrency(row.weightedValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpensesTable({ rows }: { rows: SampleExpense[] }) {
  return (
    <div className="table-frame">
      <table className="ops-table sample-data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Supplier</th>
            <th>Cost Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatShortDate(row.expenseDate)}</td>
              <td>{row.category}</td>
              <td>{row.supplier}</td>
              <td>{row.fixedOrVariable}</td>
              <td>{formatCurrency(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CapacityTable({ rows }: { rows: SampleCapacityPosition[] }) {
  return (
    <div className="table-frame">
      <table className="ops-table sample-data-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>On Hand</th>
            <th>Reorder Point</th>
            <th>Lead Time</th>
            <th>Unit Cost</th>
            <th>Risk Cover</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const riskCover = row.quantityOnHand <= row.reorderPoint ? "Below reorder point" : "Covered";

            return (
              <tr key={row.id}>
                <td>
                  <strong>{row.resourceName}</strong>
                  <span>{row.resourceCode}</span>
                </td>
                <td>{row.quantityOnHand}</td>
                <td>{row.reorderPoint}</td>
                <td>{row.leadTimeDays} days</td>
                <td>{formatCurrency(row.unitCost)}</td>
                <td>{riskCover}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TargetsTable({ rows }: { rows: SampleTarget[] }) {
  return (
    <div className="table-frame">
      <table className="ops-table sample-data-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Revenue Target</th>
            <th>Margin Target</th>
            <th>Coverage Target</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{formatShortDate(row.periodStart)}</strong>
                <span>through {formatShortDate(row.periodEnd)}</span>
              </td>
              <td>{formatCurrency(row.revenueTarget)}</td>
              <td>{formatPercent(row.grossMarginTarget)}</td>
              <td>{row.pipelineCoverageTarget.toFixed(2)}x</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SampleDataPage() {
  const sampleData = await getSampleData();

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Sample Data</p>
        <h1 className="page-title">Seeded source records</h1>
        <p className="page-description">
          Inspect the read-only Supabase demo records that feed the operating KPIs, forecasts, risk detection,
          AI report, and recommended actions.
        </p>
      </header>

      <section className="source-note" aria-label="Demo data notice">
        <strong>Safe seeded demo data</strong>
        <span>
          These tables are loaded from the project seed files for portfolio review. This page does not upload,
          edit, or mutate records.
        </span>
      </section>

      <SampleDataSection
        description="Order-level demo sales used to calculate revenue, average order value, and gross margin."
        outputLink="Drives revenue KPIs, gross margin, revenue forecast inputs, and margin pressure signals."
        rowCount={sampleData.salesOrders.length}
        title="Sales orders"
      >
        <SalesOrdersTable rows={sampleData.salesOrders} />
      </SampleDataSection>

      <SampleDataSection
        description="Open, won, and lost opportunities used for weighted pipeline and close-date risk checks."
        outputLink="Drives weighted pipeline, coverage, forecast context, and deal slippage risks."
        rowCount={sampleData.pipelineDeals.length}
        title="CRM pipeline"
      >
        <PipelineTable rows={sampleData.pipelineDeals} />
      </SampleDataSection>

      <SampleDataSection
        description="Operating costs grouped by category, supplier, and fixed or variable cost type."
        outputLink="Drives operating costs, net contribution, cash pressure, and expense risk signals."
        rowCount={sampleData.expenses.length}
        title="Expenses"
      >
        <ExpensesTable rows={sampleData.expenses} />
      </SampleDataSection>

      <SampleDataSection
        description="Inventory and capacity positions compared against reorder points and lead times."
        outputLink="Drives stock and capacity risks that can block near-term revenue."
        rowCount={sampleData.capacityPositions.length}
        title="Capacity / inventory"
      >
        <CapacityTable rows={sampleData.capacityPositions} />
      </SampleDataSection>

      <SampleDataSection
        description="Monthly commercial targets for revenue, gross margin, and pipeline coverage."
        outputLink="Drives revenue pacing, target coverage, and forecast comparison context."
        rowCount={sampleData.targets.length}
        title="Targets"
      >
        <TargetsTable rows={sampleData.targets} />
      </SampleDataSection>
    </>
  );
}
