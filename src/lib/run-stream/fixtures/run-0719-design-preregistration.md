# Preregistration of a secondary data analysis

Plan analysis-plan, version 1. Sections adapt Van den Akker et al., Preregistration of secondary data analysis: A template and tutorial, Meta-Psychology 2021; the method cards of the experiment design stage record where they differ from it.

## Pinned inputs

- dataset-snapshot: 24193ac8e9780e8d62c73d5f1f69ca5d721c82a84f8c8affbf942265e49d5497
- hypothesis-set: cee336600241a7e682abcde2e16647a1a0965afb709ef56ac517a93365b25f0d

## Hypotheses

- H1 (primary, none, association): Among students in this dataset, higher continuous nightly sleep hours are positively associated with exam scores, conditional on weekly study hours, stress score, and study year.

## Data

- H1: datasets primary, rows used all, confirmation rows not diagnosed

## Prior knowledge of the data

Prior knowledge of the researcher is not recorded: the plan has no statement of what they have already seen of this data (the researcher was not asked, or did not reply).

No aggregate relating a variable to an outcome was released before the lock. These releases were made:

No aggregate was released before the lock.

## Variables

### H1

- Outcome: exam_score
- Exposure: sleep_hours_night
- Covariates: none
- Population filters: none
- Transforms: none

## Analyses

### H1

- Family: linear_regression
- Outcome: exam_score
- Exposure: sleep_hours_night
- Reference level: none
- Covariates: none
- Population filters: none
- Transforms: none
- Fallbacks: none
- Alpha: 0.05
- SESOI: none
- Rows: all

## Inference criteria

- Alpha: 0.05
- Alpha of the power diagnosis of every hypothesis: 0.05
- Primary hypothesis: H1
- Order: H1
- Gatekeeping: none
- Correction across the family: holm
- Rule: Every hypothesis of the family, the primary included, is tested with the Holm correction at the same alpha, so no hypothesis waits for another and the order of the family does not change a verdict. Equivalence inside a margin is shown by two one-sided tests at alpha, and their p values are adjusted by the Holm correction over the hypotheses that have a margin. These are two families, each held at alpha, so a plan that mixes both kinds of claim can reach twice alpha for any false claim across them. The primary hypothesis is the one reported first. The design diagnosis measures the power of every hypothesis at alpha divided by the number of hypotheses, the level of the worst Holm step.

### H1

- Alpha: none
- SESOI: none (none)
- SESOI source kind: none
- Direction: none
- Metric: none

No interpretation table.

## Robustness

### H1

| Fork | Change | Family |
| --- | --- | --- |
| rank_sensitivity | Use Spearman rank association instead of the linear slope to assess sensitivity to nonlinearity and outliers. | spearman |
| wide_adjustment | Comparison added by code: every dictionary column that may adjust is a covariate; a wide set may hold a mediator or a collider. | linear_regression |

Code adds two comparison forks to every hypothesis whose family adjusts for covariates: no_adjustment takes every covariate out, and wide_adjustment adds every column of the dictionary that may adjust, except a near copy of an outcome. They show how the estimate moves under other adjustment sets and are never the verdict; a wide set is only a comparison and may hold a mediator or a collider.
The timing of the columns is not confirmed. The plan adjusts only for the columns the timeline orders before the exposure, and the data cannot tell a confounder from a mediator or a collider, so a verdict that adjusts rests on that order.

The claim stands as an association at most: the order of the exposure, the outcome and the columns that matter is not confirmed, or the table limits the pair.

- Negative control: none. No eligible negative-control column can be verified: the exposure screen has no result for candidate columns.
- Sensitivity analysis: none
- Missing data: complete_case. Complete-case analysis may be biased if missing sleep hours or exam scores depend on their unobserved values or student characteristics; missingness can select a nonrepresentative subset. Anomalies: none
- Missing-data sensitivity analysis: the main analysis uses the complete cases; when the share of incomplete rows passes the limit of the execution stage's missing-data setting, a sensitivity analysis on the missingness mechanism runs as well.

## Design diagnosis summary

- H1: not diagnosed
