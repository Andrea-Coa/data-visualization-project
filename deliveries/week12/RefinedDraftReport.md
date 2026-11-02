# BATIMIX: One sleepless night does not affect everyone the same way

**Refined Draft Report, Week 12** · DS5343 Data Visualization, UTEC 2026-2
**Team:** Jimena Gurbillon, Andrea Coa, Paolo Medrano
**Date:** 28 October 2026 (updated 2 November 2026)
**Application:** `deliveries/week12/app/` · planned deployment at https://andrea-coa.github.io/data-visualization-project/deliveries/week12/app/ (verify after the push)

![BATIMIX at 1600 × 900: scatter, person × electrode heatmap, five minutes, topomap matrix and secondary views](assets/dashboard-1600x900.png)

## 1. Narrative

**Problem.** After the same sleepless night, some people deteriorate a lot and others barely at all. The group average dilutes that difference (Van Dongen et al., 2004). Cui et al. (2026) proposed an individual marker: how much the variability of theta power across 4-s epochs (σθ) increases in resting EEG, and reported that it is associated with slowing on the psychomotor vigilance task (PVT; ρ = 0.544 frontal, n = 28).

**Audience and decision.** Sleep physiology researchers doing exploratory screening on public data. The tool helps decide which channels, regions and covariates deserve a formal test. It is neither diagnostic nor predictive.

**Data.** OpenNeuro ds004902 (Xiang et al., 2024, CC0): 71 people, normal sleep (NS) versus 24–30 h without sleep (SD), 61-channel eyes-open EEG. 68 have EEG in both conditions; of these, PVT 30, KSS 32, SSS 33 and PANAS 65.

**Analytic sequence.** Each panel answers one question and its title is the answer, computed live from the data:

| Question | Answer (real data) | Panel |
|---|---|---|
| Does everyone change the same way? | 39 people become more unstable and 29 more stable; the mean rises only +0.0043 (SD across people 0.023) | Scatter and heatmap |
| Where does it change on the head? | σθ: 4 of 61 electrodes with uncorrected p < 0.05 (AF8, Fp2, O2, Oz); μθ: 8; none after FDR: diffuse, no focus | Topomap matrix, Δ column |
| When, within the five minutes? | Moving σθ in SD above NS in 63 of 66 windows (frontal) | Five minutes |
| Is more unstable slower? | ρ = −0.10 [−0.44, 0.27], n = 30: does not replicate Cui et al. | Scatter |
| Is the effect oscillatory or 1/f? | The change in σθ tracks the change in periodic theta (ρ = 0.70 to 0.87); aperiodic variability explains 2–7% | Secondary view «Oscillatory or 1/f?» |
| Does it depend on how it is analyzed? | Across 448 alternative analyses, no joint statistic exceeds chance (p ≥ 0.15) | About, «Robustness» (section 4) |

**Preliminary conclusion.** Without sleep, each person's theta moves in different directions, and that change does not robustly predict who deteriorates. The only consistent hint is with mood (positive affect, PANAS+), not with vigilance (PVT).

## 2. What changed since Week 10

