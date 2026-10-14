# Reviewed papers (design inspiration)

Six papers/visualizations the team gathered as design inspiration (each
member contributed >=3), organized per paper with the PDF attached. All six
PDFs are included in this folder.

| # | Paper | Found by | PDF | What it informs in our design |
|---|---|---|---|---|
| 1 | Bai, D., Hu, J., Jülich, S., & Lei, X. (2024). *Impact of sleep deprivation on aperiodic activity: a resting-state EEG study*, J. Neurophysiol. [doi.org/10.1152/jn.00304.2024](https://doi.org/10.1152/jn.00304.2024) | Jimena & Andrea (both listed it independently) | `aperiodic2024.pdf` | **The single closest precedent for View 1.** Its Figure shows NS vs. SD topomaps of aperiodic offset/exponent *and a difference map (SD - NS) with red dots marking the electrodes where the difference is statistically significant*. This is a concrete upgrade we're adopting over our Week 5 plan: the topomap toggle should include a **"difference + significance" mode**, not just raw NS / SD / mean / variability -- red-dot (or outline) overlay on electrodes that pass a paired significance test, directly visualizing where Q1 asks "how does the spatial pattern differ." Also motivated us to note aperiodic (1/f background) vs. periodic/oscillatory power as a distinction worth stating explicitly in the paper's Data and Methods section, since our theta metric is a periodic-band measure and a reader could otherwise confuse the two. |
| 2 | Cui et al. (2026), *Exploring the differences in neural oscillation mechanisms before and after sleep deprivation*, Frontiers in Neuroscience. [doi.org/10.3389/fnins.2026.1910878](https://doi.org/10.3389/fnins.2026.1910878) | Jimena (shared list) | `cui2026.pdf` | Source of the **epoching scheme** (75 non-overlapping 4 s epochs), the **frontal (16) / centro-temporal (28) ROI grouping** (independently verified against ds004902's actual 61 channel names in `02_eeg_pipeline.ipynb` -- matches exactly), and the direct template for the **vulnerability scatterplot** (View 3, Q3/Q5: variability vs. PVT reaction time, split by ROI). Also explains the absolute-vs-relative-power distinction (relative theta = theta power / total power) that we use throughout. |
| 3 | Bai, D., Fan, X., Xiang, C., & Lei, X. (2025). *Altering temporal dynamics of sleepiness and mood during sleep deprivation: evidence from resting-state EEG microstates*, Brain Sciences 15(4):423. [doi.org/10.3390/brainsci15040423](https://doi.org/10.3390/brainsci15040423) | Jimena (shared list) | `bai2025.pdf` | Reference for the **x-axis framing of the intra-recording dynamics panel** (View 2, Q6): time/epoch progression within a single 5-minute recording as the unit of analysis. We explicitly keep their microstate *method* (GFP clustering + backfitting) out of the MVP scope (see `ProjectProposal.tex`, "Riesgos principales") -- we borrow the temporal framing, not the clustering. |
| 4 | ten Caat, M., Maurits, N. M., & Roerdink, J. B. T. M. (2007). *Design and evaluation of tiled parallel coordinate visualization of multichannel EEG data*, IEEE TVCG 13(1):70-79. [doi.org/10.1109/TVCG.2007.9](https://doi.org/10.1109/TVCG.2007.9) | Andrea | `tencaat2007.pdf` | A tiled small-multiples layout for showing *all channels at once* without a topomap. We are not adopting tiled parallel coordinates as a primary view (it would compete with, not complement, the topomap for Q1/Q2), but it's a candidate **fallback/detail-on-demand view** if a reviewer wants to see raw per-channel epoch traces behind a specific topomap electrode -- noted as a possible Week 10 stretch interaction, not required for the MVP. |
| 5 | *The Effect of Music Stimulation on Resting-State Brain Functional Networks Following Exhaustive Endurance Exercise: An EEG Study*, Brain Sciences 16(3):258 (2026). [doi.org/10.3390/brainsci16030258](https://doi.org/10.3390/brainsci16030258) | Andrea | `music2026.pdf` | Uses a **chord/circular connectivity diagram** to show inter-region functional connections. Out of scope for our three planned views (we measure per-electrode power, not inter-electrode connectivity), but flagged as a genuine optional extension if time remains after the MVP -- a connectivity chord diagram between ROIs would extend Q4 ("do vulnerable subjects share a spatial signature") from independent electrodes to a network view. |
| 6 | Xiang et al. (2024), *A resting-state EEG dataset for sleep deprivation*, Scientific Data. [doi.org/10.1038/s41597-024-03268-2](https://doi.org/10.1038/s41597-024-03268-2) | shared (dataset paper) | `xiang2024.pdf` | The dataset descriptor's electrode montage figure is the direct source for the electrode (x, y, z) layout we project onto the 2D scalp outline in the topomap view. |
| 7 | Chua, E. C.-P., Sullivan, J. P., Duffy, J. F., Klerman, E. B., Lockley, S. W., Kristal, B. S., Czeisler, C. A., & Gooley, J. J. (2019). Classifying attentional vulnerability to total sleep deprivation using baseline features of psychomotor vigilance test performance, Scientific Reports, 9, Article 12102. doi.org/10.1038/s41598-019-48280-4 | Andrea | chua2019.pdf | Classifies attentional vulnerability by first dividing individuals into three performance categories (resilient [top 25%], intermediate [middle 50%], and vulnerable [bottom 25%]) according to their average lapses of attention (reaction times >500 ms) during sleep deprivation. |

## Team design notes (not a paper, but load-bearing for View 1)

Jimena's own breakdown of the topomap encoding -- this is the working spec
for the topomap sketch (pending, see `DataAnalysis.md` Section 6) and for
the real Q1/Q2 chart in `../analysis_plots/`:

- **Point** = one electrode.
- **Color** = the metric's numeric value at that electrode (like a heatmap).
- **Interpolation between points** (so color fills the scalp area, not just
  dots): spatial interpolation -- spherical spline interpolation or
  inverse-distance weighting (IDW) -- to produce a continuous gradient
  between the 61 known electrode values.
- Open question carried into Week 7: how many discrete color bins / what
  color-scale type (sequential vs. diverging) to use, and why -- to be
  settled once the difference-map mode (paper #1 above) is implemented and
  we can see whether a diverging scale (for signed differences) reads better
  than the sequential one used for raw power/variability.
