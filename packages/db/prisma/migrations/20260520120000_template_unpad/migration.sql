-- ============================================================================
-- FlooringTemplate: drop the zero-padding on templateNumber
--
-- Old default: 'TP-' || lpad(nextval('flooring_template_number_seq')::text, 5, '0')
--   → produced TP-00001, TP-00002, ...
-- New default: 'TP-' || nextval('flooring_template_number_seq')::text
--   → produces TP-1, TP-2, ...
--
-- All template rows were deleted prior to running this migration, and the
-- sequence is restarted at 1 so the first row inserted under the new default
-- is TP-1. templateNumber is no longer read by any query, sort, filter, or
-- picker — it is purely a +1 display field on the templates list column and
-- the template record view title (see the prior cleanup PR for the wire-shape
-- drops that unblocked this edit).
-- ============================================================================

ALTER TABLE "flooring_template"
  ALTER COLUMN "template_number"
  SET DEFAULT ('TP-' || nextval('flooring_template_number_seq')::text);

ALTER SEQUENCE "flooring_template_number_seq" RESTART WITH 1;
