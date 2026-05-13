-- =============================================================================
-- 0006c — Feedback Metrics RPC
-- =============================================================================
-- Additive: CREATE FUNCTION only — no table changes, no data modifications
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_feedback_metrics(
  p_company_id uuid,
  p_date_from date DEFAULT (CURRENT_DATE - INTERVAL '6 months')::date,
  p_date_to date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total_requests  int;
  v_total_responses int;
  v_avg_hours       numeric;
  v_pct_on_time     numeric;
  v_decline_rate    numeric;
  v_avg_per_user    numeric;
  v_requesters      int;
  v_members         int;
  v_monthly         jsonb;
  v_competencies    jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total_requests
  FROM feedback_requests
  WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_date_from AND p_date_to;

  SELECT COUNT(*) INTO v_total_responses
  FROM feedback_requests
  WHERE company_id = p_company_id
    AND status = 'answered'
    AND created_at::date BETWEEN p_date_from AND p_date_to;

  SELECT COALESCE(
    ROUND(AVG(EXTRACT(EPOCH FROM (answered_at - created_at)) / 3600)::numeric, 1),
    0
  ) INTO v_avg_hours
  FROM feedback_requests
  WHERE company_id = p_company_id
    AND status = 'answered'
    AND answered_at IS NOT NULL
    AND created_at::date BETWEEN p_date_from AND p_date_to;

  SELECT COALESCE(
    ROUND(
      COUNT(*) FILTER (
        WHERE status = 'answered'
          AND due_date IS NOT NULL
          AND answered_at::date <= due_date
      ) * 100.0 /
      NULLIF(COUNT(*) FILTER (
        WHERE due_date IS NOT NULL
          AND status IN ('answered', 'expired')
      ), 0)::numeric,
    1),
    0
  ) INTO v_pct_on_time
  FROM feedback_requests
  WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_date_from AND p_date_to;

  SELECT COALESCE(
    ROUND(
      COUNT(*) FILTER (WHERE status = 'declined') * 100.0 /
      NULLIF(COUNT(*), 0)::numeric,
    1),
    0
  ) INTO v_decline_rate
  FROM feedback_requests
  WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_date_from AND p_date_to;

  SELECT COALESCE(ROUND(AVG(cnt)::numeric, 1), 0) INTO v_avg_per_user
  FROM (
    SELECT COUNT(*) AS cnt
    FROM feedback_requests
    WHERE company_id = p_company_id
      AND created_at::date BETWEEN p_date_from AND p_date_to
    GROUP BY requester_id
  ) sub;

  SELECT COUNT(DISTINCT requester_id) INTO v_requesters
  FROM feedback_requests
  WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_date_from AND p_date_to;

  SELECT COUNT(*) INTO v_members
  FROM company_memberships
  WHERE company_id = p_company_id AND status = 'active';

  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'month'), '[]'::jsonb) INTO v_monthly
  FROM (
    SELECT jsonb_build_object(
      'month',    TO_CHAR(m, 'YYYY-MM'),
      'requests', COALESCE(r.cnt, 0),
      'answered', COALESCE(a.cnt, 0),
      'declined', COALESCE(d.cnt, 0),
      'expired',  COALESCE(e.cnt, 0)
    ) AS row
    FROM generate_series(
      date_trunc('month', p_date_from::timestamp),
      date_trunc('month', p_date_to::timestamp),
      '1 month'::interval
    ) AS m
    LEFT JOIN (
      SELECT date_trunc('month', created_at) AS mo, COUNT(*) AS cnt
      FROM feedback_requests WHERE company_id = p_company_id GROUP BY 1
    ) r ON r.mo = m
    LEFT JOIN (
      SELECT date_trunc('month', created_at) AS mo, COUNT(*) AS cnt
      FROM feedback_requests WHERE company_id = p_company_id AND status = 'answered' GROUP BY 1
    ) a ON a.mo = m
    LEFT JOIN (
      SELECT date_trunc('month', created_at) AS mo, COUNT(*) AS cnt
      FROM feedback_requests WHERE company_id = p_company_id AND status = 'declined' GROUP BY 1
    ) d ON d.mo = m
    LEFT JOIN (
      SELECT date_trunc('month', created_at) AS mo, COUNT(*) AS cnt
      FROM feedback_requests WHERE company_id = p_company_id AND status = 'expired' GROUP BY 1
    ) e ON e.mo = m
  ) sub;

  SELECT COALESCE(jsonb_agg(sub ORDER BY sub->>'cnt' DESC), '[]'::jsonb) INTO v_competencies
  FROM (
    SELECT jsonb_build_object('name', tag_name, 'cnt', COUNT(*)) AS sub
    FROM (
      SELECT
        CASE
          WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}'
          WHEN jsonb_typeof(elem) = 'object' THEN elem->>'label'
          ELSE NULL
        END AS tag_name
      FROM feedback_requests fr,
           jsonb_array_elements(fr.competency_tags) AS elem
      WHERE fr.company_id = p_company_id
        AND fr.created_at::date BETWEEN p_date_from AND p_date_to
    ) tags
    WHERE tag_name IS NOT NULL AND tag_name <> ''
    GROUP BY tag_name
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) sub;

  RETURN jsonb_build_object(
    'total_requests',      v_total_requests,
    'total_responses',     v_total_responses,
    'avg_response_hours',  v_avg_hours,
    'pct_answered_on_time',v_pct_on_time,
    'decline_rate',        v_decline_rate,
    'avg_requests_per_user',v_avg_per_user,
    'distinct_requesters', v_requesters,
    'total_members',       v_members,
    'adoption_pct',        CASE WHEN v_members > 0
                             THEN ROUND((v_requesters * 100.0 / v_members)::numeric, 1)
                             ELSE 0 END,
    'monthly',             v_monthly,
    'competencies',        v_competencies
  );
END;
$$;
