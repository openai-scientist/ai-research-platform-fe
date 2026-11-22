# Statistical analysis plan

Plan analysis-plan, version 1.

## Pinned inputs

- dataset-snapshot: 24193ac8e9780e8d62c73d5f1f69ca5d721c82a84f8c8affbf942265e49d5497
- hypothesis-set: cee336600241a7e682abcde2e16647a1a0965afb709ef56ac517a93365b25f0d

## Data and split

| Hypothesis | Rows used | Split kind | Confirmation rows |
| --- | --- | --- | --- |
| H1 | all | not diagnosed | none |

Prior knowledge of the researcher is not recorded: the plan has no statement of what they have already seen of this data (the researcher was not asked, or did not reply).

## Hypotheses

### H1: Among students in this dataset, higher continuous nightly sleep hours are positively associated with exam scores, conditional on weekly study hours, stress score, and study year.

- Claim type: association
- Role: primary
- Label: none.  The label speaks of power only: the twin it was measured on holds no confounding and no relation of the outcome to any variable, so it says nothing about whether the claim is true.
- Covariates: Code could not screen the columns related to sleep_hours_night (The data host could not compute the release (unsupported). Start the runner on the machine that holds the file (logos-runner run), then run the diagnosis again.), so the plan has no default covariates for this hypothesis.
- Covariates: H1: whether caffeine_cups_day, exercise_min_week, housing, screen_hours_day, stress_score, study_hours_week, study_year relate to sleep_hours_night was not tested (The data host could not compute the release (unsupported). Start the runner on the machine that holds the file (logos-runner run), then run the diagnosis again.), so the plan cannot say that they do not confound the estimate, and the claim stays an association.
- Sensitivity request mnar:sleep_hours_night (missing_not_at_random) on sleep_hours_night: sleep_hours_night has empty cells and the table cannot show whether they are empty because of the value they would hold. Execution runs the analysis both ways and reports both.
- Sensitivity request mnar:exam_score (missing_not_at_random) on exam_score: exam_score has empty cells and the table cannot show whether they are empty because of the value they would hold. Execution runs the analysis both ways and reports both.
- Limitation: the question map sets the population (Students in the dataset) through student_id, a column with no levels, so no filter applies it.

#### Estimand

- Population: Students represented in the dataset with observed sleep hours, exam score, and prespecified adjustment variables.
- Exposure: sleep_hours_night, contrast per unit of the exposure
- Outcome: exam_score, transform none
- Intercurrent events: no_event_recorded. The dataset records no post-exposure intercurrent events; exam score is analyzed as recorded.
- Effect measure: linear_coefficient (the adjusted difference in outcome units)
- Summary measure: Adjusted linear-regression slope in exam-score points per additional hour of nightly sleep, conditional on weekly study hours, stress score, and study year.

#### Protocol

- population: Students represented in this dataset.
- summary: Positive association between nightly sleep hours and exam score, summarized as an adjusted linear-regression slope in exam-score points per additional hour.
- variables: Continuous nightly sleep hours and exam score; weekly study hours, stress score, and study year are prespecified context/adjustment factors in the claim.

#### Causal diagram

No causal diagram: the claim is not causal.

#### Program

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

#### Decision rule

- Alpha: none
- SESOI: none (none)
- SESOI source kind: none
- Direction: none
- Metric: none

#### Interpretation

No interpretation table.

## Family structure

- Alpha: 0.05
- Alpha of the power diagnosis of every hypothesis: 0.05
- Primary hypothesis: H1
- Order: H1
- Gatekeeping: none
- Correction across the family: holm
- Rule: Every hypothesis of the family, the primary included, is tested with the Holm correction at the same alpha, so no hypothesis waits for another and the order of the family does not change a verdict. Equivalence inside a margin is shown by two one-sided tests at alpha, and their p values are adjusted by the Holm correction over the hypotheses that have a margin. These are two families, each held at alpha, so a plan that mixes both kinds of claim can reach twice alpha for any false claim across them. The primary hypothesis is the one reported first. The design diagnosis measures the power of every hypothesis at alpha divided by the number of hypotheses, the level of the worst Holm step.

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

## Design diagnosis

### H1

not diagnosed

## External validation

No external validation source.

## Figure slots

| Id | Placement | Chart | Question | Standard | Data source |
| --- | --- | --- | --- | --- | --- |
| F1 | main | flow_diagram | How many rows remain after each filter of the programs? | STROBE statement, item 13 (von Elm et al., Lancet 2007) | population counts at each filter of the programs |
| F2 | main | estimate_interval | What is the estimated difference in exam_score for a one-unit change in sleep_hours_night, with its interval? | Krzywinski and Altman, Error bars, Nature Methods 2013 | bundle:H1-main |
| F3 | supplement | design_diagnosis | How much power and calibration does each program have on the twin? | Morris, White and Crowther, Using simulation studies to evaluate statistical methods, Statistics in Medicine 2019 | plan:design_diagnosis |

## Deviations

A change after the lock is a deviation recorded by the execution stage. Declared fallbacks switch automatically and are logged.