| Before (Week 10) | Now (Week 12) | Why |
|---|---|---|
| Light dashboard of three separate cards, with a commented scrolling story | Single view with gapless panels that fill the screen (1365 × 768 without scrolling); light theme by default, dark as an option | Instructor feedback (no white space) and team decision (one view, no scrollytelling) |
| Controls spread over several bars and inside each card | One header with the title and all controls | Visual noise from controls |
| Help text ("drag to…", "hover…") and role labels | No instruction text: each panel title is its finding; intro, glossary and method in About | Visual noise; team request |
| Transition animations and a Play button | No animations: every state change is immediate | No motion graphics |
| Inverse-distance (IDW) maps on hand-approximated 2D coordinates | Biharmonic v4 interpolation, as in EEGLAB `topoplot` and FieldTrip `ft_topoplotER`, on the real positions in `electrodes.tsv` in azimuthal equidistant projection; a selector also shows MNE's Clough-Tocher cubic and the spherical spline (Perrin et al., 1989). All three implementations reproduce the originals (EEGLAB and FieldTrip in MATLAB R2022a, MNE 1.8) with an error below 1e-9 of the range. With all 68 people, the v4 map correlates r ≥ 0.985 with MNE's cubic and r ≥ 0.93 with the spherical spline in all six maps | IDW is not a standard for EEG topomaps; use the community's reference method and show that the pattern does not depend on it |
| No indication of pipeline or units; electrode tooltip with p and q | Fixed chip in the header (θ 4–8 / 1–40 Hz · ref. FCz · 75 × 4 s · no ICA, linked to the method); units on the color bars; the five-minute band labeled «mean ± SE»; tooltip with t(67), d_z and 95% CI of Δ. The Δ map of the 68 is now paired and p uses the exact t distribution (formerly a normal approximation); same conclusions | The first questions of a neurophysiologist: which pipeline, which units, what effect size |
| Five minutes always showed the mean (μθ), even with σθ selected | Follows the σθ/μθ button: with σθ it shows moving σθ (SD of regional θ in 40-s windows sliding by one epoch). Exploratory and labeled: its scale is smaller than the scatter σθ because it starts from the region-averaged series | Q6 for the central metric: the state-instability hypothesis (Doran, Van Dongen and Dinges, 2001) predicts more moment-to-moment variability without sleep; Cui et al. (2026) summarize it as a single number without temporal order; 40 s is where resting spectral power reaches its reliability (Gudmundsson et al., 2007) |
| Two columns with maps and views of the same size; no secondary views | Three columns with the topomap as the main view and a column of collapsible secondary views: «Oscillatory or 1/f?» (specparam) and «θ synchrony between regions» (wPLI graph and effect per pair), computed from the raw EEG with `tools/build_secondary.py` and linked to the selection | Visual hierarchy (instructor critique) and the first objection a neurophysiologist would raise: is it oscillation or 1/f background? |
| No automatic verification of the numbers | `tools/check_app.py`: 16 tests (FDR and ρ against statsmodels and scipy, t and d_z against scipy, reference signals with MNE, consistency of n across titles, About, Report and tooltip, secondary views, screenshots) and `tools/check_reproduction.py` (the processed data reproduce from the raw EEG) | A miscalculated number invalidates the tool for an expert |
| One topomap with σ/μ and NS/SD/Δ toggles | 2 × 3 topomap matrix: NS, SD and Δ columns; σθ and μθ rows, or one row per person when exactly two people are selected | Compare conditions, metrics and people without toggling (T1, T2, T4) |
| Selection with the lasso only; fixed ρ for the 68 | Lasso, click selection from 1 to n people, and **Compare two groups** (women vs men, session order, PSQI, vulnerable vs rest), with one color per group in every view and ρ per group | Task T7: moderators side by side, not filtered one at a time |
| Views that only displayed | All linked: clicking an electrode or a time window redefines the scatter x-axis; clicking points or heatmap columns builds the selection; two selected people are compared side by side | "Everything interactive": each view is also a control |
| No per-person view | Fixed person × electrode heatmap: two groups defined by behavior only (deteriorate vs resist, or the Compare groups) and their consistency C(e); selected people are outlined without reordering | Tasks T3 and T4 without averages: do those who deteriorate share a signature? |
| No way to take the view away | **Report** button: self-contained HTML with the current view, how to read each chart, the people table and its CSV | Let the researcher document and share what they found |
| Long titles | Short headline computed from the data plus figures in a muted tone | Each panel conveys its message in a few words |
| Markers: median PVT, KSS, SSS, PANAS | Also PVT lapses and RT SD | Basner and Dinges (2011) |
| No response to the non-replication | 448-analysis multiverse with permutation inference. It had its own panel in the 28 October delivery; later, to reduce the number of charts, it moved to About and the Report as a robustness analysis | Methodological contribution (section 4) |
| No per-person data quality; no artifact check | Tooltip with each person's EEG quality (epochs used, interpolated channels, blinks per minute) and a secondary «Driven by blinks?» view (`tools/build_quality.py`) | Without EOG or ICA, the first suspicion about frontal theta is blinks |
| Spanish interface | English interface | The tool and its figures will be part of an English paper |

## 3. Design rationale

**Layout.** Three gapless columns, following the team's sketch and the most common pattern in IEEE VIS systems (Chen et al.: large views in the center, narrow side panels). Center: the topomap matrix, the main view, with the five-minute series below, wide enough for its 75 epochs. Left: the people, with a compact scatter and a tall heatmap. Right: secondary views in an accordion (one open at a time) that collapse to a strip to give the maps more room. The ⇄ button swaps the sides; the center does not move. On narrow screens the panels stack, maps first.

**Tasks and views** (typology of Brehmer and Munzner, 2013):

