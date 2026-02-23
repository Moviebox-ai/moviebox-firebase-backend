const allowedRiskLevels = ['safe', 'suspicious', 'high', 'banned'];

const normalizeRiskLevel = (riskLevel) => {
  if (typeof riskLevel !== 'string') {
    return null;
  }

  const normalized = riskLevel.trim().toLowerCase();
  return allowedRiskLevels.includes(normalized) ? normalized : null;
};

const normalizeRiskScore = (riskScore) => {
  if (riskScore === null || riskScore === undefined || riskScore === '') {
    return null;
  }

  const value = Number(riskScore);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, value));
};

const evaluateRisk = ({ riskLevel, riskScore }) => {
  const normalizedRiskLevel = normalizeRiskLevel(riskLevel);
  const normalizedRiskScore = normalizeRiskScore(riskScore);

  if (!normalizedRiskLevel && normalizedRiskScore === null) {
    return {
      action: 'none',
      riskLevel: null,
      riskScore: null
    };
  }

  if (normalizedRiskLevel === 'banned' || (normalizedRiskScore !== null && normalizedRiskScore >= 90)) {
    return {
      action: 'ban',
      reason: 'Risk engine marked request as banned',
      riskLevel: normalizedRiskLevel,
      riskScore: normalizedRiskScore
    };
  }

  if (normalizedRiskLevel === 'high' || (normalizedRiskScore !== null && normalizedRiskScore >= 70)) {
    return {
      action: 'deny',
      reason: 'High-risk reward request blocked',
      riskLevel: normalizedRiskLevel,
      riskScore: normalizedRiskScore
    };
  }

  if (normalizedRiskLevel === 'suspicious' || (normalizedRiskScore !== null && normalizedRiskScore >= 40)) {
    return {
      action: 'flag',
      reason: 'Suspicious reward request detected',
      riskLevel: normalizedRiskLevel,
      riskScore: normalizedRiskScore
    };
  }

  return {
    action: 'allow',
    riskLevel: normalizedRiskLevel,
    riskScore: normalizedRiskScore
  };
};

module.exports = {
  evaluateRisk
};
