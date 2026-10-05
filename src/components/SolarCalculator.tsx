import React, { useState, useMemo } from 'react';
import { 
  Sun, Battery, Zap, ShieldCheck, 
  RotateCcw, MessageCircle, FileText, ShoppingCart, Sparkles,
  Copy, Check, Printer
} from 'lucide-react';
import { WHATSAPP_NUMBER, EARTHBOND } from '../config/site';
import {
  MARKETS,
  getMarket,
  ARRAY_DERATING_FACTOR,
  PANEL_WATTS,
  COPPER_RESISTIVITY,
  MAX_VOLTAGE_DROP_PCT,
} from '../config/markets';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENGINEERING CONSTANTS
 * ─────────────────────────────────────────────────────────────────────────────
 * SURGE_FACTOR — a motor's inrush current at start, expressed as a multiple of
 * its running wattage. This is the value most solar sizing tools ignore, and it
 * is the #1 cause of "my inverter trips when the pump starts" complaints.
 *
 * These are deliberately conservative. Nigerian installers routinely under-size
 * inverters because they only size for running load.
 *
 *   Resistive loads (LED, TV, laptop PSU)  → ~1.0–1.2× (near-instantaneous)
 *   Induction motors (fans, fridge)        → ~2.5–3×
 *   Inverter compressor ACs                → ~3×  (softer than fixed-speed)
 *   Submersible / borehole pumps           → ~4×  (worst case, hard start)
 */
const CONTINUOUS_MARGIN = 1.3;   // headroom above steady running load
const INVERTER_SURGE_MULTIPLE = 2.0; // quality pure sine wave inverters do ~2× for a few seconds
const INVERTER_EFFICIENCY = 0.9; // DC→AC conversion loss, so DC draw > AC load

/**
 * Standard continuous discharge ratings (amps) of lithium battery BMS units sold
 * in Nigeria. Used to size the battery bank against surge, not just capacity.
 */
const BMS_SIZES = [100, 150, 200, 250, 300];

/**
 * Copper cable — two independent constraints, and the cable must satisfy BOTH:
 *
 *   1. VOLTAGE DROP — too much drop wastes power as heat and can brown-out the
 *      inverter on surge. Governs on LONG runs.
 *
 *   2. AMPACITY — the cable's current-carrying capacity. Exceed it and the
 *      insulation overheats, which is a fire risk, not just an efficiency
 *      problem. Governs on SHORT runs with high current.
 *
 * Voltage drop alone produces dangerously thin cable on short, high-current
 * battery runs: a 48V bank at ~92A over 1.5m "only" needs ~5mm² for 2% drop,
 * but 5mm² carrying 92A will cook. Ampacity is the binding constraint there.
 *
 * Ampacity figures are approximate PVC-insulated copper in free air, and are
 * intentionally conservative. Real ratings vary with installation method,
 * bundling and ambient temperature.
 */
const CABLE_SPECS: Array<{ mm2: number; amps: number }> = [
  { mm2: 2.5, amps: 24 },
  { mm2: 4, amps: 32 },
  { mm2: 6, amps: 41 },
  { mm2: 10, amps: 57 },
  { mm2: 16, amps: 76 },
  { mm2: 25, amps: 101 },
  { mm2: 35, amps: 125 },
  { mm2: 50, amps: 151 },
  { mm2: 70, amps: 192 },
  { mm2: 95, amps: 232 },
];

/**
 * Practical floor for battery circuits. Matches the minimum this site already
 * publishes in its vetting rules ("16mm² / 25mm² pure copper battery cables").
 * Short battery runs can pass the maths at 4–6mm², but undersized DC battery
 * cable is a common and dangerous shortcut, so we never recommend below this.
 */
const MIN_BATTERY_CABLE_MM2 = 16;
/** Common practical floor for array string cable. */
const MIN_ARRAY_CABLE_MM2 = 4;

interface Appliance {
  id: string;
  name: string;
  defaultWatts: number;
  category: 'lighting' | 'electronics' | 'cooling' | 'heavy';
  defaultHours: number;
  /** Inrush multiple of running watts at motor start. 1 = no meaningful surge. */
  surgeFactor: number;
}

const APPLIANCES: Appliance[] = [
  { id: 'led_lights', name: 'LED Bulbs / Energy Savers', defaultWatts: 10, category: 'lighting', defaultHours: 8, surgeFactor: 1 },
  { id: 'fans', name: 'Standing / Ceiling Fans', defaultWatts: 65, category: 'cooling', defaultHours: 12, surgeFactor: 2.5 },
  { id: 'laptops', name: 'Laptops / Workstations', defaultWatts: 70, category: 'electronics', defaultHours: 8, surgeFactor: 1.2 },
  { id: 'starlink', name: 'Starlink / 5G Wi-Fi Router', defaultWatts: 50, category: 'electronics', defaultHours: 24, surgeFactor: 1.2 },
  { id: 'tv', name: 'Smart TV + Decoder', defaultWatts: 120, category: 'electronics', defaultHours: 6, surgeFactor: 1.2 },
  { id: 'inverter_fridge', name: 'Inverter Refrigerator', defaultWatts: 150, category: 'cooling', defaultHours: 18, surgeFactor: 3 },
  { id: 'deep_freezer', name: 'Chest Deep Freezer', defaultWatts: 250, category: 'cooling', defaultHours: 12, surgeFactor: 3 },
  { id: 'ac_1hp', name: '1.0 HP Inverter AC', defaultWatts: 750, category: 'heavy', defaultHours: 6, surgeFactor: 3 },
  { id: 'ac_1_5hp', name: '1.5 HP Inverter AC', defaultWatts: 1100, category: 'heavy', defaultHours: 6, surgeFactor: 3 },
  { id: 'pump', name: '1HP Submersible Water Pump', defaultWatts: 850, category: 'heavy', defaultHours: 1, surgeFactor: 4 },
];

