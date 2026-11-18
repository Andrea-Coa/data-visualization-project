# Otras bandas (delta, alfa, beta, gamma) con σ y μ: revisión de literatura

Revisión hecha el 14 de noviembre de 2026 para el plan de `CLAUDE.md` (fase 1). Las citas se verificaron por búsqueda web; donde no se pudo, se indica. El texto técnico se deja en inglés, como en las fuentes.

## 1. Band definitions; fixed bands or IAF
- Definitions in sleep-deprivation (SD) resting EEG are close to each other. Koenis et al. (2013) used 61 channels with eyes open and eyes closed after SD: delta 1–4, theta 4–8, alpha 8–13, beta 13–30, gamma 30–48 Hz (*Hum Brain Mapp*, doi:10.1002/hbm.21455). Lian et al. (2023) used the same edges but gamma 30–50 Hz (*Brain Sci*, doi:10.3390/brainsci13060949). Cui et al. (2026) used theta 4–8, alpha 8–13, beta 13–30 (doi:10.3389/fnins.2026.1910878). Gudmundsson et al. (2007) note that band edges are "ad hoc" and vary between authors.
- IAF: Klimesch (1999) argues that alpha/theta effects show up only when fixed bands are avoided (*Brain Res Rev*, doi:10.1016/S0165-0173(98)00056-3). Corcoran et al. (2018) give an automated, open-source PAF/CoG estimator (*Psychophysiology*, doi:10.1111/psyp.13064). This matters here because the SD effect straddles the 8 Hz edge: Cajochen et al. (1995) found the increase at 6.25–9 Hz (*Sleep* 18:890–894; DOI not verified).
- Sigma (about 12–15 Hz) is a spindle (sleep) band, and no wake-SD paper using it was found. Leave it out.
- Gamma: a 1–40 Hz pass-band leaves only 30–40 Hz. That is far below the 50 Hz notch, so it is technically measurable, but it is heavily contaminated by muscle activity (see section 4).

## 2. Relative vs absolute power
- Relative power is compositional. If the bands tile 1–40 Hz, the shares sum to 1, so a rise in one band mechanically lowers the others. Any change in total power, such as a broadband or aperiodic offset shift, also moves every share. This follows from the arithmetic; no peer-reviewed EEG paper on compositional analysis was found to cite, only general log-ratio (CoDA) material.
- What SD papers report:
  - Chua et al. (2014): log-transformed power (*Sleep*, doi:10.5665/sleep.3302).
  - Snipes et al. (2022): z-scored power per frequency, and untransformed power for correlations (*J Neurosci*, doi:10.1523/JNEUROSCI.1063-22.2022).
  - Koenis et al. (2013) and Cui et al. (2026): relative power.
  - Gudmundsson et al. (2007): absolute and relative power were similarly reliable (*Clin Neurophysiol*, doi:10.1016/j.clinph.2007.06.018).
- Aperiodic activity: a 2024 *J Neurophysiol* study found the aperiodic offset shifts after SD, mainly over occipital sites, and argues that fixed-band analysis mixes periodic and aperiodic components (doi:10.1152/jn.00304.2024; abstract only read). specparam/FOOOF separates the two parts of the spectrum (Donoghue et al., 2020, *Nat Neurosci*, doi:10.1038/s41593-020-00744-x). Band power measured above the aperiodic fit avoids the 1/f confound.

## 3. Known SD effects per band (resting wake)
- **Theta and delta:**
  - Theta rises with time awake, strongest frontally (Finelli et al., 2000, *Neuroscience* 101:523–529, 5–8 Hz; Cajochen et al., 1995).
  - The SD theta increase is regional and use-dependent (Bernardi et al., 2015, *J Neurosci* 35:4487–4500, PMID 25788668).
  - Snipes et al. (2022) separate SD theta, which is widespread and frontal, from frontal-midline cognitive theta. They report no delta (1–4 Hz) increase during tasks.
  - With eyes closed, delta rises after SD (Lian 2023; Koenis 2013), but Koenis found no delta change with eyes open.
- **Alpha:**
  - Sleepiness correlates negatively with alpha at every scalp site (Strijkstra et al., 2003, *Neurosci Lett* 340:17–20).
  - Koenis (2013) found lower relative alpha after SD with eyes open as well as eyes closed.
  - Cui (2026), eyes open: no reliable change in mean alpha. Alpha σ rose only parieto-occipitally.
  - The frequently cited claim that eyes-open alpha rises with sleepiness (alpha attenuation test) could not be verified. Treat it as unconfirmed.
