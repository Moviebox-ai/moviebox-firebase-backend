const voluntaryIntentAliases = new Set([
  'watch ad to support us',
  'watch_ad_to_support_us'
]);

const normalizeRewardIntent = (rewardIntent) => {
  if (typeof rewardIntent !== 'string') {
    return null;
  }

  const normalizedIntent = rewardIntent.trim().toLowerCase();

  if (!voluntaryIntentAliases.has(normalizedIntent)) {
    return null;
  }

  return 'watch_ad_to_support_us';
};

module.exports = {
  normalizeRewardIntent
};
