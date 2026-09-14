const fs = require('fs');
const path = require('path');

const locations = [
  {
    slug: "bodija-ibadan",
    name: "Bodija",
    city: "Ibadan",
    state: "Oyo State",
    region: "South-West",
    disco: "IBEDC (Ibadan Electricity Distribution Company)",
    powerReliabilityScore: 4.2,
    avgDailyGridHours: "6 - 10 hours",
    peakSunHours: "5.3 peak sun hours/day",
    heroSubtitle: "Get top-tier solar inverters, lithium batteries, and certified installers in Bodija Estate and Old Bodija.",
    description: "Bodija is one of Ibadan's premier residential and commercial hubs, comprising Old Bodija and Bodija Housing Estate. With erratic grid power from IBEDC and soaring petrol costs for generators, homeowners, boutique offices, and restaurants in Bodija are rapidly transitioning to clean 3.5kVA - 5kVA lithium solar systems.",
    recommendedSystem: "3.5kVA – 5kVA LiFePO4 Solar System",
    avgInstallationCost: "₦2,200,000 – ₦4,800,000",
    popularInstallations: [
      "3-Bedroom Flat 3.5kVA Inverter with 5kWh Lithium Battery",
      "5kVA Duplex System running 1HP Inverter AC and Refrigerator",
      "Commercial backup for Bodija restaurants, supermarkets & clinics"
    ],
    topInstallersCount: 18,
    frequentlyAsked: [
      {
        question: "Can a 5kVA solar system run an AC in Bodija?",
        answer: "Yes. A 5kVA pure sine wave inverter paired with a 5kWh or 10kWh LiFePO4 lithium battery and 6-8 units of 550W solar panels will comfortably run a 1HP or 1.5HP inverter air conditioner alongside your TV, fans, and refrigerator."
      },
      {
        question: "How long does solar installation take in Bodija?",
        answer: "Standard residential solar setups in Bodija are typically installed and commissioned within 24 to 48 hours once equipment is delivered."
      }
    ]
  },
  {
    slug: "oluyole-ibadan",
    name: "Oluyole Estate",
    city: "Ibadan",
    state: "Oyo State",
    region: "South-West",
    disco: "IBEDC (Oluyole Business Hub)",
    powerReliabilityScore: 3.8,
    avgDailyGridHours: "5 - 8 hours",
    peakSunHours: "5.4 peak sun hours/day",
    heroSubtitle: "Affordable and industrial-grade solar inverter solutions in Oluyole Estate, Ibadan.",
    description: "Oluyole is a bustling zone of residential mansions and commercial establishments. Frequent transformer breakdowns and high fuel expenses make solar power the most economical investment for families and enterprises in Oluyole.",
    recommendedSystem: "5kVA – 10kVA Hybrid Solar System",
    avgInstallationCost: "₦3,200,000 – ₦7,500,000",
    popularInstallations: [
      "5kVA Hybrid Solar System with 10kWh Lithium Battery",
      "Industrial & Warehouse Solar Backup in Oluyole Industrial Area",
      "Borehole Pumping Machine Solar Inverter Setup"
    ],
    topInstallersCount: 15,
    frequentlyAsked: [
      {
        question: "Will solar power run a borehole pumping machine in Oluyole?",
        answer: "Yes, a 1HP submersible water pump requires at least a 3.5kVA or 5kVA pure sine wave inverter with surge protection to handle the inductive startup surge current."
      }
    ]
  },
  {
    slug: "akobo-ibadan",
    name: "Akobo & Oju-Irin",
    city: "Ibadan",
    state: "Oyo State",
    region: "South-West",
    disco: "IBEDC (Iwo Road / Akobo Undertaking)",
    powerReliabilityScore: 3.2,
    avgDailyGridHours: "4 - 7 hours",
    peakSunHours: "5.3 peak sun hours/day",
    heroSubtitle: "Beat erratic power in Akobo, General Gas, and Kolapo Ishola Estate with solar installations.",
    description: "Covering General Gas, Kolapo Ishola GRA, and Oju-Irin, Akobo is one of Ibadan's fastest-expanding suburban belts. Many residential estates face frequent feeder tripping, making 2.5kVA and 5kVA solar setups essential for 24/7 electricity.",
    recommendedSystem: "2.5kVA – 5kVA Solar Inverter Setup",
    avgInstallationCost: "₦1,800,000 – ₦4,200,000",
    popularInstallations: [
      "Remote Tech Worker 1.5kVA Backup System for 24/7 Laptops & Starlink",
      "Duplex 5kVA Solar Package with Roof-mounted Mono Panels",
      "Kolapo Ishola Estate Turnkey Solar Installation"
    ],
    topInstallersCount: 21,
    frequentlyAsked: [
      {
        question: "What is the best mini solar setup for remote workers in Akobo?",
        answer: "A 1.2kVA to 1.5kVA inverter with a 1.28kWh lithium battery and 2x 400W panels will power your laptop, Starlink/Wi-Fi router, monitors, and workstation fans 24/7 indefinitely."
      }
    ]
  },
  {
    slug: "jericho-ibadan",
    name: "Jericho GRA",
    city: "Ibadan",
    state: "Oyo State",
    region: "South-West",
    disco: "IBEDC (Dugbe/Jericho District)",
    powerReliabilityScore: 5.5,
    avgDailyGridHours: "8 - 14 hours",
    peakSunHours: "5.2 peak sun hours/day",
    heroSubtitle: "Luxury high-capacity solar and energy storage systems in Jericho GRA, Ibadan.",
    description: "Jericho is renowned for high-end residential estates, consulates, private clinics, and diplomatic quarters. Property owners prioritize silent, clean, zero-carbon solar systems that replace noisy 20kVA-40kVA diesel generators.",
    recommendedSystem: "7.5kVA – 15kVA High-Voltage Solar Plant",
    avgInstallationCost: "₦4,800,000 – ₦12,500,000",
    popularInstallations: [
      "10kVA - 15kVA Three-Phase Solar System with Tier-1 Lithium Racks",
      "Medical Diagnostic Center Uninterrupted Solar Backup",
      "Smart Home Integrated Solar Power with Remote App Monitoring"
    ],
    topInstallersCount: 12,
    frequentlyAsked: [
      {
        question: "Can a solar system power central cooling in Jericho GRA?",
        answer: "Yes, by sizing a 10kVA to 20kVA hybrid inverter bank with 15kWh to 30kWh lithium LiFePO4 batteries and a matched solar array."
      }
    ]
  },
  {
    slug: "ring-road-challenge-ibadan",
    name: "Ring Road & Challenge",
    city: "Ibadan",
    state: "Oyo State",
    region: "South-West",
    disco: "IBEDC (Challenge Business Hub)",
    powerReliabilityScore: 3.9,
    avgDailyGridHours: "5 - 9 hours",
    peakSunHours: "5.4 peak sun hours/day",
    heroSubtitle: "Solar power installations for homes, commercial banks, and retail outlets along Ring Road & Challenge.",
    description: "The economic artery connecting Ring Road, Mobil, and Challenge has intense commercial and residential energy demands. Cutting generator diesel expenses is the primary motivation for retail plazas and residential blocks.",
    recommendedSystem: "3.5kVA – 7.5kVA Solar Power System",
    avgInstallationCost: "₦2,400,000 – ₦5,600,000",
    popularInstallations: [
      "Commercial Plaza Common-Area Lighting & Elevator Backup",
      "3.5kVA Solar Package for Residential Flats",
      "POS, Pharmacy & Cold Store 24/7 Solar Backup"
    ],
    topInstallersCount: 16,
    frequentlyAsked: [
      {
        question: "How much can a business on Ring Road save by switching to solar?",
        answer: "A business running a 10kVA diesel generator for 8 hours daily saves between ₦450,000 and ₦800,000 monthly in fuel and maintenance alone."
      }
    ]
  },
  {
    slug: "samonda-ui-ibadan",
    name: "Samonda & UI / Agbowo",
    city: "Ibadan",
    state: "Oyo State",
    region: "South-West",
    disco: "IBEDC (University of Ibadan Feeder)",
    powerReliabilityScore: 4.0,
    avgDailyGridHours: "6 - 10 hours",
    peakSunHours: "5.3 peak sun hours/day",
    heroSubtitle: "Affordable student, lecturer, and tech-hub solar setups in Samonda, UI, and Agbowo.",
    description: "Home to the University of Ibadan, academic institutions, students, tech hubs, and print businesses along Sango/Samonda. Demand centers on cost-effective 1kVA - 3.5kVA packages.",
    recommendedSystem: "1.2kVA – 3kVA Affordable Solar Inverter",
    avgInstallationCost: "₦650,000 – ₦2,200,000",
    popularInstallations: [
      "Student Hostel & Shared Apartment Solar Power Kit",
      "Lecturer Quarter 3kVA Inverter with 200Ah Tubular Battery",
      "Tech Hub & Co-working Space Uninterrupted Solar Setup"
    ],
    topInstallersCount: 19,
    frequentlyAsked: [
      {
        question: "Can I pay for solar installation in installments in Ibadan?",
        answer: "Several partner installers and financing platforms offer 3 to 12-month solar lease-to-own plans."
      }
    ]
  },
  {
    slug: "dugbe-ibadan",
    name: "Dugbe Commercial District",
    city: "Ibadan",
    state: "Oyo State",
    region: "South-West",
    disco: "IBEDC (Dugbe Commercial)",
    powerReliabilityScore: 4.8,
    avgDailyGridHours: "8 - 12 hours",
    peakSunHours: "5.2 peak sun hours/day",
    heroSubtitle: "Commercial solar panel and inverter solutions for Dugbe CBD corporate offices and merchants.",
    description: "Dugbe is the financial nerve center of Ibadan, boasting Cocoa House, major bank headquarters, electronics markets, and legal chambers. Clean, continuous power is crucial for business operations.",
    recommendedSystem: "5kVA – 20kVA Commercial Hybrid Solar",
    avgInstallationCost: "₦3,500,000 – ₦15,000,000",
    popularInstallations: [
      "Bank Branch & ATM Solar Backup",
      "Law Firm & Audit Chamber 5kVA Solar Power Setup",
      "Electronics Store Showroom Solar Lighting"
    ],
    topInstallersCount: 14,
    frequentlyAsked: [
      {
        question: "Where can I buy original solar components in Dugbe?",
        answer: "Dugbe and Lebanon Street host verified distributors of Felicity, Growatt, and Canadian Solar. We connect you directly with vetted suppliers to avoid counterfeits."
      }
    ]
  },
  {
    slug: "lekki-lagos",
    name: "Lekki Phase 1 & Peninsula",
    city: "Lagos",
    state: "Lagos State",
    region: "South-West",
    disco: "EKEDC (Eko Electricity Distribution Company)",
    powerReliabilityScore: 5.1,
    avgDailyGridHours: "8 - 14 hours",
    peakSunHours: "5.0 peak sun hours/day",
    heroSubtitle: "Premium solar inverter installations and lithium battery upgrades in Lekki Phase 1, Ikate & Chevron.",
    description: "Lekki Peninsula represents Nigeria's highest concentration of premium residential estates. Despite Band-A tariffs exceeding ₦209/kWh, power outages remain frequent. Solar installations with smart LiFePO4 batteries deliver predictable 24/7 electricity at half the cost of estate generator surcharges.",
    recommendedSystem: "5kVA – 15kVA Smart Hybrid Solar System",
    avgInstallationCost: "₦3,800,000 – ₦12,000,000",
    popularInstallations: [
      "5kVA 48V Setup with 10kWh Wall-mount Lithium Battery",
      "10kVA - 15kVA Solar System powering 3 Inverter ACs and Deep Freezers",
      "Estate Service Charge Reduction Solar Grid-Tie Setup"
    ],
    topInstallersCount: 35,
    frequentlyAsked: [
      {
        question: "Is solar cheaper than Lekki estate generator tariffs?",
        answer: "Yes, significantly. Most Lekki estates bill between ₦250 and ₦350 per kWh for generator power. A quality solar installation pays for itself in under 18 months."
      }
    ]
  },
  {
    slug: "ikeja-lagos",
    name: "Ikeja (GRA, Allen & Alausa)",
    city: "Lagos",
    state: "Lagos State",
    region: "South-West",
    disco: "IKEDC (Ikeja Electric)",
    powerReliabilityScore: 5.4,
    avgDailyGridHours: "8 - 14 hours",
    peakSunHours: "5.1 peak sun hours/day",
    heroSubtitle: "Commercial and residential solar power solutions in Ikeja GRA, Allen Avenue, and Maryland.",
    description: "As Lagos State's capital and a major corporate epicenter, Ikeja features high energy demands from businesses, media firms, government offices, and upscale residences in Ikeja GRA. Installing solar mitigates skyrocketing Band-A grid tariffs.",
    recommendedSystem: "5kVA – 10kVA Pure Sine Wave Solar System",
    avgInstallationCost: "₦3,200,000 – ₦8,500,000",
    popularInstallations: [
      "Corporate Office 10kVA Backup with 15kWh Lithium Storage",
      "Ikeja GRA Duplex Solar System with 1.5HP Inverter AC",
      "Studio & Production House Noise-free Solar Power"
    ],
    topInstallersCount: 28,
    frequentlyAsked: [
      {
        question: "Can an Ikeja business claim tax incentives for solar in Nigeria?",
        answer: "Yes, capital allowances on renewable energy equipment are permitted under Nigerian tax regulations, allowing write-downs on clean energy investments."
      }
    ]
  },
  {
    slug: "ajah-sangotedo-lagos",
    name: "Ajah & Sangotedo",
    city: "Lagos",
    state: "Lagos State",
    region: "South-West",
    disco: "EKEDC (Ajah Business Hub)",
    powerReliabilityScore: 3.4,
    avgDailyGridHours: "4 - 8 hours",
    peakSunHours: "5.1 peak sun hours/day",
    heroSubtitle: "Reliable solar inverters and lithium batteries for Ajah, Sangotedo, and Abraham Adesanya estates.",
    description: "Rapid suburban growth in Ajah, Badore, Sangotedo, and Eleko has outpaced electrical infrastructure. Thousands of homeowners depend on solar inverters to power their homes without constant generator fumes.",
    recommendedSystem: "3.5kVA – 5kVA Lithium Solar System",
    avgInstallationCost: "₦2,400,000 – ₦5,200,000",
    popularInstallations: [
      "3.5kVA Inverter with 5kWh Battery for 3-Bedroom Flats",
      "5kVA Setup with 8x 550W Panels for Standalone Duplexes",
      "Plug & Play 1kVA Inverter for Apartment Renters"
    ],
    topInstallersCount: 31,
    frequentlyAsked: [
      {
        question: "Can I move my solar system when relocating from a rented house in Ajah?",
        answer: "Yes, modern solar inverters, batteries, and roof mounting rails can be professionally uninstalled and relocated to your new home in a single afternoon."
      }
    ]
  },
  {
    slug: "surulere-yaba-lagos",
    name: "Surulere & Yaba Tech Corridor",
    city: "Lagos",
    state: "Lagos State",
    region: "South-West",
    disco: "EKEDC (Surulere) / IKEDC (Yaba)",
    powerReliabilityScore: 4.3,
    avgDailyGridHours: "6 - 10 hours",
    peakSunHours: "5.0 peak sun hours/day",
    heroSubtitle: "Solar setups for tech startups, creative studios, and family residences in Yaba and Surulere.",
    description: "Known as Nigeria's Silicon Lagoon, Yaba hosts prominent tech firms, coding hubs, and universities, while Surulere features vibrant residential estates and creative production studios requiring non-stop electricity.",
    recommendedSystem: "2.5kVA – 5kVA Solar Inverter Setup",
    avgInstallationCost: "₦1,900,000 – ₦4,500,000",
    popularInstallations: [
      "Tech Co-working Space Inverter Backup",
      "Creative Sound/Video Studio Silent Solar Setup",
      "Family Home 2.5kVA Solar Inverter with Tubular/Lithium Battery"
    ],
    topInstallersCount: 24,
    frequentlyAsked: [
      {
        question: "Which battery is best for Yaba tech workers: Tubular or Lithium?",
        answer: "LiFePO4 Lithium is vastly superior. It charges to 100% in 2-3 hours of sunlight or grid power, provides 4,000+ cycles (10+ years), compared to tubular batteries which need 8-10 hours to recharge."
      }
    ]
  },
  {
    slug: "abeokuta-ogun",
    name: "Abeokuta",
    city: "Abeokuta",
    state: "Ogun State",
    region: "South-West",
    disco: "IBEDC (Abeokuta Hub)",
    powerReliabilityScore: 3.6,
    avgDailyGridHours: "5 - 8 hours",
    peakSunHours: "5.3 peak sun hours/day",
    heroSubtitle: "Trusted solar inverter installations across Abeokuta, Ibara, Oke-Mosan, and Obantoko.",
    description: "Ogun State's capital city features intense solar irradiance and heavy demand for residential and civil servant solar power. Transitioning to solar frees families from the weekly burden of petrol purchases.",
    recommendedSystem: "2.5kVA – 5kVA Solar Power System",
    avgInstallationCost: "₦1,800,000 – ₦4,200,000",
    popularInstallations: [
      "Civil Servant Bungalow 2.5kVA Solar Package",
      "Hotel & Hospitality 10kVA - 20kVA Solar Backup in Ibara GRA",
      "Farm & Agribusiness Solar Water Pumping System"
    ],
    topInstallersCount: 14,
    frequentlyAsked: [
      {
        question: "Can solar power agricultural water irrigation in Ogun State?",
        answer: "Yes, solar DC or AC pumping inverters connect directly to solar panels without batteries to pump thousands of liters daily for poultry and irrigation."
      }
    ]
  },
  {
    slug: "mowe-ibafo-ogun",
    name: "Mowe, Ibafo & Arepo",
    city: "Mowe-Ibafo",
    state: "Ogun State",
    region: "South-West",
    disco: "IBEDC (Mowe / Ibafo Undertaking)",
    powerReliabilityScore: 2.8,
    avgDailyGridHours: "2 - 6 hours",
    peakSunHours: "5.2 peak sun hours/day",
    heroSubtitle: "Ditch the dark in Mowe, Ibafo, Magboro, and Arepo with whole-home solar installations.",
    description: "Communities along the Lagos-Ibadan Expressway house hundreds of thousands of Lagos commuters. Feeder reliability is notoriously erratic, making solar power not a luxury, but an absolute household necessity.",
    recommendedSystem: "3.5kVA – 5kVA High-Harvest Solar Array",
    avgInstallationCost: "₦2,100,000 – ₦4,600,000",
    popularInstallations: [
      "Commuter Family 3.5kVA Solar System with 5kWh Lithium Battery",
      "Gated Estate Solar Street Lighting & Security Cameras",
      "Small Business 1.5kVA Inverter for Day & Night Operation"
    ],
    topInstallersCount: 22,
    frequentlyAsked: [
      {
        question: "How many solar panels do I need in Mowe/Ibafo if the grid has zero power for days?",
        answer: "For an off-grid scenario, an array of 6 to 8 panels (each 500W-550W) produces 12kWh to 16kWh of solar energy on sunny days, fully recharging a 5kWh battery and running appliances simultaneously."
      }
    ]
  },
  {
    slug: "abuja-fct",
    name: "Abuja (Maitama, Wuse 2, Gwarinpa & Jabi)",
    city: "Abuja",
    state: "Federal Capital Territory",
    region: "North-Central",
    disco: "AEDC (Abuja Electricity Distribution Company)",
    powerReliabilityScore: 5.8,
    avgDailyGridHours: "10 - 16 hours",
    peakSunHours: "5.8 peak sun hours/day",
    heroSubtitle: "High-yield solar power systems in Abuja: Maitama, Gwarinpa, Wuse 2, Jabi, and Asokoro.",
    description: "Abuja boasts some of the highest solar irradiance levels in Nigeria (nearly 6.0 peak sun hours per day). High-income residents, government dignitaries, NGOs, and enterprises choose high-efficiency solar setups to avoid high AEDC tariffs and achieve energy autonomy.",
    recommendedSystem: "5kVA – 15kVA Premium LiFePO4 Solar Setup",
    avgInstallationCost: "₦3,600,000 – ₦11,000,000",
    popularInstallations: [
      "Gwarinpa Estate 5kVA Solar System running 2 Inverter ACs",
      "Maitama & Asokoro Luxury Duplex 15kVA Solar Energy Storage",
      "NGO & Embassy Silent 10kVA Solar Backup System"
    ],
    topInstallersCount: 26,
    frequentlyAsked: [
      {
        question: "Why is solar output higher in Abuja than coastal cities like Lagos?",
        answer: "Abuja receives less cloud cover and higher solar radiation (5.8 kWh/m²/day vs 4.8 in coastal zones), resulting in up to 20% higher daily solar energy generation."
      }
    ]
  },
  {
    slug: "port-harcourt-rivers",
    name: "Port Harcourt (GRA, Peter Odili & Trans-Amadi)",
    city: "Port Harcourt",
    state: "Rivers State",
    region: "South-South",
    disco: "PHED (Port Harcourt Electricity Distribution)",
    powerReliabilityScore: 4.1,
    avgDailyGridHours: "6 - 10 hours",
    peakSunHours: "4.9 peak sun hours/day",
    heroSubtitle: "Industrial-grade solar inverters and battery systems in Port Harcourt, Old GRA & Peter Odili.",
    description: "Nigeria's oil capital demands dependable, round-the-clock power. Between soaring diesel prices and soot concerns, Port Harcourt homes, offshore logistics offices, and businesses are aggressively switching to clean solar power.",
    recommendedSystem: "5kVA – 10kVA Heavy Duty Hybrid Solar",
    avgInstallationCost: "₦3,500,000 – ₦9,500,000",
    popularInstallations: [
      "Peter Odili Duplex 5kVA Solar Package with 10kWh Battery",
      "Trans-Amadi Oilfield Servicing Office Solar Backup",
      "Off-grid Creek & Island Community Solar Microgrid"
    ],
    topInstallersCount: 20,
    frequentlyAsked: [
      {
        question: "Does rain and overcast weather in Port Harcourt stop solar from working?",
        answer: "No. Modern monocrystalline PERC and N-type bifacial panels continue generating 25% to 40% of their rated output even on heavily overcast or rainy days."
      }
    ]
  },
  {
    slug: "osogbo-osun",
    name: "Osogbo",
    city: "Osogbo",
    state: "Osun State",
    region: "South-West",
    disco: "IBEDC (Osogbo Region)",
    powerReliabilityScore: 3.5,
    avgDailyGridHours: "5 - 8 hours",
    peakSunHours: "5.4 peak sun hours/day",
    heroSubtitle: "Affordable home and commercial solar power systems in Osogbo, Osun State.",
    description: "Osogbo features abundant solar sunshine and an active commercial sector. Homeowners and traders install 1.5kVA - 3.5kVA systems to eliminate generator expenses.",
    recommendedSystem: "2kVA – 3.5kVA Solar Inverter Setup",
    avgInstallationCost: "₦1,400,000 – ₦3,500,000",
    popularInstallations: [
      "Residential 2.5kVA Solar Power System",
      "Hospital & Clinic Emergency Solar Backup",
      "Retail Shop 1kVA Mini Solar Kit"
    ],
    topInstallersCount: 11,
    frequentlyAsked: [
      {
        question: "How long does a 2.5kVA solar system last in Osogbo?",
        answer: "A well-installed system with LiFePO4 lithium batteries lasts over 10 years, with solar panels guaranteed for 25 years of linear power output."
      }
    ]
  },
  {
    slug: "akure-ondo",
    name: "Akure",
    city: "Akure",
    state: "Ondo State",
    region: "South-West",
    disco: "BEDC (Benin Electricity Distribution Company)",
    powerReliabilityScore: 3.3,
    avgDailyGridHours: "4 - 8 hours",
    peakSunHours: "5.3 peak sun hours/day",
    heroSubtitle: "Complete solar energy systems and inverters in Akure, Alagbaka, and FUTA environs.",
    description: "Akure residents, academic communities around FUTA, and commercial centers in Alagbaka benefit from solar power to counter frequent BEDC blackouts.",
    recommendedSystem: "2.5kVA – 5kVA Solar Package",
    avgInstallationCost: "₦1,700,000 – ₦4,200,000",
    popularInstallations: [
      "Alagbaka GRA 5kVA Solar System",
      "FUTA Student & Academic 1.5kVA Solar Kit",
      "Cocoa Processing & Storage Solar Lighting"
    ],
    topInstallersCount: 13,
    frequentlyAsked: [
      {
        question: "What equipment do I need for a 3-bedroom flat in Akure?",
        answer: "A 3.5kVA or 5kVA pure sine wave inverter, a 5kWh lithium battery, 6x 500W panels, and an MPPT charge controller will run fans, lights, TV, laptops, and a refrigerator effortlessly."
      }
    ]
  },
  {
    slug: "benin-city-edo",
    name: "Benin City",
    city: "Benin City",
    state: "Edo State",
    region: "South-South",
    disco: "BEDC (Benin Electricity HQ)",
    powerReliabilityScore: 3.7,
    avgDailyGridHours: "5 - 9 hours",
    peakSunHours: "5.1 peak sun hours/day",
    heroSubtitle: "Reliable solar inverters and lithium storage systems in Benin City, GRA & Ugbowo.",
    description: "Benin City is seeing rapid adoption of solar power across residential neighborhoods, diaspora-funded homes, and commercial enterprises seeking freedom from volatile fuel costs.",
    recommendedSystem: "3.5kVA – 7.5kVA Solar Energy System",
    avgInstallationCost: "₦2,300,000 – ₦5,800,000",
    popularInstallations: [
      "Diaspora-funded Residential Solar System in Benin GRA",
      "Cold Room & Pharmacy 5kVA Inverter Backup",
      "Student Accommodation 2kVA Solar Inverter Setup"
    ],
    topInstallersCount: 15,
    frequentlyAsked: [
      {
        question: "Can Nigerians in the diaspora order and monitor solar installation for their family in Benin City?",
        answer: "Yes, our certified installers provide turnkey installation, milestone video documentation, and configure smart Wi-Fi cloud monitoring accessible via smartphone anywhere worldwide."
      }
    ]
  }
];

const dest = path.join(__dirname, '../src/data/locations.json');
fs.writeFileSync(dest, JSON.stringify(locations, null, 2), 'utf-8');
console.log(`Wrote ${locations.length} locations to ${dest}`);
