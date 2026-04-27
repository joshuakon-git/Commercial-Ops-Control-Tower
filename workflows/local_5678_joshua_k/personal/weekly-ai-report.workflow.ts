import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Commercial Ops Weekly AI Report
// Nodes   : 11  |  Connections: 10
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ManualDemoTrigger                  manualTrigger
// WeeklyMondaySchedule               scheduleTrigger
// PullStructuredPayload              postgres                   [creds]
// OpenaiJsonSummary                  openAi                     [creds]
// ValidateJson                       code
// JsonIsValid                        if
// SaveAiReports                      postgres                   [creds]
// SendSlack                          slack                      [creds]
// WriteActionLog                     postgres                   [creds]
// LogInvalidAiResponse               postgres                   [creds]
// FailInvalidAiResponse              code
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ManualDemoTrigger
//    → PullStructuredPayload
//      → OpenaiJsonSummary
//        → ValidateJson
//          → JsonIsValid
//            → SaveAiReports
//              → SendSlack
//                → WriteActionLog
//           .out(1) → LogInvalidAiResponse
//              → FailInvalidAiResponse
// WeeklyMondaySchedule
//    → PullStructuredPayload (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'NwsCx9dJMP1uOYOc',
    name: 'Commercial Ops Weekly AI Report',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true, callerPolicy: 'workflowsFromSameOwner' },
})
export class CommercialOpsWeeklyAiReportWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'b5922725-389d-4c9e-b507-364c19be9767',
        name: 'Manual Demo Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [0, 240],
    })
    ManualDemoTrigger = {};

    @node({
        id: '014a6a3f-ccdc-4884-abac-9a0e71c88bdb',
        name: 'Weekly Monday Schedule',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.3,
        position: [0, 0],
    })
    WeeklyMondaySchedule = {
        rule: {
            interval: [
                {
                    field: 'weeks',
                    weeksInterval: 1,
                    triggerAtDay: '1',
                    triggerAtHour: '9',
                    triggerAtMinute: 0,
                },
            ],
        },
    };

    @node({
        id: 'b5e2128c-0d9d-43af-807b-ea135b350061',
        name: 'Pull Structured Payload',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [304, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    PullStructuredPayload = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'ai_reports',
        },
        query: `WITH bounds AS (
  SELECT
    (current_date - interval '6 days')::date AS report_period_start,
    current_date::date AS report_period_end
),
latest_metrics AS (
  SELECT to_jsonb(metric_snapshots) - 'id' - 'created_at' AS payload
  FROM metric_snapshots
  ORDER BY snapshot_date DESC, created_at DESC
  LIMIT 1
),
recent_forecasts AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'forecast_date', forecast_date,
    'forecast_type', forecast_type,
    'period_start', period_start,
    'period_end', period_end,
    'predicted_value', predicted_value,
    'lower_bound', lower_bound,
    'upper_bound', upper_bound,
    'method', method,
    'inputs_summary', inputs_summary
  ) ORDER BY forecast_date DESC, created_at DESC), '[]'::jsonb) AS payload
  FROM (
    SELECT *
    FROM forecasts
    ORDER BY forecast_date DESC, created_at DESC
    LIMIT 6
  ) forecasts
),
open_risks AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'risk_type', risk_type,
    'severity', severity,
    'status', status,
    'metric_name', metric_name,
    'metric_value', metric_value,
    'threshold_value', threshold_value,
    'title', title,
    'explanation', explanation,
    'recommended_action', recommended_action,
    'detected_at', detected_at
  ) ORDER BY detected_at DESC), '[]'::jsonb) AS payload
  FROM (
    SELECT *
    FROM risk_events
    WHERE status IN ('open', 'acknowledged')
    ORDER BY
      CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      detected_at DESC
    LIMIT 10
  ) risk_events
),
open_actions AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'title', title,
    'description', description,
    'owner', owner,
    'priority', priority,
    'status', status,
    'due_date', due_date
  ) ORDER BY due_date NULLS LAST, created_at DESC), '[]'::jsonb) AS payload
  FROM (
    SELECT *
    FROM recommended_actions
    WHERE status IN ('open', 'in_progress')
    ORDER BY due_date NULLS LAST, created_at DESC
    LIMIT 10
  ) recommended_actions
)
SELECT
  bounds.report_period_start,
  bounds.report_period_end,
  jsonb_build_object(
    'latest_metrics', COALESCE((SELECT payload FROM latest_metrics), '{}'::jsonb),
    'forecasts', COALESCE((SELECT payload FROM recent_forecasts), '[]'::jsonb),
    'open_risks', COALESCE((SELECT payload FROM open_risks), '[]'::jsonb),
    'recommended_actions', COALESCE((SELECT payload FROM open_actions), '[]'::jsonb)
  ) AS prompt_payload
FROM bounds;`,
        options: {},
    };

    @node({
        id: '61ac9da1-4af7-4404-af86-d22d918803f5',
        name: 'OpenAI JSON Summary',
        type: 'n8n-nodes-base.openAi',
        version: 1.1,
        position: [608, 128],
        credentials: { openAiApi: { id: 'k6iDtzHJ97j20t2X', name: 'OpenAi account 2' } },
    })
    OpenaiJsonSummary = {
        resource: 'chat',
        operation: 'complete',
        chatModel: 'gpt-4o-mini',
        prompt: {
            messages: [
                {
                    role: 'system',
                    content:
                        'You are an operations analyst for a small business. Use only the supplied structured metrics, forecasts, risk events, and recommended actions. Do not invent causes, figures, or actions that are not supported by the payload. Return valid JSON only.',
                },
                {
                    role: 'user',
                    content:
                        "={{ 'Create a weekly commercial ops report for ' + $json.report_period_start + ' through ' + $json.report_period_end + '. The payload has exactly these top-level keys: latest_metrics, forecasts, open_risks, recommended_actions. Do not request or infer raw operational tables. Return only a JSON object with these string fields: summary, what_changed, needs_attention, likely_causes, recommended_actions, next_7_days_priorities, slack_text. Payload: ' + JSON.stringify($json.prompt_payload) }}",
                },
            ],
        },
        simplifyOutput: true,
        options: {},
    };

    @node({
        id: '843762a5-f587-4a32-9c6b-a72b207be8c7',
        name: 'Validate JSON',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [912, 128],
    })
    ValidateJson = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const requiredFields = [
  'summary',
  'what_changed',
  'needs_attention',
  'likely_causes',
  'recommended_actions',
  'next_7_days_priorities',
  'slack_text'
];

const input = $input.first().json;

function extractText(value) {
  if (typeof value === 'string') return value;
  if (typeof value?.text === 'string') return value.text;
  if (typeof value?.output === 'string') return value.output;
  if (typeof value?.message?.content === 'string') return value.message.content;
  if (Array.isArray(value?.choices) && typeof value.choices[0]?.message?.content === 'string') {
    return value.choices[0].message.content;
  }
  if (Array.isArray(value?.data) && typeof value.data[0]?.text === 'string') return value.data[0].text;
  return '';
}

function cleanJsonText(text) {
  const fence = String.fromCharCode(96, 96, 96);
  let cleaned = String(text || '').trim();
  if (cleaned.toLowerCase().startsWith(fence + 'json')) {
    cleaned = cleaned.slice((fence + 'json').length).trim();
  } else if (cleaned.startsWith(fence)) {
    cleaned = cleaned.slice(fence.length).trim();
  }
  if (cleaned.endsWith(fence)) {
    cleaned = cleaned.slice(0, -fence.length).trim();
  }
  return cleaned;
}

const raw_response = extractText(input);
const cleaned = cleanJsonText(raw_response);

try {
  const parsed = JSON.parse(cleaned);
  const invalidFields = requiredFields.filter((field) => (
    typeof parsed[field] !== 'string' || parsed[field].trim().length === 0
  ));

  if (invalidFields.length > 0) {
    return [{
      json: {
        is_valid: false,
        validation_error: 'OpenAI JSON is missing required non-empty string fields: ' + invalidFields.join(', '),
        raw_response
      }
    }];
  }

  return [{
    json: {
      is_valid: true,
      model: 'gpt-4o-mini',
      ...Object.fromEntries(requiredFields.map((field) => [field, parsed[field].trim()])),
      raw_response
    }
  }];
} catch (error) {
  return [{
    json: {
      is_valid: false,
      validation_error: 'OpenAI response was not valid JSON: ' + error.message,
      raw_response
    }
  }];
}`,
    };

    @node({
        id: 'a0e38d4c-67cc-4de3-987b-209515c086d8',
        name: 'JSON Is Valid?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1216, 128],
    })
    JsonIsValid = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: '7b859c03-d9ab-4184-9e4e-e6cae308970e',
                    leftValue: '={{ $json.is_valid }}',
                    rightValue: true,
                    operator: {
                        type: 'boolean',
                        operation: 'true',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: 'd06e87a7-45d2-4285-9ec4-a7b787a0dfaf',
        name: 'Save ai_reports',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1520, 48],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    SaveAiReports = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'ai_reports',
        },
        query: `INSERT INTO ai_reports (
  report_period_start,
  report_period_end,
  summary,
  what_changed,
  needs_attention,
  likely_causes,
  recommended_actions,
  next_7_days_priorities,
  slack_text,
  model,
  input_payload
)
VALUES (
  '{{ $("Pull Structured Payload").item.json.report_period_start }}'::date,
  '{{ $("Pull Structured Payload").item.json.report_period_end }}'::date,
  '{{ $json.summary.replace(/'/g, "''") }}',
  '{{ $json.what_changed.replace(/'/g, "''") }}',
  '{{ $json.needs_attention.replace(/'/g, "''") }}',
  '{{ $json.likely_causes.replace(/'/g, "''") }}',
  '{{ $json.recommended_actions.replace(/'/g, "''") }}',
  '{{ $json.next_7_days_priorities.replace(/'/g, "''") }}',
  '{{ $json.slack_text.replace(/'/g, "''") }}',
  '{{ $json.model }}',
  '{{ JSON.stringify($("Pull Structured Payload").item.json.prompt_payload).replace(/'/g, "''") }}'::jsonb
)
RETURNING
  id::text AS ai_report_id,
  report_period_start,
  report_period_end,
  summary,
  slack_text,
  model,
  created_at;`,
        options: {},
    };

    @node({
        id: '32561387-aa00-406c-b6e2-d90829c99323',
        name: 'Send Slack',
        type: 'n8n-nodes-base.slack',
        version: 2.4,
        position: [1824, 48],
        credentials: { slackApi: { id: 'gebE7pIXkCFMMbOP', name: 'Slack account- portfolio' } },
    })
    SendSlack = {
        text: '={{ $json.slack_text }}',
        select: 'channel',
        channelId: {
            __rl: true,
            mode: 'id',
            value: '={{ $env.SLACK_CHANNEL_ID }}',
            cachedResultName: 'SLACK_CHANNEL_ID',
        },
        otherOptions: {},
    };

    @node({
        id: '3cc0de98-5bf7-408b-bcff-f4228b7ed7d2',
        name: 'Write action_log',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [2128, 48],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    WriteActionLog = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'action_log',
        },
        query: `INSERT INTO action_log (
  action_type,
  target,
  status,
  payload,
  result
)
VALUES (
  'weekly_ai_report',
  'ai_reports,slack',
  'succeeded',
  jsonb_build_object(
    'report_period_start', '{{ $("Save ai_reports").item.json.report_period_start }}',
    'report_period_end', '{{ $("Save ai_reports").item.json.report_period_end }}',
    'ai_report_id', '{{ $("Save ai_reports").item.json.ai_report_id }}'
  ),
  jsonb_build_object(
    'model', '{{ $("Save ai_reports").item.json.model }}',
    'slack_response', '{{ JSON.stringify($json).replace(/'/g, "''") }}'::jsonb
  )
)
RETURNING
  id::text AS action_log_id,
  status,
  target,
  created_at;`,
        options: {},
    };

    @node({
        id: 'cddfed8c-104a-4c26-9865-09c9933d7690',
        name: 'Log Invalid AI Response',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1520, 256],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    LogInvalidAiResponse = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'action_log',
        },
        query: `INSERT INTO action_log (
  action_type,
  target,
  status,
  payload,
  result
)
VALUES (
  'weekly_ai_report',
  'ai_reports',
  'failed',
  jsonb_build_object(
    'report_period_start', '{{ $("Pull Structured Payload").item.json.report_period_start }}',
    'report_period_end', '{{ $("Pull Structured Payload").item.json.report_period_end }}',
    'validation_error', '{{ $json.validation_error.replace(/'/g, "''") }}'
  ),
  jsonb_build_object(
    'raw_response', '{{ JSON.stringify($json.raw_response || "").replace(/'/g, "''") }}'::jsonb
  )
)
RETURNING
  id::text AS action_log_id,
  status,
  target,
  '{{ $json.validation_error.replace(/'/g, "''") }}' AS validation_error,
  created_at;`,
        options: {},
    };

    @node({
        id: '7b859c03-d9ab-4184-9e4e-e6cae308970e',
        name: 'Fail Invalid AI Response',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1824, 256],
    })
    FailInvalidAiResponse = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const error = $input.first().json.validation_error || 'OpenAI returned invalid report JSON';
throw new Error(error);`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ManualDemoTrigger.out(0).to(this.PullStructuredPayload.in(0));
        this.WeeklyMondaySchedule.out(0).to(this.PullStructuredPayload.in(0));
        this.PullStructuredPayload.out(0).to(this.OpenaiJsonSummary.in(0));
        this.OpenaiJsonSummary.out(0).to(this.ValidateJson.in(0));
        this.ValidateJson.out(0).to(this.JsonIsValid.in(0));
        this.JsonIsValid.out(0).to(this.SaveAiReports.in(0));
        this.JsonIsValid.out(1).to(this.LogInvalidAiResponse.in(0));
        this.SaveAiReports.out(0).to(this.SendSlack.in(0));
        this.SendSlack.out(0).to(this.WriteActionLog.in(0));
        this.LogInvalidAiResponse.out(0).to(this.FailInvalidAiResponse.in(0));
    }
}