| Task | Question | View | How it answers |
|---|---|---|---|
| T1 Locate | Where does theta change? (Q1) | Matrix, Δ column | Interpolated map (EEGLAB/FieldTrip v4) with ring (p < 0.05) and fill (FDR) |
| T2 Compare metrics | Variability or mean? (Q2) | Matrix, σθ and μθ rows | Both metrics in view, one above the other |
| T3 Identify | Who is vulnerable? (Q3) | Scatter; heatmap | Amber quadrant (above both medians), lasso and click selection; one column per person |
| T4 Compare | Do they share a spatial signature? (Q4) | Matrix by group; two selected people; heatmap | Mean of the active group; two people with shared scales; C(e) per group |
| T5 Correlate | Does it converge with each marker? (Q5) | Scatter, Y-axis | Spearman ρ with 95% CI and n in the title, recomputed per group |
| T6 Describe trend | Does it change within the recording? (Q6) | Five minutes | With μθ, mean ± SE per epoch; with σθ, moving σθ in 40-s windows |
| T7 Compare groups | Do sex, PSQI or session order matter? (Q7) | Compare selector | Two groups with two colors in every view: map rows, ρ per group, Δ per epoch |
| T8 Check robustness | Does it depend on analytic decisions? Is it oscillatory? | About, «Robustness»; secondary views | Joint multiverse statistics with their permutation p; periodic vs aperiodic separation; θ synchrony with effects and CIs per pair |

**Encoding and color.** Light theme by default with ColorBrewer palettes; an optional dark "instrument" theme. NS = blue, SD = red. NS and SD share a sequential scale per row so that comparing columns means comparing values; with two people both rows share the scale. Δ uses a diverging scale with a neutral zero. Amber marks the vulnerable quadrant. Selection is marked with a ring (scatter) or an outline (heatmap) without changing the point colors, which keep their meaning. Direct labels instead of distant legends.

**Typography.** Geist for titles and text, Geist Mono for figures and axes. At least 9–10 px in charts.

**Interaction.** Lasso, click to add or remove people (1 to n), Shift + click for people A and B, Esc and Clear, group selector, global region and metric. Immediate response, no decorative animation, visible focus states.

**Accessibility.** AA contrast, visible focus, group selector as an alternative to the lasso, data table in About.

## 4. Contribution: a multiverse of 448 analyses

A single correlation is one of many possible decisions. To respond honestly to the non-replication of Cui et al., we computed **448 specifications**: 4 regions (frontal, centrotemporal, posterior, global) × 2 metrics (σθ, μθ) × 2 forms of change (absolute, relative) × 7 behavioral markers × 2 correlations (Spearman, Pearson) × 2 outlier rules (all, exclude |z| > 2.5). All are oriented toward deterioration, so the hypothesis predicts r > 0.

Joint inference follows Simonsohn, Simmons and Nelson (2020), adapted to observational data without covariates: the behavioral rows are permuted among the 68 participants (2000 times), the whole multiverse is recomputed, and three statistics are compared with their null distribution. The threshold of each statistic is the 95th percentile of its permuted distribution. In the 28 October delivery it had an explorable panel (Dragicevic et al., 2019); to reduce the number of charts, the team removed it from the board and kept it as a robustness analysis in About and in the Report, with the 448 results in `data/multiverse_specs.csv`.

| Test | Median r | Significant with r > 0 | Stouffer Z |
|---|---|---|---|
| Main, σθ only (224) | +0.035 (p = 0.32) | 0 | +4.57 (p = 0.22) |
| Full multiverse (448) | +0.012 (p = 0.42) | 26; chance reaches 56 (p = 0.15) | +3.13 (p = 0.33) |

The 26 significant analyses are all PANAS+ with μθ: the larger the increase in theta power, the larger the drop in positive affect. It is the only consistent signal, but it does not exceed chance jointly: it remains a hypothesis. The initial Week 6 analysis reproduces exactly (ρ = −0.099) and the recomputed frontal Δσθ matches `merged_summary.csv` (maximum difference 2.8e−17).

**Why it might not replicate** (`research/literatura_verificada.md`): Cui et al. used average reference, ICA, a 1–30 Hz filter, a 4–30 Hz denominator, epoch rejection and reaction-time cleaning, with n = 28; we used FCz reference, no ICA, a 1–40 Hz denominator and n = 30. With n = 30, the probability of detecting ρ = 0.3 is close to 0.35.

## 5. Preliminary findings

