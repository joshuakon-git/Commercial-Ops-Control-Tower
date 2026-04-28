import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Commercial Ops Action Automation
// Nodes   : 10  |  Connections: 10
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ManualDemoTrigger                  manualTrigger
// ActionAutomationSchedule           scheduleTrigger
// QueryNewHighRisks                  postgres                   [creds]
// ClassifyActions                    code
// HasActionsToCreate                 if
// InsertRecommendedActions           postgres                   [creds]
// CreatedActions                     if
// SendSlackAlert                     slack                      [creds]
// WriteActionLog                     postgres                   [creds]
// LogNoActions                       postgres                   [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ManualDemoTrigger
//    → QueryNewHighRisks
//      → ClassifyActions
//        → HasActionsToCreate
//          → InsertRecommendedActions
//            → CreatedActions
//              → SendSlackAlert
//                → WriteActionLog
//             .out(1) → LogNoActions
//         .out(1) → LogNoActions (↩ loop)
// ActionAutomationSchedule
//    → QueryNewHighRisks (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'zLSmXRKeh51hJjhO',
    name: 'Commercial Ops Action Automation',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true, callerPolicy: 'workflowsFromSameOwner' },
})
export class CommercialOpsActionAutomationWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '5f84e41a-01e8-4744-a1d5-8c652f06f0dd',
        name: 'Manual Demo Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [0, 240],
    })
    ManualDemoTrigger = {};

    @node({
        id: '8c20229d-a804-4f7f-a6f5-5ce1a78e310e',
        name: 'Action Automation Schedule',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.3,
        position: [0, 0],
    })
    ActionAutomationSchedule = {
        rule: {
            interval: [
                {
                    field: 'hours',
                    hoursInterval: 1,
                },
            ],
        },
    };

    @node({
        id: 'b84575ec-cc4f-4cf3-a430-29aed1e07f11',
        name: 'Query New High Risks',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [304, 128],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    QueryNewHighRisks = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'risk_events',
        },
        query: `WITH pending_risks AS (
  SELECT
    risk.id,
    risk.risk_type,
    risk.severity,
    risk.status,
    risk.dedupe_key,
    risk.metric_name,
    risk.metric_value,
    risk.threshold_value,
    risk.title,
    risk.explanation,
    risk.recommended_action,
    risk.source_table,
    risk.source_record_id,
    risk.detected_at
  FROM risk_events risk
  WHERE risk.severity = 'high'
    AND risk.status IN ('open', 'acknowledged')
    AND NOT EXISTS (
      SELECT 1
      FROM recommended_actions action
      WHERE action.risk_event_id = risk.id
    )
  ORDER BY risk.detected_at ASC
  LIMIT 20
)
SELECT
  COALESCE(jsonb_agg(jsonb_build_object(
    'risk_event_id', id::text,
    'risk_type', risk_type,
    'severity', severity,
    'status', status,
    'dedupe_key', dedupe_key,
    'metric_name', metric_name,
    'metric_value', metric_value,
    'threshold_value', threshold_value,
    'title', title,
    'explanation', explanation,
    'recommended_action', recommended_action,
    'source_table', source_table,
    'source_record_id', source_record_id::text,
    'detected_at', detected_at
  ) ORDER BY detected_at ASC), '[]'::jsonb) AS pending_risks,
  COUNT(*)::int AS pending_risk_count,
  now() AS checked_at
FROM pending_risks;`,
        options: {},
    };

    @node({
        id: 'c033cb7e-807e-4434-9b04-7e095310750b',
        name: 'Classify Actions',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [608, 128],
    })
    ClassifyActions = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const input = $input.first().json;

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return JSON.parse(value);
  }

  return [];
}

const risks = parseJsonArray(input.pending_risks);
const dueDate = new Date();
dueDate.setUTCDate(dueDate.getUTCDate() + 3);
const dueDateIso = dueDate.toISOString().slice(0, 10);

const actions = risks.map((risk) => {
  const title = String(risk.title || 'High commercial risk').trim();
  const actionText = String(risk.recommended_action || 'Review and assign an owner for this risk.').trim();
  const explanation = String(risk.explanation || '').trim();

  return {
    risk_event_id: risk.risk_event_id,
    risk_title: title,
    risk_type: risk.risk_type || 'unknown',
    severity: risk.severity || 'high',
    title: 'Act on: ' + title,
    description: [explanation, actionText].filter(Boolean).join('\\n\\nRecommended action: '),
    owner: 'Commercial Ops',
    priority: 'high',
    due_date: dueDateIso
  };
});

const previewLines = actions.slice(0, 10).map((action, index) => (
  String(index + 1) + '. ' + action.title + ' - due ' + action.due_date
));

const overflowCount = Math.max(actions.length - previewLines.length, 0);
const slackText = actions.length > 0
  ? [
      ':rotating_light: Created ' + actions.length + ' recommended action' + (actions.length === 1 ? '' : 's') + ' for high-severity commercial risk' + (actions.length === 1 ? '' : 's') + '.',
      ...previewLines,
      overflowCount > 0 ? '...and ' + overflowCount + ' more.' : ''
    ].filter(Boolean).join('\\n')
  : 'No new high-severity commercial risks need recommended actions.';

