const fs = require('fs');
const path = require('path');

const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

const PRIMARY_GEOGRAPHY = 'US';
const usNationalBase2021 = 295;
const usGrowthRate = 0.118;

/** US sub-regional GDP-style weights (sum ≈ 1) */
const US_SUBREGIONS = [
  'Northeast U.S.',
  'Southeast U.S.',
  'Midwest U.S.',
  'Southwest U.S.',
  'West U.S.',
];
const SUBREGION_SHARE = {
  'Northeast U.S.': 0.22,
  'Southeast U.S.': 0.19,
  'Midwest U.S.': 0.21,
  'Southwest U.S.': 0.17,
  'West U.S.': 0.21,
};

const segmentTypes = {
  'By Service Type': {
    'Investment Advisory Services': 1 / 6,
    'Tax and Estate Planning Advisory': 1 / 6,
    'Legal and Regulatory Advisory': 1 / 6,
    'Risk Management Advisory': 1 / 6,
    'Cybersecurity and Digital Risk Advisory': 1 / 6,
    'Lifestyle and Personal Services Advisory': 1 / 6,
  },
  'By Family Office Type': {
    'Single Family Offices': 0.5,
    'Multi Family Offices': 0.35,
    'Virtual Family Offices': 0.15,
  },
  'By Asset Size of Client Family': {
    'Emerging Wealth Families (USD 50M to USD 250M)': 0.42,
    'Ultra High Net Worth Families (USD 250M to USD 1B)': 0.38,
    'Billionaire Family Offices (Above USD 1B)': 0.2,
  },
  'By Advisory Delivery Model': {
    'In House Advisory Teams': 0.38,
    'External Specialist Advisors': 0.35,
    'Hybrid Advisory Model': 0.27,
  },
  'By Client Risk Focus Area': {
    'Financial and Investment Risk': 0.22,
    'Legal and Regulatory Risk': 0.2,
    'Operational and Governance Risk': 0.2,
    'Cybersecurity and Privacy Risk': 0.23,
    'Reputation and Personal Security Risk': 0.15,
  },
  'By Service Engagement Model': {
    'Retainer Based Advisory': 0.45,
    'Project Based Advisory': 0.35,
    'Transaction Based Advisory': 0.2,
  },
};

const segmentGrowthMultipliers = {
  'By Service Type': {
    'Investment Advisory Services': 0.98,
    'Tax and Estate Planning Advisory': 1.02,
    'Legal and Regulatory Advisory': 1.0,
    'Risk Management Advisory': 1.05,
    'Cybersecurity and Digital Risk Advisory': 1.12,
    'Lifestyle and Personal Services Advisory': 1.08,
  },
  'By Family Office Type': {
    'Single Family Offices': 1.02,
    'Multi Family Offices': 1.08,
    'Virtual Family Offices': 1.14,
  },
  'By Asset Size of Client Family': {
    'Emerging Wealth Families (USD 50M to USD 250M)': 1.06,
    'Ultra High Net Worth Families (USD 250M to USD 1B)': 1.02,
    'Billionaire Family Offices (Above USD 1B)': 0.98,
  },
  'By Advisory Delivery Model': {
    'In House Advisory Teams': 0.97,
    'External Specialist Advisors': 1.05,
    'Hybrid Advisory Model': 1.08,
  },
  'By Client Risk Focus Area': {
    'Financial and Investment Risk': 1.0,
    'Legal and Regulatory Risk': 1.03,
    'Operational and Governance Risk': 1.02,
    'Cybersecurity and Privacy Risk': 1.1,
    'Reputation and Personal Security Risk': 1.06,
  },
  'By Service Engagement Model': {
    'Retainer Based Advisory': 1.0,
    'Project Based Advisory': 1.06,
    'Transaction Based Advisory': 1.04,
  },
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

function segmentsPayload(regionBase, regionGrowth, roundFn) {
  const out = {};
  const byRegion = {};
  US_SUBREGIONS.forEach((r) => {
    byRegion[r] = {};
  });

  out['By Region'] = byRegion;

  for (const [segType, segments] of Object.entries(segmentTypes)) {
    out[segType] = {};
    for (const [segName, share] of Object.entries(segments)) {
      const segGrowth = regionGrowth * segmentGrowthMultipliers[segType][segName];
      const segBase = regionBase * share;
      out[segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
    }
  }
  return out;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;
  const nationalBase = usNationalBase2021 * multiplier;

  data[PRIMARY_GEOGRAPHY] = segmentsPayload(nationalBase, usGrowthRate, roundFn);

  for (const sub of US_SUBREGIONS) {
    const base = nationalBase * SUBREGION_SHARE[sub];
    const growJit = 1 + (seededRandom() - 0.5) * 0.05;
    data[sub] = segmentsPayload(base * growJit, usGrowthRate, roundFn);
    delete data[sub]['By Region'];
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

console.log('Generated value.json and volume.json');
console.log('Top-level keys:', Object.keys(valueData));
console.log('Segment types under US:', Object.keys(valueData.US).filter((k) => k !== 'By Region'));
