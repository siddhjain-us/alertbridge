/** Demo scenarios for POST /simulate — NWS-style names + CAP-like descriptions */

export interface SimulateScenario {
  id: string;
  label: string;
  event: string;
  severity: string;
  description: string;
}

export const SIMULATE_SCENARIOS: SimulateScenario[] = [
  {
    id: 'flash_flood',
    label: 'Flash flood',
    event: 'Flash Flood Warning',
    severity: 'Extreme',
    description:
      'FLASH FLOOD WARNING in effect. Rapid rise of water expected in low-lying areas. ' +
      'Move to higher ground immediately. Do not walk, swim, or drive through flood waters.',
  },
  {
    id: 'hurricane',
    label: 'Hurricane / tropical cyclone',
    event: 'Hurricane Warning',
    severity: 'Extreme',
    description:
      'HURRICANE WARNING: Dangerous winds over 74 mph and life-threatening storm surge expected along the coast. ' +
      'Evacuate if ordered. Shelter in a small interior room away from windows if you cannot leave.',
  },
  {
    id: 'earthquake',
    label: 'Earthquake',
    event: 'Earthquake Warning',
    severity: 'Severe',
    description:
      'Strong ground shaking expected or occurring. Drop, Cover, and Hold On. Protect your head and neck. ' +
      'Expect aftershocks; avoid damaged buildings and downed power lines.',
  },
  {
    id: 'wildfire',
    label: 'Wildfire',
    event: 'Wildfire Warning',
    severity: 'Severe',
    description:
      'Wildfire spreading rapidly in the area due to dry fuels and wind. Evacuate immediately along designated routes. ' +
      'Do not delay; smoke may reduce visibility—stay low if trapped in smoke.',
  },
  {
    id: 'tornado',
    label: 'Tornado',
    event: 'Tornado Warning',
    severity: 'Extreme',
    description:
      'TORNADO WARNING: A tornado is occurring or imminent. Go to a basement or interior room on the lowest floor. ' +
      'Avoid windows; cover yourself to protect from flying debris.',
  },
  {
    id: 'drought',
    label: 'Drought / water shortage',
    event: 'Drought Advisory',
    severity: 'Moderate',
    description:
      'Prolonged dry conditions: severe water shortage risk and high wildfire danger. Conserve water; follow burn bans. ' +
      'Limit outdoor activity during peak heat; check on vulnerable neighbors.',
  },
  {
    id: 'tsunami',
    label: 'Tsunami',
    event: 'Tsunami Warning',
    severity: 'Extreme',
    description:
      'TSUNAMI WARNING: Dangerous flooding waves possible or expected along the coast. Move inland to high ground immediately. ' +
      'Do not return until officials say it is safe; stay away from harbors and beaches.',
  },
  {
    id: 'landslide',
    label: 'Landslide / debris flow',
    event: 'Landslide Warning',
    severity: 'Severe',
    description:
      'Unstable slopes may collapse due to heavy rain or shaking. Move away from steep terrain, cliffs, and drainage paths. ' +
      'Watch for cracks in ground or sudden water changes; evacuate if debris flow is possible.',
  },
  {
    id: 'volcanic',
    label: 'Volcanic activity',
    event: 'Volcano Warning',
    severity: 'Extreme',
    description:
      'Volcanic hazard in the area: ash fall, lava flows, or toxic gases possible. Follow evacuation orders; avoid river valleys. ' +
      'Wear N95 masks if ash is falling; shelter indoors and seal windows if advised.',
  },
];

const byId = new Map(SIMULATE_SCENARIOS.map((s) => [s.id, s]));

/** Missing or empty raw defaults to `flash_flood`. Unknown id returns undefined. */
export function getScenario(raw: unknown): SimulateScenario | undefined {
  const id =
    raw === undefined || raw === null || String(raw).trim() === ''
      ? 'flash_flood'
      : String(raw).trim();
  return byId.get(id);
}

export function scenarioIds(): string[] {
  return SIMULATE_SCENARIOS.map((s) => s.id);
}
