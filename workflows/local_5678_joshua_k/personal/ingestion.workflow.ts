import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Commercial Ops Ingestion
// Nodes   : 7  |  Connections: 6
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ReceiveCommercialData              webhook
// ManualDemoTrigger                  manualTrigger
// BuildDemoPayload                   code
// ValidatePayload                    code
// CleanRows                          code
// WriteSalesOrdersAndLog             postgres                   [creds]
// RespondWithImportResult            code
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ReceiveCommercialData
//    → ValidatePayload
//      → CleanRows
//        → WriteSalesOrdersAndLog
//          → RespondWithImportResult
// ManualDemoTrigger
//    → BuildDemoPayload
//      → ValidatePayload (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'k8jxAQfrhxP7i3vQ',
    name: 'Commercial Ops Ingestion',
    active: true,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        callerPolicy: 'workflowsFromSameOwner',
        availableInMCP: true,
        binaryMode: 'separate',
        timeSavedMode: 'fixed',
    },
})
export class CommercialOpsIngestionWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '0b4078f1-e9af-445f-8569-632bc47fbbd1',
        webhookId: '990596ed-9ad6-4572-8a09-c5e6a26cbd4e',
        name: 'Receive Commercial Data',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 0],
    })
    ReceiveCommercialData = {
        httpMethod: 'POST',
        path: 'commercial-ops-ingestion',
        responseMode: 'lastNode',
        options: {},
    };

    @node({
        id: 'd1aa312d-9bda-4156-ba73-f59269b2cb2d',
        name: 'Manual Demo Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [0, 240],
    })
    ManualDemoTrigger = {};

    @node({
        id: 'f2ec2e31-1dd7-411a-82c2-4d6ef23a7dea',
        name: 'Build Demo Payload',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [240, 240],
    })
    BuildDemoPayload = {
        jsCode: `return [{
  json: {
    body: {
      source_name: 'manual_demo_sales_orders',
      source_type: 'sales_orders',
      file_name: 'manual-demo-sales-orders.json',
      rows: [
        {
          order_date: '2026-04-06',
          customer: 'Acme Outdoor',
          product: 'Starter Kit',
          sku: 'SKU-001',
          units: 12,
          revenue: 2400,
          discount: 100,
          channel: 'direct',
          unit_cost: 90
        },
        {
          order_date: '2026-04-07',
          customer: 'Northstar Wholesale',
          product: 'Expansion Pack',
          sku: 'SKU-003',
          units: 9,
          revenue: 3150,
          discount: 0,
          channel: 'wholesale',
          unit_cost: 180
        }
      ]
    }
  }
}];`,
    };

    @node({
        id: 'a7e15d0f-3ebf-4343-bc32-e0d6d34a411f',
        name: 'Validate Payload',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [528, 128],
    })
    ValidatePayload = {
        jsCode: `const firstItem = $input.first();
const body = firstItem.json.body ?? firstItem.json;

if (!body || typeof body !== 'object') {
  throw new Error('Payload must be a JSON object');
}

if (body.source_type !== 'sales_orders') {
  throw new Error('Only source_type "sales_orders" is supported by this MVP ingestion workflow');
}

if (!Array.isArray(body.rows) || body.rows.length === 0) {
  throw new Error('Payload must include at least one sales_orders row');
}

const cleanLabel = (value, fallback) => String(value || fallback)
  .slice(0, 120)
  .replace(/[^a-zA-Z0-9_. -]/g, '_');

return [{
  json: {
    source_name: cleanLabel(body.source_name, 'commercial_ops_upload'),
    source_type: 'sales_orders',
    file_name: cleanLabel(body.file_name, 'webhook-sales-orders.json'),
    rows_received: body.rows.length,
    raw_rows: body.rows
  }
}];`,
    };

    @node({
        id: '745b5dff-44e9-4b80-8086-2af5cc66ba95',
        name: 'Clean Rows',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [800, 128],
    })
    CleanRows = {
        jsCode: `const item = $input.first().json;
const required = ['order_date', 'customer', 'product', 'sku', 'units', 'revenue', 'channel', 'unit_cost'];
const cleanRows = [];
const invalidRows = [];

for (const [index, row] of item.raw_rows.entries()) {
  const missing = required.filter((field) => row[field] === undefined || row[field] === null || row[field] === '');
  const units = Number(row.units);
  const revenue = Number(row.revenue);
  const discount = Number(row.discount || 0);
  const unitCost = Number(row.unit_cost);
  const orderDate = String(row.order_date || '');

  if (
    missing.length > 0 ||
    Number.isNaN(units) ||
    Number.isNaN(revenue) ||
    Number.isNaN(discount) ||
    Number.isNaN(unitCost) ||
    !/^\\d{4}-\\d{2}-\\d{2}$/.test(orderDate)
  ) {
    invalidRows.push({ row_index: index, missing });
    continue;
  }

  cleanRows.push({
    order_date: orderDate,
    customer: String(row.customer).trim(),
    product: String(row.product).trim(),
    sku: String(row.sku).trim(),
    units,
    revenue,
    discount,
    channel: String(row.channel).trim(),
    unit_cost: unitCost
  });
}

if (cleanRows.length === 0) {
  throw new Error('No valid sales_orders rows were found in the payload');
}

return [{
  json: {
    source_name: item.source_name,
    source_type: item.source_type,
    file_name: item.file_name,
    rows_received: item.rows_received,
    rows_failed: invalidRows.length,
    status: invalidRows.length > 0 ? 'failed' : 'succeeded',
    error_summary: invalidRows.length > 0 ? JSON.stringify(invalidRows) : null,
    clean_rows: cleanRows
  }
}];`,
    };

    @node({
        id: '5c003489-2769-487c-b67e-9cee84d15c61',
        name: 'Write Sales Orders and Log',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1088, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    WriteSalesOrdersAndLog = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'raw_uploads',
        },
        query: `WITH upload AS (
  INSERT INTO raw_uploads (
    source_name,
    source_type,
    file_name,
    status,
    rows_received,
    rows_imported,
    rows_failed,
    error_summary
  )
  VALUES (
    '{{ $json.source_name }}',
    '{{ $json.source_type }}',
    '{{ $json.file_name }}',
    '{{ $json.status }}',
    {{ $json.rows_received }},
    {{ $json.clean_rows.length }},
    {{ $json.rows_failed }},
    {{ $json.error_summary ? "'" + $json.error_summary.replace(/'/g, "''") + "'" : 'NULL' }}
  )
  RETURNING id, status, rows_received, rows_failed
),
clean_rows AS (
  SELECT *
  FROM jsonb_to_recordset('{{ JSON.stringify($json.clean_rows).replace(/'/g, "''") }}'::jsonb) AS row(
    order_date date,
    customer text,
    product text,
    sku text,
    units integer,
    revenue numeric,
    discount numeric,
    channel text,
    unit_cost numeric
  )
),
inserted AS (
  INSERT INTO sales_orders (
    raw_upload_id,
    order_date,
    customer,
    product,
    sku,
    units,
    revenue,
    discount,
    channel,
    unit_cost
  )
  SELECT
    upload.id,
    clean_rows.order_date,
    clean_rows.customer,
    clean_rows.product,
    clean_rows.sku,
    clean_rows.units,
    clean_rows.revenue,
    clean_rows.discount,
    clean_rows.channel,
    clean_rows.unit_cost
  FROM upload, clean_rows
  RETURNING id
),
insert_count AS (
  SELECT count(*)::int AS rows_imported FROM inserted
),
logged AS (
  INSERT INTO action_log (action_type, target, status, payload, result)
  SELECT
    'ingestion',
    '{{ $json.source_type }}',
    upload.status,
    jsonb_build_object(
      'source_name', '{{ $json.source_name }}',
      'file_name', '{{ $json.file_name }}',
      'rows_received', upload.rows_received
    ),
    jsonb_build_object(
      'raw_upload_id', upload.id,
      'rows_imported', insert_count.rows_imported,
      'rows_failed', upload.rows_failed
    )
  FROM upload, insert_count
  RETURNING id
)
SELECT
  upload.id::text AS raw_upload_id,
  logged.id::text AS action_log_id,
  upload.status,
  upload.rows_received,
  insert_count.rows_imported,
  upload.rows_failed
FROM upload, insert_count, logged;`,
        options: {},
    };

    @node({
        id: '2b1d4cda-e42d-44c5-9e04-35085aad9638',
        name: 'Respond With Import Result',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1360, 128],
    })
    RespondWithImportResult = {
        jsCode: `const result = $input.first().json;

return [{
  json: {
    ok: result.status === 'succeeded',
    raw_upload_id: result.raw_upload_id,
    action_log_id: result.action_log_id,
    status: result.status,
    rows_received: Number(result.rows_received),
    rows_imported: Number(result.rows_imported),
    rows_failed: Number(result.rows_failed),
    message: result.status === 'succeeded'
      ? 'Sales orders ingested successfully'
      : 'Sales orders ingested with rejected rows'
  }
}];`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ReceiveCommercialData.out(0).to(this.ValidatePayload.in(0));
        this.ManualDemoTrigger.out(0).to(this.BuildDemoPayload.in(0));
        this.BuildDemoPayload.out(0).to(this.ValidatePayload.in(0));
        this.ValidatePayload.out(0).to(this.CleanRows.in(0));
        this.CleanRows.out(0).to(this.WriteSalesOrdersAndLog.in(0));
        this.WriteSalesOrdersAndLog.out(0).to(this.RespondWithImportResult.in(0));
    }
}
