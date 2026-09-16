import React, { useState, useMemo } from 'react';
import { 
  Sun, Battery, Zap, ShieldCheck, 
  RotateCcw, MessageCircle, FileText, ShoppingCart, Sparkles,
  Copy, Check, Printer
} from 'lucide-react';

interface Appliance {
  id: string;
  name: string;
  defaultWatts: number;
  category: 'lighting' | 'electronics' | 'cooling' | 'heavy';
  defaultHours: number;
}

const APPLIANCES: Appliance[] = [
  { id: 'led_lights', name: 'LED Bulbs / Energy Savers', defaultWatts: 10, category: 'lighting', defaultHours: 8 },
  { id: 'fans', name: 'Standing / Ceiling Fans', defaultWatts: 65, category: 'cooling', defaultHours: 12 },
  { id: 'laptops', name: 'Laptops / Workstations', defaultWatts: 70, category: 'electronics', defaultHours: 8 },
  { id: 'starlink', name: 'Starlink / 5G Wi-Fi Router', defaultWatts: 50, category: 'electronics', defaultHours: 24 },
  { id: 'tv', name: 'Smart TV + Decoder', defaultWatts: 120, category: 'electronics', defaultHours: 6 },
  { id: 'inverter_fridge', name: 'Inverter Refrigerator', defaultWatts: 150, category: 'cooling', defaultHours: 18 },
  { id: 'deep_freezer', name: 'Chest Deep Freezer', defaultWatts: 250, category: 'cooling', defaultHours: 12 },
  { id: 'ac_1hp', name: '1.0 HP Inverter AC', defaultWatts: 750, category: 'heavy', defaultHours: 6 },
  { id: 'ac_1_5hp', name: '1.5 HP Inverter AC', defaultWatts: 1100, category: 'heavy', defaultHours: 6 },
  { id: 'pump', name: '1HP Submersible Water Pump', defaultWatts: 850, category: 'heavy', defaultHours: 1 },
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
  };

  const handleCopySpecs = () => {
    const text = 
`☀️ SOLAR SYSTEM SIZING & BOQ SPECIFICATION
📍 Target Location: ${selectedCity}
🏢 Source: IbadanSolarHub.com.ng (Reid Caster Publishing)

⚡ AUDITED LOAD METRICS:
• Running Load: ${stats.continuousWatts}W
• Daily Energy: ${stats.dailyKwh} kWh/day

⚙️ SYSTEM HARDWARE SPECIFICATIONS:
• Inverter: ${stats.recommendedKva} kVA Pure Sine Wave (${stats.systemVoltage})
• Battery Bank: ${stats.recommendedLithiumKwh} kWh LiFePO4 Lithium (or ${stats.recommendedTubularAh}Ah Tubular)
• Solar Panels: ${stats.panels550WNeeded}x 550W Tier-1 Mono PERC (${stats.panels550WNeeded * 550}W Array)
• Turnkey Benchmark: ${stats.costRange} (Includes BOS, Cables & Install)

🛡️ VETTING MANDATES BEFORE HIRING AN INSTALLER:
1. Ensure pure copper battery cables (min 16mm² - 25mm²)
2. Require DC Surge Protection Device (SPD) + DC Breaker
3. Verify Lithium battery cycle life rating (min. 4,000 cycles at 80% DoD)

Get verified installer quotes or calculate custom setups: https://ibadansolarhub.com.ng/calculator`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
            <div><strong>Location Target:</strong> ${selectedCity}</div>
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
            <div class="spec-sub">Or Tubular Equivalent: ${stats.recommendedTubularAh}Ah (50% DoD)</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Solar PV Array</div>
            <div class="spec-val">${stats.panels550WNeeded}x 550W Tier-1 Panels</div>
            <div class="spec-sub">Total Array: ${stats.panels550WNeeded * 550}W (Calculated for 4.8 Peak Sun Hours)</div>
          </div>
          <div class="spec-card">
            <div class="spec-label">Estimated Turnkey Budget</div>
            <div class="spec-val" style="color: #047857;">${stats.costRange}</div>
            <div class="spec-sub">Includes BOS, Cables, Protection & Workmanship</div>
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
            2. <strong>Cable Gauge:</strong> Minimum 16mm² / 25mm² 100% pure copper battery cables with heavy-duty pressed lugs.<br>
            3. <strong>Cycle Rating:</strong> Lithium batteries must carry written manufacturer warranty for ≥ 4,000 cycles at 80% DoD.
          </div>
        </div>

        <div class="footer">
          Generated via <strong>IbadanSolarHub.com.ng</strong> • Author: <strong>Reid Caster Publishing</strong> (Power Without The Panic)
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

    APPLIANCES.forEach(app => {
      const count = counts[app.id] || 0;
      if (count > 0) {
        const itemWatts = count * app.defaultWatts;
        totalContinuousWatts += itemWatts;
        const itemHours = hours[app.id] || app.defaultHours;
        totalDailyWattHours += itemWatts * itemHours;
      }
    });

    // Inverter Sizing (Factor in 25% safety surge headroom)
    const requiredWattsWithHeadroom = totalContinuousWatts * 1.3;
    let recommendedKva = 1.2;
    let systemVoltage = '12V';

    if (requiredWattsWithHeadroom <= 1000) {
      recommendedKva = 1.2;
      systemVoltage = '12V';
    } else if (requiredWattsWithHeadroom <= 2200) {
      recommendedKva = 2.5;
      systemVoltage = '24V';
    } else if (requiredWattsWithHeadroom <= 3200) {
      recommendedKva = 3.5;
      systemVoltage = '24V or 48V';
    } else if (requiredWattsWithHeadroom <= 4800) {
      recommendedKva = 5.0;
      systemVoltage = '48V';
    } else if (requiredWattsWithHeadroom <= 7200) {
      recommendedKva = 7.5;
      systemVoltage = '48V';
    } else {
      recommendedKva = 10.0;
      systemVoltage = '48V High Voltage';
    }

    // Battery Bank Sizing (LiFePO4 Lithium kWh vs Tubular Ah)
    const dailyKwh = totalDailyWattHours / 1000;
    const nightEnergyNeededKwh = dailyKwh * 0.65;
    const recommendedLithiumKwh = Math.max(1.28, Math.round((nightEnergyNeededKwh / 0.8) * 10) / 10);
    const recommendedTubularAh = Math.round((nightEnergyNeededKwh * 1000) / (24 * 0.5));

    // Solar PV Array Sizing (avg 5.0 peak sun hours in Nigeria)
    const dailySolarGenerationTarget = totalDailyWattHours * 1.25;
    const requiredSolarArrayWatts = Math.max(600, Math.round(dailySolarGenerationTarget / 4.8));
    const panels550WNeeded = Math.max(2, Math.ceil(requiredSolarArrayWatts / 550));

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
      requiredSolarArrayWatts,
      panels550WNeeded,
      costRange: `${formatNaira(minCost)} – ${formatNaira(maxCost)}`,
    };
  }, [counts, hours]);

  const whatsappUrl = useMemo(() => {
    const text = encodeURIComponent(
      `Hello IbadanSolarHub! I just calculated my solar system requirements for my property in ${selectedCity}.\n\n` +
      `⚡ Continuous Running Load: ${stats.continuousWatts}W\n` +
      `🔋 Daily Energy Needed: ${stats.dailyKwh} kWh\n` +
      `⚙️ Recommended Inverter: ${stats.recommendedKva}kVA (${stats.systemVoltage})\n` +
      `🔋 Lithium Battery: ${stats.recommendedLithiumKwh} kWh\n` +
      `☀️ Solar Panels: ${stats.panels550WNeeded}x 550W Panels (${stats.requiredSolarArrayWatts}W)\n` +
      `💰 Budget Estimate: ${stats.costRange}\n\n` +
      `Please connect me with verified solar installers in ${selectedCity} for an inspection and precise quotation.`
    );
    return `https://wa.me/2348000000000?text=${text}`;
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
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition"
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
                      <button
                        onClick={() => updateCount(app.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center transition active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-slate-900">{count}</span>
                      <button
                        onClick={() => updateCount(app.id, 1)}
                        className="w-8 h-8 rounded-lg bg-solar-500 text-white font-bold hover:bg-solar-600 flex items-center justify-center transition active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {count > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-600">Daily Run Time:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="24"
                          value={currentHours}
                          onChange={(e) => updateHours(app.id, parseInt(e.target.value))}
                          className="w-28 accent-solar-600 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 w-12 text-right">{currentHours} hrs/day</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Your City / Market for Location-Specific Pricing:
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-solar-500 focus:outline-none"
            >
              <option value="Ibadan (Bodija, Oluyole, Jericho, Akobo)">Ibadan (Bodija, Oluyole, Jericho, Akobo, etc.)</option>
              <option value="Lagos (Lekki, Ikeja, Ajah, Surulere)">Lagos (Lekki, Ikeja, Ajah, Surulere, etc.)</option>
              <option value="Ogun (Abeokuta, Mowe-Ibafo, Ota)">Ogun (Abeokuta, Mowe-Ibafo, Ota, Sagamu)</option>
              <option value="Abuja (Maitama, Gwarinpa, Wuse 2, Jabi)">Abuja FCT (Maitama, Gwarinpa, Wuse 2, Jabi)</option>
              <option value="Port Harcourt (GRA, Peter Odili)">Port Harcourt (GRA, Peter Odili, Trans-Amadi)</option>
              <option value="Other South-West (Osogbo, Akure, Ado-Ekiti)">Other South-West (Osogbo, Akure, Ado-Ekiti)</option>
              <option value="Other Major City (Benin, Warri, Enugu)">Other Major City (Benin, Warri, Enugu)</option>
            </select>
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
            </div>

            {/* Battery Bank Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended Battery Bank</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.recommendedLithiumKwh} kWh Lithium (LiFePO4)</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Or Tubular Equivalent: <span className="font-semibold text-slate-800">{stats.recommendedTubularAh}Ah</span> (approx {Math.ceil(stats.recommendedTubularAh / 220)}x 220Ah batteries)
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Battery className="w-5 h-5" />
                </div>
              </div>
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
                ☀️ Based on Nigerian average peak sunshine (5.0 - 5.4 sun hours/day).
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
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-3 rounded-xl shadow-sm transition text-xs"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-solar-400" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Specs'}</span>
              </button>

              <button
                onClick={handlePrintBoQ}
                className="inline-flex items-center justify-center gap-2 bg-solar-500 hover:bg-solar-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl shadow-sm transition text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Download / Print BOQ</span>
              </button>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition transform active:scale-98 text-sm"
            >
              <MessageCircle className="w-5 h-5" /> Request Quotes from {selectedCity.split(' ')[0]} Installers
            </a>

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
