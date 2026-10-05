/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CITY / MARKET DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * Two things vary by location and both are now used by the calculator:
 *
 *   1. PEAK SUN HOURS  — derived from your own src/data/locations.json.
 *      The calculator previously hard-coded 4.8 PSH for the entire country,
 *      which under-sized Abuja (your data says 5.8) and over-sized Port Harcourt
 *      (4.9). Using the real figure per market makes the array sizing defensible.
 *
 *   2. COST MULTIPLIER — an ESTIMATE, not a measurement. See the caveat below.
 *
 * ── HONEST CAVEAT ON THE COST MULTIPLIERS ────────────────────────────────────
 * We deliberately did NOT derive these from `avgInstallationCost` in
 * locations.json. That field spans different SYSTEM SIZES per hub, not the same
 * system at different prices — so normalising it produced nonsense (Lagos came
 * out 2% CHEAPER than Ibadan, and Osogbo 56% cheaper, which no installer in
 * Nigeria would recognise).
 *
 * These multipliers instead reflect the three factors that genuinely move
 * installed cost between Nigerian markets:
 *
 *   • Labour rates        — Abuja and Lagos run materially higher than Ibadan
 *   • Freight / logistics — distance from Lagos ports, plus access risk
 *   • Competitive depth   — more installers competing compresses margin
 *
 * They are estimates for benchmarking, and they are deliberately modest. TREAT
 * THEM AS A STARTING POINT AND REFINE WITH REAL QUOTE DATA as your installer
 * network grows. Every value is in this one object — change it in one place.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface MarketConfig {
  /** Key used in the calculator's city selector. */
  key: string;
  /** Label shown to the user. */
  label: string;
  /** Annual average peak sun hours/day. Source: locations.json hubs. */
  peakSunHours: number;
  /** Which hubs the PSH figure was averaged from (shown in the assumptions panel). */
  pshBasis: string;
  /** Installed-cost multiplier vs the Ibadan baseline of 1.00. ESTIMATE. */
  costMultiplier: number;
  /** One-line reason for the multiplier, displayed in the UI. */
  costReason: string;
}

/**
 * PSH values are the mean of the hubs listed in `pshBasis`, taken directly from
 * locations.json `peakSunHours`. Where a market has several hubs we use the mean
 * of its own hubs rather than a national figure.
 */
export const MARKETS: MarketConfig[] = [
  {
    key: 'Ibadan',
    label: 'Ibadan (Bodija, Oluyole, Jericho, Akobo)',
    peakSunHours: 5.3,
    pshBasis: 'mean of 6 Ibadan hubs (5.2–5.4)',
    costMultiplier: 1.0,
    costReason: 'baseline market',
  },
  {
    key: 'Lagos',
    label: 'Lagos (Lekki, Ikeja, Ajah, Surulere)',
    peakSunHours: 5.05,
    pshBasis: 'mean of 4 Lagos hubs (5.0–5.1)',
    costMultiplier: 1.12,
    costReason: 'higher labour rates and estate access logistics',
  },
  {
    key: 'Ogun',
    label: 'Ogun (Abeokuta, Mowe-Ibafo, Ota, Sagamu)',
    peakSunHours: 5.25,
    pshBasis: 'mean of Abeokuta (5.3) and Mowe-Ibafo (5.2)',
    costMultiplier: 1.03,
    costReason: 'Lagos-adjacent labour market',
  },
  {
    key: 'Abuja',
    label: 'Abuja FCT (Maitama, Gwarinpa, Wuse 2, Jabi)',
    peakSunHours: 5.8,
    pshBasis: 'Abuja FCT hub (highest yield in your dataset)',
    costMultiplier: 1.15,
    costReason: 'highest labour and living costs; inland freight from Lagos',
  },
  {
    key: 'Port Harcourt',
    label: 'Port Harcourt (GRA, Peter Odili, Trans-Amadi)',
    peakSunHours: 4.9,
    pshBasis: 'Port Harcourt hub (lowest yield in your dataset)',
    costMultiplier: 1.18,
    costReason: 'highest freight cost and logistics access risk',
  },
  {
    key: 'Other South-West',
    label: 'Other South-West (Osogbo, Akure, Ado-Ekiti)',
    peakSunHours: 5.35,
    pshBasis: 'mean of Osogbo (5.4) and Akure (5.3)',
    costMultiplier: 0.97,
    costReason: 'lower labour cost, close to the Ibadan supply chain',
  },
  {
    key: 'Other Major City',
    label: 'Other Major City (Benin, Warri, Enugu)',
    peakSunHours: 5.1,
    pshBasis: 'Benin City hub (5.1)',
    costMultiplier: 1.08,
    costReason: 'secondary-city freight premium',
  },
];

export const getMarket = (key: string): MarketConfig =>
  MARKETS.find((m) => key === m.key) ?? MARKETS[0];

/**
 * Array derating safety factor.
 *
 * Matches your own published figure in
 * `harmattan-monsoon-solar-derating-study.astro`:
 *
 *   "Installers must design Nigerian systems with an aggregate 1.25x to 1.30x
 *    Derating Safety Factor to guarantee 100% daily battery replenishment
 *    across all 12 months."
 *
 * The calculator previously used 1.25x — the BOTTOM of your own recommended
 * range. We now default to 1.30x (the top) because that aggregate already
 * absorbs all three losses your study documents:
 *
 *   • Thermal:   58–64°C cell temps → 11–13.5% loss
 *   • Harmattan: unwashed dust (Nov–Feb) → 15–28% loss
 *   • Monsoon:   overcast (Jun–Aug) → up to 35% irradiance loss
 *
 * NOTE: because the aggregate already covers all three, do NOT add a separate
 * seasonal toggle on top — that would double-count. A seasonal model would need
 * month-by-month irradiance data, which we do not currently have.
 */
export const ARRAY_DERATING_FACTOR = 1.3;

/**
 * Panel count granularity. Sizing rounds UP to the next whole panel, so a
 * fractional requirement always becomes a purchasable array.
 */
export const PANEL_WATTS = 550;

/**
 * Copper resistivity in Ω·mm²/m at ~20°C, used for the voltage-drop check.
 * Nigeria's ambient is higher, which raises resistance — hence the conservative
 * 2% drop target rather than 3%.
 */
export const COPPER_RESISTIVITY = 0.0172;

/** Target maximum voltage drop on DC cabling, as a percentage. */
export const MAX_VOLTAGE_DROP_PCT = 2;