1. The response is individual: 39 people increase their theta variability and 29 reduce it; the mean barely moves.
2. The spatial change is diffuse: no electrode survives FDR, in σθ or in μθ.
3. The theta elevation in SD is mild and sustained across the five minutes.
4. Theta instability does not predict PVT slowing (ρ = −0.10, n = 30), nor lapses (ρ = −0.01).
5. The result does not depend on an analytic decision: across the whole multiverse no joint statistic exceeds chance.
6. Person by person there is no vulnerability signature either: with the PVT, those who deteriorate and those who resist have mean consistency C = −0.02 and +0.10, and in a similarity graph (analyzed in the delivery, now off the board) 19 of 42 neighbors of those who deteriorate belong to their group (chance ≈ 19). The exception is again mood: those who lose positive affect increase theta more (C = +0.28 versus −0.01 in σθ; +0.35 versus −0.07 in μθ), although their patterns are not more similar to each other.
7. **σθ is oscillatory, not an effect of the 1/f background.** Deprivation changes aperiodic activity in this dataset (offset d_z = +0.26, p = 0.034; exponent d_z = +0.24, p = 0.055; in line with Bai et al., 2024, and Li, 2026), but each person's change in σθ tracks the change in their periodic theta (ρ = 0.70 frontal, 0.87 centrotemporal) and exponent variability explains only 2–7%. 53% of electrodes show a theta peak, as Monchy et al. ask to verify before interpreting theta.
8. **Blinks do not drive σθ.** Without EOG or ICA, frontal theta could reflect blinks. Blinks detected on Fp1/Fp2 do not change with deprivation (median 19.6 → 19.9 per minute, p = 0.60) and their change is unrelated to Δσθ (ρ = 0.10 frontal). Removing the 1-s windows within 0.25 s of a blink leaves each person's Δσθ almost unchanged (ρ = 0.85 frontal, 0.96 centrotemporal, n = 49), and within recordings epochs with more blinks have lower, not higher, relative theta (r = −0.35): blinks add delta power.
9. **Theta synchrony between regions (exploratory).** With average reference and wPLI², it decreases in all 45 region pairs after deprivation, but no pair survives FDR (sign-flip permutation joint test p = 0.055; 10 of 45 pairs have an uncorrected 95% CI that excludes zero) and it is unrelated to the PVT.

## 6. Limitations

- Small n for behavior (PVT 30), with low statistical power.
- Heuristic preprocessing: no ICA, no re-referencing (except for the synchrony view), bad-channel detection by variance.
- Per-electrode tests are not shown for subgroups (small n); small groups are exploratory.
- Three eyes-open recordings (`sub-01`, `sub-28` and `sub-44`, session 2) are truncated in the OpenNeuro bucket and MNE cannot read them; this was verified with a download on 2 November 2026, so downloading again does not fix them.
- Xiang et al. (2024) appear to assign the PVT t values to indicators different from those in the dataset dictionary; we follow the dictionary.
- The trial-level PVT files of ds004902 are not consistent with the dataset summary columns (median RT matches in 11 of 66 sessions) and, with the session-to-condition mapping used for the EEG, only 11 of 29 people are slower after deprivation; we therefore use only the summary columns (`app/tools/check_pvt_trials.py`). The PVT was recorded separately from the resting EEG, which has no event markers, so no ERP or time-locked analysis is possible.
- User evaluation still pending.

## 7. Functional connectivity: from postponed to an exploratory secondary view

In Week 12 we ruled it out for the main board (`research/informe_conectividad.md`): the most similar study (Verweij et al., 2014) found no changes with eyes open, our pipeline used FCz reference, and 1830 edges required large effects. The condition that the report itself set for reopening it was met: we downloaded the raw EEG and verified that the pipeline reproduces it. We therefore computed it with the safeguards from the literature (FCz re-inserted and average reference, debiased wPLI², 10 regions and 45 pairs, FDR and permutation) and show it only as an exploratory secondary view, labeled as such: a head graph and an effect-per-pair plot with 95% CIs. The result is a consistent trend without significant pairs, and at rest theta connectivity may reflect aperiodic activity (Monchy et al.).

## 8. Remaining work and owners

| Week | Jimena Gurbillon | Andrea Coa | Paolo Medrano | Whole team |
|---|---|---|---|---|
| 13 (29 Oct to 4 Nov) | Rerun the pipeline with average reference and ICA (Cui style) and add it as a multiverse dimension | Moderator summary; teaser script | Vulnerability criterion by lapses (Chua et al., 2019); Results writing | Deployment on GitHub Pages; informal test with 3 to 5 users (tasks T1 to T8) |
| 14 (5 to 11 Nov) | Paper data and methods; poster | Presentation video (5 min) and teaser (1 min) | Paper design and results; graphical abstract figure | Full paper in the IEEE VIS template (LaTeX); incorporate usability findings |
| 15 (12 to 18 Nov) | Map polishing | Final project page | Secondary views and ML polishing | Final README, contributions, reflection, link check, exhibition |

## References

Full references with verified DOIs are in `research/literatura_verificada.md` (in Spanish). Cited here: Bai et al. (2024), Basner and Dinges (2011), Brehmer and Munzner (2013), Chen et al. (multiple-view composition patterns), Chua et al. (2019), Cui et al. (2026), Doran, Van Dongen and Dinges (2001), Dragicevic et al. (2019), Gudmundsson et al. (2007), Li (2026), Monchy et al. (aperiodic functional connectivity), Perrin et al. (1989), Simonsohn, Simmons and Nelson (2020), Van Dongen et al. (2004), Verweij et al. (2014), Vinck et al. (2011), Xiang et al. (2024).

*Use of AI: part of the code, the multiverse analysis and the writing was developed with the assistance of Claude (Anthropic) and reviewed by the team.*
