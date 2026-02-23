const { MIN_REWARD_INTERVAL_MS } = require('./riskEngine');

const getRewardRequestSignals = ({
  now,
  user,
  incomingDeviceHash,
  crowdedIp
}) => {
  const lastRewardMillis = Number(user.lastRewardMillis) || 0;
  const timeDiff = now - lastRewardMillis;

  return {
    tooFastRequest: timeDiff < MIN_REWARD_INTERVAL_MS,
    deviceMismatch: Boolean(user.deviceHash && incomingDeviceHash && user.deviceHash !== incomingDeviceHash),
    crowdedIp: Boolean(crowdedIp)
  };
};

module.exports = {
  getRewardRequestSignals
};