export default function SolarCalculator() {
  const [counts, setCounts] = useState<Record<string, number>>({
    led_lights: 6,
    fans: 3,
    laptops: 1,
    starlink: 1,
    tv: 1,
    inverter_fridge: 1,
    deep_freezer: 0,
    ac_1hp: 0,
    ac_1_5hp: 0,
    pump: 0,
  });

  const [hours, setHours] = useState<Record<string, number>>({
    led_lights: 8,
    fans: 12,
    laptops: 8,
    starlink: 24,
    tv: 6,
    inverter_fridge: 18,
    deep_freezer: 12,
    ac_1hp: 6,
    ac_1_5hp: 6,
    pump: 1,
  });

  const [selectedCity, setSelectedCity] = useState('Ibadan');
  /**
   * Cable runs, in metres, one-way.
   *
   * These are SEPARATE because the two runs are physically different lengths:
   *   • Array → controller: panels are on the roof, the controller is indoors.
   *     Typically 5–30m, and the one the user actually needs to measure.
   *   • Battery → inverter: these sit next to each other by design. 1.5m
   *     default. Running a battery 15m from its inverter would need ~188mm²
   *     of copper — not a cable anyone installs, but a sign the battery is in
   *     the wrong place. The UI says so.
   */
  const [arrayRunMetres, setArrayRunMetres] = useState(15);
  const [batteryRunMetres, setBatteryRunMetres] = useState(1.5);
  const [copied, setCopied] = useState(false);

  const updateCount = (id: string, delta: number) => {
    setCounts(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const updateHours = (id: string, val: number) => {
    setHours(prev => ({
      ...prev,
      [id]: Math.max(1, Math.min(24, val))
    }));
  };

  const resetAll = () => {
    setCounts({
      led_lights: 4,
      fans: 2,
      laptops: 1,
      starlink: 1,
      tv: 1,
      inverter_fridge: 0,
      deep_freezer: 0,
      ac_1hp: 0,
      ac_1_5hp: 0,
      pump: 0,
    });
    // Also restore run hours — previously stale values survived a reset, so
    // "reset" left the results showing whatever hours the user had dragged.
    setHours({
      led_lights: 8,
      fans: 12,
      laptops: 8,
      starlink: 24,
      tv: 6,
      inverter_fridge: 18,
      deep_freezer: 12,
      ac_1hp: 6,
      ac_1_5hp: 6,
      pump: 1,
    });
    setSelectedCity('Ibadan');
    setArrayRunMetres(15);
    setBatteryRunMetres(1.5);
  };

  const handleCopySpecs = () => {
    const text = 
`☀️ SOLAR SYSTEM SIZING & BOQ SPECIFICATION
📍 Target Location: ${selectedCity}
🏢 Source: IbadanSolarHub.com.ng (Ibadan Solar Hub)

⚡ AUDITED LOAD METRICS:
• Running Load: ${stats.continuousWatts}W
• Daily Energy: ${stats.dailyKwh} kWh/day

• Peak Starting Surge: ${stats.peakSurgeWatts}W (largest motor: ${stats.largestSurgeAppliance || 'n/a'})
• Momentary DC Draw at Start: ~${stats.peakDcCurrent}A at ${stats.nominalVolts}V

⚙️ SYSTEM HARDWARE SPECIFICATIONS:
• Inverter: ${stats.recommendedKva} kVA Pure Sine Wave (${stats.systemVoltage})
• Battery Bank: ${stats.recommendedLithiumKwh} kWh LiFePO4 Lithium (or ${stats.recommendedTubularAh}Ah Tubular at ${nominalVolts}V)
• Solar Panels: ${stats.panels550WNeeded}x 550W Tier-1 Mono PERC (${stats.panels550WNeeded * PANEL_WATTS}W Array)
• Array Basis: ${stats.peakSunHours} peak sun hours/day (${stats.pshBasis}) × ${stats.arrayDeratingFactor} derating
• Min Battery Cable: ${stats.batteryCableSpec} mm² copper (${stats.batteryRunMetres}m run, ~${stats.batteryCurrent}A surge)
• Min Array Cable: ${stats.arrayCableSpec} mm² copper (${stats.arrayRunMetres}m run, ${stats.seriesCount}S string at ${stats.arrayStringVoltage}V)
• All DC cable sized for ≤${MAX_VOLTAGE_DROP_PCT}% voltage drop, 100% pure copper
• Turnkey Benchmark: ${stats.costRange} (regional ×${stats.costMultiplier} applied: ${stats.costReason})

🛡️ VETTING MANDATES BEFORE HIRING AN INSTALLER:
1. Pure copper cables at or above the sizes computed above
2. Require DC Surge Protection Device (SPD) + DC Breaker
3. Verify Lithium battery cycle life rating (min. 4,000 cycles at 80% DoD)
4. Confirm the inverter's surge rating covers your ${stats.peakSurgeWatts}W starting load
5. Confirm the battery BMS can discharge ${stats.peakDcCurrent}A momentarily (min ${stats.recommendedBmsAmps}A rating) — undersized BMS units cut out on motor start

Get verified installer quotes or calculate custom setups: https://ibadansolarhub.com.ng/calculator`;

    /*
      Clipboard API needs a secure context and is blocked in some in-app
      browsers (common on Nigerian Android WebViews). Fall back to a hidden
      textarea + execCommand so the button never silently does nothing.
    */
    const fallbackCopy = (value: string): boolean => {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };

    const finish = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(finish).catch(() => {
        if (fallbackCopy(text)) finish();
      });
    } else if (fallbackCopy(text)) {
      finish();
    }
  };

  const handlePrintBoQ = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const applianceRows = APPLIANCES.filter(app => (counts[app.id] || 0) > 0)
      .map(app => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${app.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${counts[app.id]}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${app.defaultWatts}W</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;"><strong>${counts[app.id] * app.defaultWatts}W</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${hours[app.id] || app.defaultHours} hrs</td>
        </tr>
      `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Solar Sizing Specification & BOQ Summary - IbadanSolarHub</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 30px; margin: 0; }
          .header { border-bottom: 3px solid #f59e0b; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 22px; font-weight: 900; color: #0f172a; }
          .logo span { color: #f59e0b; }
          .meta { font-size: 13px; color: #64748b; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 25px; margin-bottom: 10px; border-left: 4px solid #f59e0b; padding-left: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
          th { background: #f8fafc; padding: 10px 8px; text-align: left; border-bottom: 2px solid #cbd5e1; color: #334155; }
          .spec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
          .spec-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
          .spec-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
          .spec-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .spec-sub { font-size: 12px; color: #475569; margin-top: 4px; }
          .highlight-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; margin-top: 20px; }
          .vetting-rules { font-size: 12px; color: #334155; line-height: 1.6; }
          .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Ibadan<span>SolarHub</span></div>
            <div class="meta">Nigeria Solar Sizing Authority • Engineering Benchmark</div>
          </div>
          <div class="meta" style="text-align: right;">
            <div><strong>Location Target:</strong> ${stats.marketLabel}</div>
            <div><strong>Peak Sun Hours:</strong> ${stats.peakSunHours}/day (${stats.arrayDeratingFactor}× derating)</div>
            <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        <div class="section-title">1. Engineered System Specifications</div>
        <div class="spec-grid">
          <div class="spec-card">
            <div class="spec-label">Pure Sine Wave Inverter</div>
            <div class="spec-val">${stats.recommendedKva} kVA (${stats.systemVoltage})</div>
            <div class="spec-sub">Continuous Running Load: ${stats.continuousWatts}W (with surge reserve)</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Battery Storage Capacity</div>
            <div class="spec-val">${stats.recommendedLithiumKwh} kWh LiFePO4 Lithium</div>
            <div class="spec-sub">Or Tubular Equivalent: ${stats.recommendedTubularAh}Ah at ${nominalVolts}V (${stats.tubularUnitsInSeries} x 12V in series, 50% DoD)</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Solar PV Array</div>
            <div class="spec-val">${stats.panels550WNeeded}x 550W Tier-1 Panels</div>
            <div class="spec-sub">Total Array: ${stats.panels550WNeeded * PANEL_WATTS}W — sized at ${stats.peakSunHours} peak sun hours/day with a ${stats.arrayDeratingFactor}× derating factor for Nigerian heat, harmattan dust and monsoon cloud</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Estimated Turnkey Budget</div>
            <div class="spec-val" style="color: #047857;">${stats.costRange}</div>
            <div class="spec-sub">Includes BOS, Cables, Protection & Workmanship. Regional adjustment ×${stats.costMultiplier} applied (${stats.costReason}).</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Minimum DC Cable Sizes</div>
            <div class="spec-val">${stats.batteryCableSpec} mm² / ${stats.arrayCableSpec} mm²</div>
            <div class="spec-sub">Battery→inverter over ${stats.batteryRunMetres}m at ~${stats.batteryCurrent}A surge, and Array→controller over ${stats.arrayRunMetres}m. Sized for max ${MAX_VOLTAGE_DROP_PCT}% voltage drop in 100% pure copper.</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Peak Starting Surge</div>
            <div class="spec-val">${stats.peakSurgeWatts}W</div>
            <div class="spec-sub">Largest motor: ${stats.largestSurgeAppliance || 'n/a'} — inverter surge rating must cover this</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Momentary DC Draw</div>
            <div class="spec-val" style="color: ${stats.bmsUndersized ? '#b91c1c' : '#0f172a'};">~${stats.peakDcCurrent}A @ ${stats.nominalVolts}V</div>
            <div class="spec-sub">Battery BMS must be rated <strong>${stats.recommendedBmsAmps}A+</strong> continuous${stats.bmsUndersized ? ' — a 100A BMS will cut out on motor start' : ''}</div>
          </div>
        </div>

        <div class="section-title">2. Appliance Load Audit</div>
        <table>
          <thead>
            <tr>
              <th>Appliance Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Power</th>
              <th style="text-align: right;">Total Power</th>
              <th style="text-align: right;">Daily Run</th>
            </tr>
          </thead>
          <tbody>
            ${applianceRows}
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td colspan="3" style="padding: 8px;">Total Calculated Energy Consumption:</td>
              <td style="padding: 8px; text-align: right;">${stats.continuousWatts}W</td>
              <td style="padding: 8px; text-align: right;">${stats.dailyKwh} kWh/day</td>
            </tr>
          </tbody>
        </table>

        <div class="highlight-box">
          <div style="font-weight: 700; color: #065f46; font-size: 13px; margin-bottom: 6px;">
            ⚠️ Installer Vetting Mandates (Mandatory Contract Clauses)
          </div>
          <div class="vetting-rules">
            1. <strong>DC Surge Protective Device (SPD):</strong> Installer MUST install a dedicated DC SPD and DC circuit breaker between solar array and MPPT.<br>
            2. <strong>Cable Gauge:</strong> Minimum <strong>${stats.batteryCableSpec} mm²</strong> battery cable and <strong>${stats.arrayCableSpec} mm²</strong> array cable, 100% pure copper with heavy-duty pressed lugs — sized for this specific installation — ${stats.batteryRunMetres}m battery run at ~${stats.batteryCurrent}A surge, ${stats.arrayRunMetres}m array run.<br>
            3. <strong>Cycle Rating:</strong> Lithium batteries must carry written manufacturer warranty for ≥ 4,000 cycles at 80% DoD.<br>
            4. <strong>Inverter Surge Rating:</strong> Must cover the ${stats.peakSurgeWatts}W starting load, not just the ${stats.continuousWatts}W running load.<br>
            5. <strong>Battery BMS Discharge Rating:</strong> Must sustain ~${stats.peakDcCurrent}A momentarily (specify ${stats.recommendedBmsAmps}A+ continuous), or the BMS will cut out when a motor starts.
          </div>
        </div>

        <div class="footer">
          Generated via <strong>https://ibadansolarhub.com.ng/calculator</strong> • Publisher: <strong>Ibadan Solar Hub</strong> (Power Without The Panic)<br>
          Verify any installer's quote against this specification — sizing, surge rating, cable gauge and SPD requirements.
          ${EARTHBOND.url ? `<br>Funding a 5kVA+ system? See monthly payment plans: <strong>${EARTHBOND.name}</strong> — ${EARTHBOND.url}` : ''}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Calculations
  const stats = useMemo(() => {
    let totalContinuousWatts = 0;
    let totalDailyWattHours = 0;
    /** Largest single motor's extra inrush above its own running wattage. */
    let largestMotorSurgeExtra = 0;
    let largestSurgeAppliance = '';

    APPLIANCES.forEach(app => {
      const count = counts[app.id] || 0;
      if (count > 0) {
        const itemWatts = count * app.defaultWatts;
        totalContinuousWatts += itemWatts;
        const itemHours = hours[app.id] || app.defaultHours;
        totalDailyWattHours += itemWatts * itemHours;

        /*
          Surge model: the worst realistic case is the single largest motor
          starting while everything else is already running. We deliberately do
          NOT assume every motor starts simultaneously — that over-sizes badly.
        */
        const surgeExtra = app.defaultWatts * (app.surgeFactor - 1);
        if (surgeExtra > largestMotorSurgeExtra) {
          largestMotorSurgeExtra = surgeExtra;
          largestSurgeAppliance = app.name;
        }
      }
    });

    /*
      Inverter sizing is driven by TWO constraints and we take the larger:
        1. Steady-state: running load + 30% headroom for future additions
        2. Starting:    peak inrush must not exceed the inverter's surge rating
                        (quality pure sine wave units sustain ~2× for a few sec)
    */
    const continuousBasisWatts = totalContinuousWatts * CONTINUOUS_MARGIN;
    const peakSurgeWatts = totalContinuousWatts + largestMotorSurgeExtra;

    /*
      Both bases are in WATTS, then converted to kVA once at the end (1 kVA ≈ 1 kW
      at the unity-ish power factors pure sine wave inverters actually see).

      peakSurgeWatts is what the load momentarily demands. The inverter can supply
      INVERTER_SURGE_MULTIPLE × its nameplate for a few seconds, so the smallest
      nameplate that survives the start is peakSurge / INVERTER_SURGE_MULTIPLE.
    */
    const surgeBasisWatts = peakSurgeWatts / INVERTER_SURGE_MULTIPLE;
    const requiredKva = Math.max(continuousBasisWatts, surgeBasisWatts) / 1000;

    let recommendedKva = 1.2;
    let systemVoltage = '12V';

    if (requiredKva <= 1.0) {
      recommendedKva = 1.2;
      systemVoltage = '12V';
    } else if (requiredKva <= 2.2) {
      recommendedKva = 2.5;
      systemVoltage = '24V';
    } else if (requiredKva <= 3.2) {
      recommendedKva = 3.5;
      systemVoltage = '24V or 48V';
    } else if (requiredKva <= 4.8) {
      recommendedKva = 5.0;
      systemVoltage = '48V';
    } else if (requiredKva <= 7.2) {
      recommendedKva = 7.5;
      systemVoltage = '48V';
    } else {
      recommendedKva = 10.0;
      systemVoltage = '48V High Voltage';
    }

    /** True when starting torque, not running load, set the inverter size. */
    const surgeDrivesSizing = surgeBasisWatts > continuousBasisWatts;

    /*
      ── THE CHECK THAT ACTUALLY BITES ──────────────────────────────────────────
      An inverter's surge rating is only half the story. The battery has to
      DELIVER that current. At 24V, a 4kW starting surge needs ~185A from the
      bank. Most budget 24V lithium BMS units are rated for 100A continuous and
      will cut out the instant a pump starts — which the owner then blames on
      "the inverter" or "the battery being fake".

      This is the single most common real-world under-sizing failure in Nigeria,
      and almost no sizing tool checks it.
    */
    const nominalVolts = parseInt(systemVoltage, 10) || 48;
    const peakDcCurrent = peakSurgeWatts / nominalVolts / INVERTER_EFFICIENCY;
    const recommendedBmsAmps =
      BMS_SIZES.find((size) => size >= peakDcCurrent) ?? BMS_SIZES[BMS_SIZES.length - 1];
    /** A 100A BMS is the most common unit sold — flag when it will not cope. */
    const bmsUndersized = peakDcCurrent > 100;

    // Battery Bank Sizing (LiFePO4 Lithium kWh vs Tubular Ah)
    const dailyKwh = totalDailyWattHours / 1000;
    const nightEnergyNeededKwh = dailyKwh * 0.65;
    const recommendedLithiumKwh = Math.max(1.28, Math.round((nightEnergyNeededKwh / 0.8) * 10) / 10);
    /*
      Tubular Ah was hardcoded to 24V regardless of the selected system voltage.
      That over-sized the recommendation 2x on every 48V system — the most common
      configuration on this site. Ah must be derived from the ACTUAL bank voltage.
    */
    const recommendedTubularAh =
      Math.round((nightEnergyNeededKwh * 1000) / (nominalVolts * 0.5) / 10) * 10;
    /** Tubular batteries are sold as 12V blocks; this is how many in series. */
    const tubularUnitsInSeries = Math.max(1, Math.round(nominalVolts / 12));

    /*
      ── SOLAR ARRAY SIZING ───────────────────────────────────────────────────
      Two corrections against the original formula:

      1. PEAK SUN HOURS are now per-market, taken from src/data/locations.json.
         The old code divided by a flat 4.8 for the whole country even though
         your own data ranges from 4.9 (Port Harcourt) to 5.8 (Abuja).

      2. DERATING is now ARRAY_DERATING_FACTOR = 1.30, matching the figure your
         own harmattan/monsoon study publishes. The old code used 1.25 — the
         bottom of your own recommended 1.25–1.30 range.

      Required array = daily energy × derating ÷ peak sun hours.
      Because the derating aggregate already covers thermal + harmattan +
      monsoon losses, there is deliberately no extra seasonal multiplier here.
    */
    const market = getMarket(selectedCity);
    const peakSunHours = market.peakSunHours;
    const dailySolarGenerationTarget = totalDailyWattHours * ARRAY_DERATING_FACTOR;
    const requiredSolarArrayWatts = Math.max(600, Math.round(dailySolarGenerationTarget / peakSunHours));
    const panels550WNeeded = Math.max(2, Math.ceil(requiredSolarArrayWatts / PANEL_WATTS));

    /*
      ── CABLE VOLTAGE DROP ───────────────────────────────────────────────────
      The site already tells buyers to insist on "16mm²–25mm² pure copper".
      Now that figure is COMPUTED from their actual current and measured run, so
      it can be checked against an installer's quote rather than taken on trust.

      Vdrop = (2 × L × I × ρ) / A   for a two-way DC run.
      Solved for A at MAX_VOLTAGE_DROP_PCT gives the minimum conductor size.

      Standard sizes round UP to the next cable actually stocked in Nigeria.
    */
    /** Minimum size to hit MAX_VOLTAGE_DROP_PCT over a two-way run. */
    const sizeForVoltageDrop = (lengthM: number, amps: number, volts: number) =>
      (2 * lengthM * amps * COPPER_RESISTIVITY) / (volts * (MAX_VOLTAGE_DROP_PCT / 100));

    /** Minimum size to carry the current without overheating. */
    const sizeForAmpacity = (amps: number) =>
      CABLE_SPECS.find((c) => c.amps >= amps)?.mm2 ?? CABLE_SPECS[CABLE_SPECS.length - 1];

    /**
     * The cable that satisfies the voltage drop target, the current-carrying
     * requirement, and the practical minimum — whichever is largest. Reports
     * which constraint was binding so the user can see the reasoning.
     */
    const sizeCable = (
      lengthM: number,
      amps: number,
      volts: number,
      practicalMin: number,
    ) => {
      const byDrop = sizeForVoltageDrop(lengthM, amps, volts);
      const byAmps = sizeForAmpacity(amps);
      const required = Math.max(byDrop, byAmps, practicalMin);
      const spec = CABLE_SPECS.find((c) => c.mm2 >= required) ?? CABLE_SPECS[CABLE_SPECS.length - 1];
      const driver =
        byAmps >= byDrop && byAmps > practicalMin
          ? 'current capacity'
          : byDrop > practicalMin
            ? 'voltage drop'
            : 'practical minimum';
      return { spec: spec.mm2, byDrop, byAmps, driver };
    };

    /* Battery → inverter: worst case is the surge current, not the running load. */
    const batteryCurrent = peakSurgeWatts / nominalVolts / INVERTER_EFFICIENCY;
    const batteryCable = sizeCable(
      Math.max(0.5, batteryRunMetres), batteryCurrent, nominalVolts, MIN_BATTERY_CABLE_MM2,
    );
    const batteryCableSpec = batteryCable.spec;

    /*
      Array → controller. Current depends on how the panels are wired in series,
      and installers use series to keep current (and therefore cable size) DOWN.

      We deliberately assume the CONSERVATIVE case: only 2 panels in series
      (Vmp ≈ 83V). Nearly every real installation runs more in series than that,
      which lowers the current and therefore reduces the cable needed — so this
      figure is a safe upper bound, not an under-estimate.

      Assuming a higher series count would need the actual MPPT input-voltage
      rating (145V and 450V units behave very differently), which we don't have.
      The UI tells the user to confirm the real string layout with their installer.
    */
    const seriesCount = panels550WNeeded >= 2 ? 2 : 1;
    const PANEL_VMP = 41.5;
    const arrayStringVoltage = PANEL_VMP * seriesCount;
    const arrayCurrent = requiredSolarArrayWatts / arrayStringVoltage;
    const arrayCable = sizeCable(
      Math.max(1, arrayRunMetres), arrayCurrent, arrayStringVoltage, MIN_ARRAY_CABLE_MM2,
    );
    const arrayCableSpec = arrayCable.spec;

    /* Flag the case where the battery is simply too far from the inverter. */
    const batteryRunTooLong = batteryRunMetres > 4;

    const round10k = (v: number) => Math.round(v / 10000) * 10000;

    let minCost = 0;
    let maxCost = 0;
    if (recommendedKva <= 1.2) {
      minCost = 850000;
      maxCost = 1250000;
    } else if (recommendedKva <= 2.5) {
      minCost = 1750000;
      maxCost = 2450000;
    } else if (recommendedKva <= 3.5) {
      minCost = 2850000;
      maxCost = 3700000;
    } else if (recommendedKva <= 5.0) {
      minCost = 3900000;
      maxCost = 5800000;
    } else if (recommendedKva <= 7.5) {
      minCost = 6200000;
      maxCost = 8500000;
    } else {
      minCost = 8500000;
      maxCost = 15000000;
    }

    /*
      Regional adjustment. Modest by design — see the caveat in
      src/config/markets.ts. The UI prints the multiplier so a buyer can see
      exactly what was applied rather than being handed an unexplained number.
    */
    minCost = round10k(minCost * market.costMultiplier);
    maxCost = round10k(maxCost * market.costMultiplier);

    const formatNaira = (val: number) => {
      return '₦' + val.toLocaleString('en-NG');
    };

    return {
      continuousWatts: Math.round(totalContinuousWatts),
      dailyKwh: dailyKwh.toFixed(1),
      recommendedKva,
      systemVoltage,
      recommendedLithiumKwh,
      recommendedTubularAh,
      tubularUnitsInSeries,
      requiredSolarArrayWatts,
      panels550WNeeded,
      costRange: `${formatNaira(minCost)} – ${formatNaira(maxCost)}`,
      peakSurgeWatts: Math.round(peakSurgeWatts),
      surgeDrivesSizing,
      largestSurgeAppliance,
      peakDcCurrent: Math.round(peakDcCurrent),
      recommendedBmsAmps,
      bmsUndersized,
      nominalVolts,
      /* Market + array + cable detail, surfaced in the UI and the printed BOQ */
      marketLabel: market.label,
      peakSunHours,
      pshBasis: market.pshBasis,
      costMultiplier: market.costMultiplier,
      costReason: market.costReason,
      arrayDeratingFactor: ARRAY_DERATING_FACTOR,
      batteryCableSpec,
      batteryCableDriver: batteryCable.driver,
      arrayCableSpec,
      arrayCableDriver: arrayCable.driver,
      arrayStringVoltage,
      seriesCount,
      arrayRunMetres,
      batteryRunMetres,
      batteryRunTooLong,
      batteryCurrent: Math.round(batteryCurrent),
      arrayCurrent: Math.round(arrayCurrent * 10) / 10,
    };
  }, [counts, hours, selectedCity, arrayRunMetres, batteryRunMetres]);

  const whatsappUrl = useMemo(() => {
    const text = encodeURIComponent(
      `Hello IbadanSolarHub! I just calculated my solar system requirements for my property in ${selectedCity}.\n\n` +
      `⚡ Continuous Running Load: ${stats.continuousWatts}W\n` +
      `🔋 Daily Energy Needed: ${stats.dailyKwh} kWh\n` +
      `⚙️ Recommended Inverter: ${stats.recommendedKva}kVA (${stats.systemVoltage})\n` +
      `🔋 Lithium Battery: ${stats.recommendedLithiumKwh} kWh\n` +
      `☀️ Solar Panels: ${stats.panels550WNeeded}x 550W Panels (${stats.requiredSolarArrayWatts}W)\n` +
      `📉 Peak Starting Surge: ${stats.peakSurgeWatts}W (~${stats.peakDcCurrent}A at ${stats.nominalVolts}V)\n` +
      `💰 Budget Estimate: ${stats.costRange}\n\n` +
      `Please connect me with verified solar installers in ${selectedCity} for an inspection and precise quotation.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }, [stats, selectedCity]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-solar-500/20 text-solar-400 border border-solar-500/30 rounded-full text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" /> 2026 Nigerian Solar Sizing Engine
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Interactive Solar Load & Cost Calculator</h2>
            <p className="text-slate-300 text-sm md:text-base mt-1">
              Select your household or office appliances to instantly calculate the required inverter size, lithium battery bank, solar panels, and estimated budget.
            </p>
          </div>
          <button 
            onClick={resetAll}
            className="self-start md:self-auto inline-flex items-center justify-center gap-1.5 min-h-11 px-3 bg-slate-700/60 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Appliance Configuration (Left Column) */}
        <div className="lg:col-span-7 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-solar-500" /> 1. Select Your Appliances
            </h3>
            <span className="text-xs text-slate-500">Add or adjust quantities</span>
          </div>

          <div className="space-y-3">
            {APPLIANCES.map(app => {
              const count = counts[app.id] || 0;
              const currentHours = hours[app.id] || app.defaultHours;
              return (
                <div 
                  key={app.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    count > 0 ? 'bg-amber-50/40 border-amber-200/80 shadow-sm' : 'bg-slate-50/50 border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm md:text-base">{app.name}</div>
                      <div className="text-xs text-slate-500">
                        Approx. {app.defaultWatts}W each • Total: <span className="font-medium text-slate-700">{count * app.defaultWatts}W</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/*
                        44×44px minimum touch targets — these are the most-tapped
                        controls on the site, used one-handed on mobile.
                        aria-labels added because "-" and "+" alone announce
                        nothing useful to a screen reader.
                      */}
                      <button
                        type="button"
                        onClick={() => updateCount(app.id, -1)}
                        disabled={count === 0}
                        aria-label={`Remove one ${app.name}`}
                        className="w-11 h-11 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span aria-hidden="true">−</span>
                      </button>
                      <span className="w-8 text-center font-bold text-slate-900" aria-hidden="true">{count}</span>
                      <button
                        type="button"
                        onClick={() => updateCount(app.id, 1)}
                        aria-label={`Add one ${app.name}`}
                        className="w-11 h-11 rounded-lg bg-solar-500 text-white font-bold hover:bg-solar-600 flex items-center justify-center transition active:scale-95"
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                  </div>

                  {count > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-xs">
                      <label htmlFor={`hours-${app.id}`} className="text-slate-600">
                        Daily Run Time:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          id={`hours-${app.id}`}
                          min="1"
                          max="24"
                          value={currentHours}
                          aria-label={`Daily run time for ${app.name}`}
                          aria-valuetext={`${currentHours} hours per day`}
                          onChange={(e) => updateHours(app.id, parseInt(e.target.value))}
                          className="w-28 h-11 accent-solar-600 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 w-12 text-right" aria-hidden="true">{currentHours} hrs/day</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <label htmlFor="calc-city" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Your City / Market:
            </label>
            <select
              id="calc-city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-2.5 py-2.5 focus:ring-2 focus:ring-solar-500 focus:outline-none"
            >
              {MARKETS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Affects peak sun hours ({stats.peakSunHours} PSH) and a
              {' '}×{stats.costMultiplier} regional cost adjustment ({stats.costReason}).
            </p>

            {/*
              Cable run input. Turns the site's existing "16mm²–25mm² pure copper"
              advice into a computed number the buyer can check a quote against.
            */}
            {/* ── Cable runs ── two separate measurements, because they are
                genuinely different distances: panels are on the roof, the
                controller indoors, and the battery sits beside the inverter. ── */}
            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Cable Runs (measure these)
              </div>

              <div>
                <label htmlFor="calc-array-run" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Panels → controller:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="calc-array-run"
                    type="range"
                    min="1"
                    max="80"
                    value={arrayRunMetres}
                    aria-label="One-way cable distance from solar panels to the charge controller, in metres"
                    aria-valuetext={`${arrayRunMetres} metres`}
                    onChange={(e) => setArrayRunMetres(parseInt(e.target.value))}
                    className="h-11 flex-1 accent-solar-600 cursor-pointer"
                  />
                  <span className="w-14 text-right text-xs font-semibold text-slate-800" aria-hidden="true">
                    {arrayRunMetres} m
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="calc-battery-run" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Battery → inverter:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="calc-battery-run"
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={batteryRunMetres}
                    aria-label="One-way cable distance from the battery bank to the inverter, in metres"
                    aria-valuetext={`${batteryRunMetres} metres`}
                    onChange={(e) => setBatteryRunMetres(parseFloat(e.target.value))}
                    className="h-11 flex-1 accent-solar-600 cursor-pointer"
                  />
                  <span className="w-14 text-right text-xs font-semibold text-slate-800" aria-hidden="true">
                    {batteryRunMetres} m
                  </span>
                </div>
                {stats.batteryRunTooLong ? (
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-amber-700">
                    ⚠ Over 4m is unusual. Battery cable size grows fast with distance — at 15m you
                    would need ~188mm² of copper. Move the battery next to the inverter instead.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Keep these adjacent — that is standard practice and keeps cable size sane.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Calculation Results (Right Column) */}
        <div className="lg:col-span-5 bg-slate-50/70 p-6 md:p-8 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" /> 2. Recommended System Specifications
              </h3>
              <span className="text-xs text-slate-500">Calculated for 24/7 reliability in {selectedCity}</span>
            </div>

            {/* Inverter Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended Inverter</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.recommendedKva} kVA Pure Sine Wave</div>
                  <div className="text-xs text-slate-600 mt-1">System Voltage: <span className="font-semibold text-slate-800">{stats.systemVoltage}</span></div>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Running Load: <strong className="text-slate-700">{stats.continuousWatts}W</strong></span>
                <span>Daily Usage: <strong className="text-slate-700">{stats.dailyKwh} kWh</strong></span>
              </div>

              {/* Motor starting surge — the value most sizing tools omit */}
              {stats.peakSurgeWatts > stats.continuousWatts && (
                <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Peak starting demand:</span>
                    <strong className="text-slate-900">{stats.peakSurgeWatts}W</strong>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    When your {stats.largestSurgeAppliance.toLowerCase()} kicks in, it briefly draws
                    far more than its running watts. Any installer you hire must confirm their
                    inverter&apos;s <strong className="font-semibold text-slate-600">surge rating</strong> covers
                    this, not just the running load.
                  </p>
                  {stats.surgeDrivesSizing && (
                    <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                      ⚠ Starting surge is what set the {stats.recommendedKva} kVA recommendation above —
                      not the running load.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Battery Bank Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended Battery Bank</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.recommendedLithiumKwh} kWh Lithium (LiFePO4)</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Or Tubular Equivalent:{' '}
                    <span className="font-semibold text-slate-800">
                      {stats.recommendedTubularAh}Ah at {stats.nominalVolts}V
                    </span>{' '}
                    — {stats.tubularUnitsInSeries === 1
                      ? <>a single 12V unit rated {stats.recommendedTubularAh}Ah or more</>
                      : <>{stats.tubularUnitsInSeries} × 12V units wired <em>in series</em>, each
                          rated {stats.recommendedTubularAh}Ah or more</>}.
                    {stats.recommendedTubularAh > 220 && (
                      <span className="block mt-0.5 text-[11px] text-amber-700">
                        220Ah is the common stock size in Nigeria. You would need to step up to the next
                        available size, or accept slightly less overnight backup.
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Battery className="w-5 h-5" />
                </div>
              </div>
              {/*
                BMS discharge check: the battery must be able to DELIVER the
                surge current, not just store the energy. This is the failure
                mode owners most often mistake for "fake battery".
              */}
              {stats.peakSurgeWatts > stats.continuousWatts && (
                <div
                  className={`mt-2 rounded-lg border p-2.5 ${
                    stats.bmsUndersized
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={stats.bmsUndersized ? 'text-red-700 font-semibold' : 'text-slate-600'}>
                      Momentary DC draw at start:
                    </span>
                    <strong className={stats.bmsUndersized ? 'text-red-800' : 'text-slate-900'}>
                      ~{stats.peakDcCurrent}A at {stats.nominalVolts}V
                    </strong>
                  </div>
                  <p className={`mt-1 text-[11px] leading-relaxed ${stats.bmsUndersized ? 'text-red-700' : 'text-slate-500'}`}>
                    {stats.bmsUndersized ? (
                      <>
                        <strong className="font-bold">Check the battery BMS rating.</strong> Storage
                        capacity being adequate is not enough — the BMS must be able to discharge
                        {' '}<strong className="font-bold">{stats.peakDcCurrent}A</strong> for a few seconds.
                        Most budget {stats.nominalVolts}V lithium units are limited to 100A and will shut
                        off when the motor starts. Specify a BMS rated{' '}
                        <strong className="font-bold">{stats.recommendedBmsAmps}A+</strong>, or split the
                        load across two batteries in parallel.
                      </>
                    ) : (
                      <>
                        Within the 100A continuous limit of common lithium BMS units. Confirm the
                        datasheet figure anyway — continuous and peak BMS ratings are often quoted
                        interchangeably by vendors.
                      </>
                    )}
                  </p>
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                ⚡ 10+ year lifespan with LiFePO4 Lithium (charges in ~2.5 hrs).
              </div>
            </div>

            {/* Solar Array Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solar Panels Needed</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.panels550WNeeded}x 550W Tier-1 Panels</div>
                  <div className="text-xs text-slate-600 mt-1">Total Solar Array Power: <span className="font-semibold text-slate-800">{(stats.panels550WNeeded * 550)}W</span></div>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                  <Sun className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                ☀️ Based on <strong className="text-slate-700">{stats.peakSunHours} peak sun hours/day</strong> for
                your market ({stats.pshBasis}), with a{' '}
                <strong className="text-slate-700">×{stats.arrayDeratingFactor}</strong> derating factor for
                Nigerian heat, harmattan dust and monsoon cloud — matching our published derating study.
              </div>

              {/* Cable sizing — computed, not asserted */}
              <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Minimum cable size for your measured runs
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Battery → inverter ({stats.batteryCurrent}A DC):</span>
                  <span className="text-right">
                    <strong className="text-slate-900">{stats.batteryCableSpec} mm² copper</strong>
                    <span className="block text-[10px] text-slate-500">limited by {stats.batteryCableDriver}</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Array → controller ({stats.seriesCount}S at {stats.arrayStringVoltage}V):</span>
                  <strong className="text-slate-900">{stats.arrayCableSpec} mm² copper</strong>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                  Sized to satisfy <strong className="font-semibold text-slate-600">both</strong> a maximum {MAX_VOLTAGE_DROP_PCT}% voltage drop
                  <em> and</em> the cable&apos;s current-carrying capacity, plus a practical minimum for battery circuits.
                  If an installer proposes thinner cable than this, ask which constraint they think does not apply.
                </p>
              </div>
            </div>

            {/* Estimated Budget Box */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="text-xs font-bold text-green-800 uppercase tracking-wider">Turnkey Budget Estimate (Nigeria)</div>
              <div className="text-2xl font-extrabold text-green-900 mt-1">{stats.costRange}</div>
              <p className="text-xs text-green-700 mt-1">
                Includes Inverter, Lithium Battery, Panels, Mounting Racks, Breakers, Cables & Professional Installation.
              </p>
            </div>
          </div>

          {/* Action CTAs (Monetization & Leads) */}
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-2.5">
            {/* 1-Click Share & Export Suite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleCopySpecs}
                className="inline-flex items-center justify-center gap-2 min-h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 rounded-xl shadow-sm transition text-xs"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-solar-400" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Specs'}</span>
              </button>

              <button
                onClick={handlePrintBoQ}
                className="inline-flex items-center justify-center gap-2 min-h-11 bg-solar-500 hover:bg-solar-400 text-slate-950 font-bold px-3 rounded-xl shadow-sm transition text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Download / Print BOQ</span>
              </button>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition active:scale-95 text-sm"
            >
              <MessageCircle className="w-5 h-5" aria-hidden="true" /> Request Quotes from {selectedCity.split(' ')[0]} Installers
            </a>

            {/*
              Financing is only surfaced once the sized system is large enough to
              justify it. Showing "pay monthly" next to a 1.2kVA starter kit would
              be noise and would erode trust in the sizing tool itself.
            */}
            {stats.recommendedKva >= EARTHBOND.minKvaForOffer && (
              <a
                href={EARTHBOND.url}
                target="_blank"
                rel="sponsored nofollow noopener"
                data-financing-partner="earthbond"
                data-system-kva={stats.recommendedKva}
                className="block w-full rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 transition hover:border-emerald-400 hover:shadow-md"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                        Pay Monthly Instead
                      </span>
                      <span className="rounded border border-emerald-300 bg-white px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        Partner
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-emerald-900">
                      At {stats.recommendedKva} kVA this is the size businesses usually finance, not
                      buy outright. <strong className="font-bold">{EARTHBOND.name}</strong> funds
                      systems from {EARTHBOND.rangeLabel} on monthly plans.
                    </p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline underline-offset-2">
                      See if your business qualifies
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="/products"
                className="inline-flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-medium transition text-center"
              >
                <FileText className="w-3.5 h-3.5 text-solar-600" /> Solar Toolkit (₦2k)
              </a>
              <a
                href="/equipment"
                className="inline-flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-medium transition text-center"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-blue-600" /> Buy Parts (Jumia/Konga)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