- **Beta and gamma:** In Cui (2026), beta σ rose in every region, with the strongest effect frontally. Koenis (2013) found only connectivity effects in gamma with eyes open.
- **Variability for bands other than theta:**
  - Chua et al. (2014) computed the SD of log power across 2-s epochs. They report higher theta (6–7.5 Hz) and delta variability in vulnerable subjects. Their waking delta edges are not stated.
  - Cui (2026) reports alpha and beta σ.
  - No published study of delta or gamma σ in eyes-open resting EEG after SD was found.

## 4. Artifacts, ICA, frequency resolution
- **Muscle (EMG):** Recordings under neuromuscular paralysis show that most scalp EEG power above 20 Hz comes from muscle (Whitham et al., 2007, *Clin Neurophysiol* 118:1877–1888, PMID 17574912; DOI not verified). Muthukumaraswamy (2013) concludes that no single method removes all muscle artifact (*Front Hum Neurosci*, doi:10.3389/fnhum.2013.00138). ICA at ICLabel p > 0.85 removes only clear-cut components (Pion-Tonachini et al., 2019, doi:10.1016/j.neuroimage.2019.05.026), so beta and especially 30–40 Hz remain at risk. Muscle tension may also differ after SD.
- **Ocular:** With no EOG channel, residual blinks and slow eye movements inflate frontal delta and theta.
- **Frequency resolution (verified on the repository data):** the scripts call `compute_psd(method="welch")` without `n_fft` (e.g. `app/tools/build_eeg_ica.py:31`). With the MNE version that generated the current data, that default used the whole 4-s epoch: the stored spectrum in `app/data/aperiodic.json` has 157 frequencies from 1 to 40 Hz at 0.25 Hz steps, so theta covers 17 bins and delta (1–4 Hz) would cover 13. The default is version-dependent in MNE (the `psd_array_welch` docs give n_fft = 256 samples, about 1.95 Hz at 500 Hz), so the parameters must be set explicitly (n_fft = n_per_seg = 2000, no overlap, Hamming) and theta recomputed to check it does not change. Neighbouring bands share their edge bin (bands are inclusive on both sides); define half-open bands to avoid double counting.

## 5. Animated topomaps
- Gudmundsson et al. (2007), using 2-s Welch blocks: reliability "increased with epoch length but levels off at 40 s". Delta and the 25–40 Hz band were the least reliable.
- Implication: a 40-s sliding window (10 × 4-s epochs, step 4 s) gives 66 frames from 75 epochs. A σ estimated from 10 epochs is noisy, so animate μ and treat animated σ as descriptive.
- Use one fixed colour scale across all frames and conditions.
- The reliability study used eyes-closed recordings from adults over 50, so the 40-s figure is a guide, not a validated threshold for this dataset.

## 6. Multiple comparisons
- Adding bands gives 5 bands × 61 electrodes × 2 metrics = 610 tests.
- How papers handle it:
  - Cui (2026): Benjamini–Hochberg FDR within each feature family, covering 3 bands × 61 electrodes = 183 tests, plus regions of interest (ROIs).
  - Snipes (2022): FDR for tests, and cluster permutation only as a display mask.
  - Koenis (2013): no correction.
- Cluster-based permutation over electrode adjacency, run per band and metric, controls the family-wise error (Maris & Oostenveld, 2007, *J Neurosci Methods*, doi:10.1016/j.jneumeth.2007.03.024).

## Recommendations for our pipeline
1. **Bands:** delta 1–4, theta 4–8, alpha 8–13, beta 13–30 Hz, all fixed edges. Add low gamma 30–40 Hz only as an exploratory, EMG-sensitive band, or drop it. Leave sigma out. Optionally estimate IAF as a check on whether theta/alpha effects come from alpha slowing.
2. **Denominator:** keep 1–40 Hz for consistency with the current σθ. Run a sensitivity check with 4–30 Hz (Cui).
3. **Power measures:** report log10 absolute power next to relative power for every band, because relative shares are coupled. Optionally add specparam aperiodic-adjusted power and the offset/exponent.
4. **Welch settings:** fix them explicitly before adding bands, then recompute theta for parity.
5. **Statistics:**
   - Confirmatory: theta σ (prior hypothesis).
   - Exploratory: delta, alpha, beta, gamma, and μ for all bands.
   - Correct with FDR within each band × metric (61 tests), or cluster permutation, and label what is uncorrected.
   - Interpret frontal delta and beta/gamma with caution because of ocular and EMG residue.
6. **Animation:** windows of ≥ 40 s, fixed colour scale, labelled as descriptive.
