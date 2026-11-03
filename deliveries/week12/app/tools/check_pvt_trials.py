"""Diagnostic: are the trial-level PVT files of ds004902 consistent with the dataset summary columns?

Result on 2 November 2026: NO. The trial files do not reproduce the summaries in participants.tsv (median RT within
1 ms in 11 of 66 sessions; lapses equal in 17 of 66) and, with the SessionOrder mapping used for the EEG, only 11
of 29 people are slower after deprivation (mean change −1.7 ms), which is implausible after 24–30 h awake. The
trial files are therefore NOT used by the app; the app uses the summary columns (PVT_item1–3) as the official
source. Writes nothing; prints the checks.


Source: ds004902 sub-*/ses-*/beh/*_task-pvt_beh.tsv (one 5-min PVT per session, recorded separately from the EEG:
the EEG files contain no event markers, so the PVT cannot be time-locked to the EEG).
Cleaning, documented in the output:
  - the RT column is always the second one: several files have misspelled headers (respones_time, resoonse_time,
    response, trail);
  - RT < 100 ms = false start (anticipation), excluded (Basner and Dinges, 2011);
  - lapse = RT >= 500 ms; very long RTs (misses) are kept as lapses.
Session -> condition (NS/SD) from SessionOrder in participants.tsv. The script checks its per-session median RT and
lapse count against the dataset summary columns (PVT_item2 = median RT, PVT_item1 = lapses) and prints the agreement.

Usage (from deliveries/week12/app/):  python3 tools/build_pvt.py   (standard library only; needs <root>/ds004902)
"""
import csv
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
DS = REPO / "ds004902"
PARTICIPANTS = REPO / "deliveries" / "week04" / "data" / "participants.tsv"
FALSE_START, LAPSE = 100.0, 500.0


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def main():
    if not DS.exists():
        raise SystemExit(f"Dataset missing at {DS}: see deliveries/week06/README.md")
    parts = {r["participant_id"]: r for r in csv.DictReader(PARTICIPANTS.open(encoding="utf-8"), delimiter="\t")}
    out, odd_headers, dropped, check = {}, [], 0, []
    for f in sorted(DS.glob("sub-*/ses-*/beh/*pvt_beh.tsv")):
        pid, ses = f.parts[-4], f.parts[-3]
        p = parts.get(pid)
        if not p or "->" not in (p.get("SessionOrder") or ""):
            continue
        first, second = p["SessionOrder"].split("->")
        cond = first if ses == "ses-1" else second
        rows = list(csv.reader(f.open(encoding="utf-8"), delimiter="\t"))
        if rows and rows[0][-1].strip() != "response_time":
            odd_headers.append(f"{pid}/{ses}: {' | '.join(rows[0])}")
        rts = [v for v in (num(r[1]) for r in rows[1:] if len(r) > 1) if v is not None]
        kept = [v for v in rts if v >= FALSE_START]
        dropped += len(rts) - len(kept)
        out.setdefault(pid, {})[cond] = [round(v) for v in kept]
        med, lap = num(p.get(f"PVT_item2_{cond}")), num(p.get(f"PVT_item1_{cond}"))
        if med is not None and kept:
            check.append((statistics.median(kept), med, sum(v >= LAPSE for v in kept), lap))
    meta = {"source": "ds004902 sub-*/ses-*/beh/*_task-pvt_beh.tsv", "false_start_ms": FALSE_START, "lapse_ms": LAPSE,
            "people": len(out), "both_conditions": sum(1 for v in out.values() if {"NS", "SD"} <= set(v)),
            "false_starts_excluded": dropped, "misspelled_headers": odd_headers,
            "note": "PVT recorded separately from the resting EEG (no EEG event markers): no ERP is possible."}
    med_ok = sum(abs(a - b) <= 1 for a, b, _, _ in check)
    lap_ok = sum(c == d for _, _, c, d in check if d is not None)
    print(f"{meta['people']} people, {meta['both_conditions']} with NS and SD; {dropped} false starts excluded; "
          f"{len(odd_headers)} misspelled headers.")
    print(f"Check against participants.tsv: median RT within 1 ms in {med_ok} of {len(check)} sessions; "
          f"lapses (>= {LAPSE:.0f} ms) equal in {lap_ok} of {sum(1 for c in check if c[3] is not None)}.")
    both = [p for p, v in out.items() if {"NS", "SD"} <= set(v)]
    slower = sum(statistics.median(out[p]["SD"]) > statistics.median(out[p]["NS"]) for p in both)
    dmed = statistics.mean(statistics.median(out[p]["SD"]) - statistics.median(out[p]["NS"]) for p in both)
    print(f"With the SessionOrder mapping: slower in SD for {slower} of {len(both)} people (mean change {dmed:+.1f} ms).")
    print("Conclusion: the trial files are not consistent with the summaries; do not use them without clarification from the authors.")


if __name__ == "__main__":
    main()