return [{
  json: {
    checked_at: input.checked_at,
    pending_risk_count: Number(input.pending_risk_count || 0),
    action_count: actions.length,
    has_actions: actions.length > 0,
    source_risk_ids: actions.map((action) => action.risk_event_id),
    actions,
    slack_text: slackText
  }
}];`,
    };

    @node({
        id: '78e5e527-fca0-42e8-8f80-08dedb77a25f',
        name: 'Has Actions To Create?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [912, 128],
    })
    HasActionsToCreate = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'a7d3f111-728a-42e9-b9c7-d910ebb39974',
                    leftValue: '={{ $json.has_actions }}',
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
        id: '0961e86a-f345-4009-8202-3386308908a8',
        name: 'Insert Recommended Actions',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1216, 48],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    InsertRecommendedActions = {
        operation: 'executeQuery',
        schema: {
            mode: 'list',
            value: 'public',
        },
        table: {
            mode: 'list',
            value: 'recommended_actions',
        },
        query: `WITH input_actions AS (
  SELECT *
  FROM jsonb_to_recordset('{{ JSON.stringify($json.actions).replace(/'/g, "''") }}'::jsonb) AS action(
    risk_event_id uuid,
    risk_title text,
    risk_type text,
    severity text,
    title text,
    description text,
    owner text,
    priority text,
    due_date date
  )
),
inserted AS (
  INSERT INTO recommended_actions (
    risk_event_id,
    title,
    description,
    owner,
    priority,
    status,
    due_date
  )
  SELECT
    input_actions.risk_event_id,
    input_actions.title,
    input_actions.description,
    input_actions.owner,
    input_actions.priority,
    'open',
    input_actions.due_date
  FROM input_actions
  WHERE NOT EXISTS (
    SELECT 1
    FROM recommended_actions existing
    WHERE existing.risk_event_id = input_actions.risk_event_id
  )
  RETURNING
    id,
    risk_event_id,
    title,
    owner,
    priority,
    status,
    due_date,
    created_at
)
SELECT
  COUNT(*)::int AS created_action_count,
  COUNT(*) > 0 AS has_created_actions,
  COALESCE(jsonb_agg(jsonb_build_object(
    'recommended_action_id', inserted.id::text,
    'risk_event_id', inserted.risk_event_id::text,
    'title', inserted.title,
    'owner', inserted.owner,
    'priority', inserted.priority,
    'status', inserted.status,
    'due_date', inserted.due_date,
    'created_at', inserted.created_at
  ) ORDER BY inserted.created_at ASC), '[]'::jsonb) AS created_actions,
  '{{ JSON.stringify($json.source_risk_ids).replace(/'/g, "''") }}'::jsonb AS source_risk_ids,
  '{{ $json.slack_text.replace(/'/g, "''") }}' AS slack_text
FROM inserted;`,
        options: {},
    };

    @node({
        id: 'ab1cfada-6deb-41ca-bab4-1ae13259a6eb',
        name: 'Created Actions?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1520, 48],
    })
    CreatedActions = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'b7fd49b2-6df9-44fd-8cd1-19407bf2a67f',
                    leftValue: '={{ $json.has_created_actions }}',
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
        id: '7d65f1d6-d442-4db0-a506-46252d931b8d',
        name: 'Send Slack Alert',
        type: 'n8n-nodes-base.slack',
        version: 2.4,
        position: [1824, 48],
        credentials: { slackApi: { id: 'gebE7pIXkCFMMbOP', name: 'Slack account- portfolio' } },
    })
    SendSlackAlert = {
        resource: 'message',
        operation: 'post',
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
        id: '1342b8e4-3992-4e96-843b-8d2dc1d417d4',
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
  'action_automation',
  'recommended_actions,slack',
  'succeeded',
  jsonb_build_object(
    'source_risk_ids', '{{ JSON.stringify($("Insert Recommended Actions").item.json.source_risk_ids).replace(/'/g, "''") }}'::jsonb,
    'created_action_count', {{ $("Insert Recommended Actions").item.json.created_action_count }}
  ),
  jsonb_build_object(
    'created_actions', '{{ JSON.stringify($("Insert Recommended Actions").item.json.created_actions).replace(/'/g, "''") }}'::jsonb,
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
        id: 'f8951170-c724-4cd3-8f6f-712d276f09c7',
        name: 'Log No Actions',
        type: 'n8n-nodes-base.postgres',
        version: 2.6,
        position: [1216, 304],
        credentials: { postgres: { id: 'cjKLi4kH3enKNzgh', name: 'AI Commercial Ops Control Tower' } },
    })
    LogNoActions = {
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
  'action_automation',
  'recommended_actions',
  'succeeded',
  jsonb_build_object(
    'checked_at', '{{ $json.checked_at || $now.toISO() }}',
    'pending_risk_count', {{ $json.pending_risk_count || 0 }},
    'source_risk_ids', '{{ JSON.stringify($json.source_risk_ids || []).replace(/'/g, "''") }}'::jsonb
  ),
  jsonb_build_object(
    'created_action_count', {{ $json.created_action_count || $json.action_count || 0 }},
    'message', 'No new recommended actions were created'
  )
)
RETURNING
  id::text AS action_log_id,
  status,
  target,
  created_at;`,
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ManualDemoTrigger.out(0).to(this.QueryNewHighRisks.in(0));
        this.ActionAutomationSchedule.out(0).to(this.QueryNewHighRisks.in(0));
        this.QueryNewHighRisks.out(0).to(this.ClassifyActions.in(0));
        this.ClassifyActions.out(0).to(this.HasActionsToCreate.in(0));
        this.HasActionsToCreate.out(0).to(this.InsertRecommendedActions.in(0));
        this.HasActionsToCreate.out(1).to(this.LogNoActions.in(0));
        this.InsertRecommendedActions.out(0).to(this.CreatedActions.in(0));
        this.CreatedActions.out(0).to(this.SendSlackAlert.in(0));
        this.CreatedActions.out(1).to(this.LogNoActions.in(0));
        this.SendSlackAlert.out(0).to(this.WriteActionLog.in(0));
    }
}
