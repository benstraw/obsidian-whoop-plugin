import { PersonaData } from "../render.ts";
import { millisToMinutes, fmt0, fmt1 } from "../render.ts";

export function renderPersona(p: PersonaData): string {
  return `---
type: context
tags:
  - ai-brain/context
  - fitness/whoop
updated: ${p.generatedDate}
---

# WHOOP Health Persona

> [!info] Auto-generated
> Regenerate with the **WHOOP: Generate 30-day health persona** command. Covers ${p.periodStart} → ${p.periodEnd}.

## Health Persona (30-Day Rolling Summary)

**Period:** ${p.periodStart} → ${p.periodEnd}

### Recovery
- Average Recovery Score: **${fmt0(p.avgRecovery)}%**
- Average HRV: **${fmt1(p.avgHRV)} ms**
- HRV Trend: **${p.hrvTrend}**
- Average RHR: **${fmt0(p.avgRHR)} bpm**

### Sleep
- Average Sleep Duration: **${millisToMinutes(p.avgSleepMillis)}**
- Average Sleep Performance: **${fmt0(p.avgSleepPerf)}%**

### Strain
- Average Day Strain: **${fmt1(p.avgStrain)}**
- Total Workouts: **${p.totalWorkouts}**

### Recovery Distribution
- Green (67–100): ${p.greenDays} days
- Yellow (34–66): ${p.yellowDays} days
- Red (0–33): ${p.redDays} days
`;
}
