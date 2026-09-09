# Week 05 -- Team and Project Proposal

## Team

| Name | Email |
|---|---|
| Jimena Gurbillon | jimena.gurbillon@utec.edu.pe |
| Andrea Coa | andrea.coa@utec.edu.pe |
| Paolo Medrano | paolo.medrano@utec.edu.pe |

## Working title

Visualización Web Interactiva de la Vulnerabilidad Individual a la Privación de Sueño mediante Variabilidad Theta en EEG (OpenNeuro ds004902)

## Repository structure (this folder)

- `ProjectProposal.tex` -- editable source of the 2--3 page proposal.
- `ProjectProposal.pdf` -- compiled proposal (compile with `pdflatex ProjectProposal.tex`).
- `README.md` -- this file.

The Week 4 data package (`deliveries/week04/`) was revised after instructor feedback:

- clearer, more specific descriptions in `data_dictionary.csv` for each field;
- dataset size/weight stated explicitly (~8 GB, see `acquisition.md`);
- an exploratory analysis of missing values, outliers, and metadata inconsistencies, added in `EDA.ipynb`.

## Domain questions

Full text in `ProjectProposal.pdf`, Section 5. Referenced by number (Q1-Q7) in the responsibilities below. The core metric is the **variability** (standard deviation across epochs) of theta power, not just its mean -- following the epoching method of Cui et al. (2026): 300 s recordings split into 75 non-overlapping 4-s epochs.

| # | Question (short) |
|---|---|
| Q1 | Spatial pattern of theta-power variability: topomap NS vs. SD |
| Q2 | Variability vs. mean power: which reveals a broader/different spatial vulnerability pattern? |
| Q3 | How separable are vulnerable vs. resistant subjects by Δtheta-variability and ΔPVT? |
| Q4 | Do vulnerable subjects share a consistent spatial signature (frontal/centro-temporal)? |
| Q5 | Pairwise marker convergence (variability vs. PVT / KSS / PANAS, each checked separately) |
| Q6 | Intra-recording dynamics (epoch-by-epoch trend) |
| Q7 | Moderators: sex, age, PSQI, session order |

**Key EDA finding driving Q5's design:** of the 71 participants, only 68 have paired PANAS, 35 paired SSS, 33 paired KSS, and 30 paired PVT (data in both NS and SD) -- and only **2** participants have SSS+KSS+PVT all three paired simultaneously. Q5 therefore compares theta variability against each behavioral marker separately, never against a three-way intersection.

## Expected data processing flow

Full version in `ProjectProposal.pdf`, Section 4. Two parallel pipelines (raw &rarr; ready), joined at the end -- each tailored to its data type (EEG signal vs. tabular behavioral data):

**EEG (signal):**
`Raw (BIDS .set/.fdt, 61 channels, 500 Hz)` &rarr; **cleaning** (bad-channel detection, 1-40 Hz band-pass, 50 Hz notch) &rarr; **segmentation** (75 non-overlapping 4-s epochs per recording, per Cui et al. 2026) &rarr; **feature extraction** (PSD per epoch/electrode, relative theta power) &rarr; **aggregation** (mean and variability across epochs, per subject/condition/electrode and per ROI) &rarr; `JSON`

**Behavioral (tabular):**
`Raw (participants.tsv)` &rarr; **cleaning** (parse `n/a`, type casting) &rarr; **filtering** (keep only subjects with paired NS+SD data, documented n per variable) &rarr; **derivation** (ΔPVT, ΔKSS, ΔPANAS-PA = SD - NS) &rarr; `CSV`

**Merge:** join on `participant_id` between the EEG summary and the behavioral deltas &rarr; the table that feeds all three D3.js views. Raw EEG files (~8 GB via S3) are never processed in the browser.

## Responsibilities (proposed for the implementation phase)

We split the work by **D3.js view** instead of by pipeline stage, so all three of us build a full visualization end-to-end (data prep through D3.js), rather than one person being stuck only on data processing. The three views are coordinated through linked brushing (selecting a subject/subgroup in one view highlights it in the others).

- **Jimena Gurbillon:** topomap view (Q1, Q2) -- per-electrode mean/variability theta preprocessing and D3.js implementation of the interactive topomap (NS vs. SD, mean vs. variability toggle).
- **Andrea Coa:** intra-recording dynamics and moderators view (Q6, Q7) -- epoch-wise variability and covariate (sex, age, PSQI, session order) preprocessing, and D3.js/Canvas implementation of the temporal panel and moderator filter controls.
- **Paolo Medrano:** individual vulnerability and convergence view (Q3, Q4, Q5) -- behavioral data preprocessing (PVT, KSS, PANAS), documenting each variable's paired $n$, and D3.js implementation of the linked scatter that drives brushing across the other two views.
- **Shared:** cross-view linked-brushing mechanism, data-quality validation, documentation and presentation.

**Explicitly out of scope for the MVP:** full EEG microstate analysis (clustering + backfitting), inspired by Bai et al. (2025). It requires a dedicated signal-processing pipeline beyond what a D3.js visualization course project should focus on; if time remains after the MVP, we would use an existing library (`pycrostates`) rather than implement clustering from scratch.

**Note:** a citation to "Dennis et al. (2017)" appears in an earlier Canva draft of the presentation (re: convergence between objective/subjective sleepiness measures) that we could not verify via Crossref/Semantic Scholar -- confirm the correct reference with Paolo before final submission, or drop the claim.

## Relevant links

- **Repository:** https://github.com/Andrea-Coa/data-visualization-project
- **Dataset (OpenNeuro):** https://openneuro.org/datasets/ds004902/versions/1.0.8
- **Dataset (GitHub mirror):** https://github.com/OpenNeuroDatasets/ds004902
- **Dataset descriptor paper:** Xiang et al. (2024), "A resting-state EEG dataset for sleep deprivation," *Scientific Data*. https://doi.org/10.1038/s41597-024-03268-2
- **Related work using this dataset:**
  - Cui et al. (2026), "Exploring the differences in neural oscillation mechanisms before and after sleep deprivation," *Frontiers in Neuroscience*. https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2026.1910878/full
  - Bai et al. (2025), "Altering Temporal Dynamics of Sleepiness and Mood During Sleep Deprivation: Evidence from Resting-State EEG Microstates," *Brain Sciences*. https://www.mdpi.com/2076-3425/15/4/423
