const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

/** Single geography market (USD Million, 2021 baseline) */
const PRIMARY_GEOGRAPHY = 'US';
const usMarketBase2021 = 295;
const usGrowthRate = 0.118;

// UHNW / family-office cybersecurity-style segmentation (shares sum to 1.0 within each type)
const segmentTypes = {
  "By Service Portfolio": {
    "Cyber Risk Strategy & Governance": 0.15,
    "Digital Threat Monitoring & Protection": 0.15,
    "Personal & Lifestyle Cybersecurity": 0.14,
    "Identity & Access Security": 0.14,
    "Incident Response & Cyber Resilience": 0.14,
    "Human Layer Security (Training & Awareness)": 0.14,
    "Third-Party & Ecosystem Risk Management": 0.14
  },
  "By Service Delivery Model": {
    "One-Time Advisory Engagements": 0.20,
    "Retainer-Based Cybersecurity Advisory": 0.22,
    "Concierge / White-Glove Cybersecurity Services": 0.18,
    "24/7 Managed Cybersecurity Support": 0.25,
    "Virtual CISO (vCISO) Services": 0.15
  },
  "By Asset Coverage": {
    "Individual & Family Digital Assets": 0.42,
    "Family Office Enterprise Systems": 0.33,
    "Extended Household Ecosystem": 0.25
  },
  "By Asset Size Under Management (AUM)": {
    "Below $500M": 0.32,
    "$500M – $1B": 0.28,
    "$1B – $5B": 0.27,
    "Above $5B": 0.13
  },
  "By Buyer Persona": {
    "Family Principals / UHNW Individuals": 0.30,
    "CIO / CTO": 0.27,
    "Chief Risk Officer (CRO)": 0.23,
    "External Advisors (wealth managers, legal, tax)": 0.20
  }
};


// Segment-specific growth multipliers (relative to regional base CAGR)
const segmentGrowthMultipliers = {
  "By Service Portfolio": {
    "Cyber Risk Strategy & Governance": 0.96,
    "Digital Threat Monitoring & Protection": 1.05,
    "Personal & Lifestyle Cybersecurity": 1.12,
    "Identity & Access Security": 1.02,
    "Incident Response & Cyber Resilience": 1.08,
    "Human Layer Security (Training & Awareness)": 1.14,
    "Third-Party & Ecosystem Risk Management": 1.06
  },
  "By Service Delivery Model": {
    "One-Time Advisory Engagements": 0.94,
    "Retainer-Based Cybersecurity Advisory": 1.04,
    "Concierge / White-Glove Cybersecurity Services": 1.10,
    "24/7 Managed Cybersecurity Support": 1.12,
    "Virtual CISO (vCISO) Services": 1.08
  },
  "By Asset Coverage": {
    "Individual & Family Digital Assets": 1.05,
    "Family Office Enterprise Systems": 1.02,
    "Extended Household Ecosystem": 1.10
  },
  "By Asset Size Under Management (AUM)": {
    "Below $500M": 1.06,
    "$500M – $1B": 1.04,
    "$1B – $5B": 1.00,
    "Above $5B": 0.97
  },
  "By Buyer Persona": {
    "Family Principals / UHNW Individuals": 1.03,
    "CIO / CTO": 1.05,
    "Chief Risk Officer (CRO)": 1.06,
    "External Advisors (wealth managers, legal, tax)": 1.02
  }
};

const volumePerMillionUSD = 480;

let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;
  const regionBase = usMarketBase2021 * multiplier;
  const regionGrowth = usGrowthRate;

  data[PRIMARY_GEOGRAPHY] = {};
  for (const [segType, segments] of Object.entries(segmentTypes)) {
    data[PRIMARY_GEOGRAPHY][segType] = {};
    for (const [segName, share] of Object.entries(segments)) {
      const segGrowth = regionGrowth * segmentGrowthMultipliers[segType][segName];
      const segBase = regionBase * share;
      data[PRIMARY_GEOGRAPHY][segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
    }
  }

  return data;
}

seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));

console.log('Generated value.json and volume.json successfully');
console.log('Geographies:', Object.keys(valueData));
console.log('Segment types:', Object.keys(valueData[PRIMARY_GEOGRAPHY]));
console.log('Sample - US, By Service Portfolio:', JSON.stringify(valueData[PRIMARY_GEOGRAPHY]['By Service Portfolio'], null, 2));
