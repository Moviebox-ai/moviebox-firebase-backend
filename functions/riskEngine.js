const RISK_THRESHOLDS = {
  suspicious: 30,
  high: 60,
  banned: 100
};

const RISK_DELTAS = {
  recovery: -10,
  tooFastRequest: 20,
  deviceMismatch: 40,
  crowdedIp: 30
};

const MIN_REWARD_INTERVAL_MS = 20000;

const getBaseRiskScore = (existingRiskScore) => {
  const currentRisk = Number(existingRiskScore) || 0;
  return Math.max(0, currentRisk + RISK_DELTAS.recovery);
};

const applyRiskDeltas = ({ baseRiskScore, tooFastRequest, deviceMismatch, crowdedIp }) => {
  let nextRiskScore = baseRiskScore;

  if (tooFastRequest) {
    nextRiskScore += RISK_DELTAS.tooFastRequest;
  }

  if (deviceMismatch) {
    nextRiskScore += RISK_DELTAS.deviceMismatch;
  }

  if (crowdedIp) {
    nextRiskScore += RISK_DELTAS.crowdedIp;
  }

  return nextRiskScore;
};

const getRiskLevel = (riskScore) => {
  if (riskScore >= RISK_THRESHOLDS.banned) {
    return 'banned';
  }

  if (riskScore >= RISK_THRESHOLDS.high) {
    return 'high';
  }

  if (riskScore >= RISK_THRESHOLDS.suspicious) {
    return 'suspicious';
  }

  return 'safe';
};

module.exports = {
  MIN_REWARD_INTERVAL_MS,
  getBaseRiskScore,
  applyRiskDeltas,
  getRiskLevel
};
