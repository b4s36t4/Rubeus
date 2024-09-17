import { GenerationCost, PricingConfig } from '../providers/config';

export function calculateCost(
  pricingConfig: PricingConfig | null,
  reqUnits: number,
  resUnits: number,
  requestBody: Record<string, any>,
  inputCacheUnits?: {
    cacheWriteInputUnits: number | null;
    cacheReadInputUnits: number | null;
  }
): GenerationCost {
  let totalRequestCost = 0;
  let totalResponseCost = 0;
  if (!pricingConfig) {
    return {
      currency: 'USD',
      requestCost: totalRequestCost,
      responseCost: totalResponseCost,
    };
  }
  const { pay_as_you_go: payAsYouGoPricing, fixed_cost: fixedCost } =
    pricingConfig;
  if (payAsYouGoPricing) {
    if (payAsYouGoPricing['image'] && requestBody) {
      //calculate image cost
      const quality = requestBody['quality'] || 'default';
      const size = requestBody['size'] || 'default';
      totalRequestCost = 0;
      totalResponseCost = payAsYouGoPricing['image'][quality][size].price;
    } else {
      const _reqUnits =
        reqUnits -
        (inputCacheUnits?.cacheReadInputUnits ?? 0) -
        (inputCacheUnits?.cacheWriteInputUnits ?? 0);
      totalRequestCost +=
        (payAsYouGoPricing['request_token']?.price || 0) * _reqUnits;
      totalResponseCost +=
        (payAsYouGoPricing['response_token']?.price || 0) * resUnits;
    }
  }
  if (
    payAsYouGoPricing['cache_read_input_token']?.price ||
    payAsYouGoPricing['cache_write_input_token']?.price
  ) {
    totalRequestCost +=
      (payAsYouGoPricing['cache_read_input_token']?.price || 0) *
      (inputCacheUnits?.cacheReadInputUnits || 0);
    totalRequestCost +=
      (payAsYouGoPricing['cache_write_input_token']?.price || 0) *
      (inputCacheUnits?.cacheWriteInputUnits || 0);
  }
  if (fixedCost) {
    totalRequestCost += fixedCost['request'].price;
    totalResponseCost += fixedCost['response'].price;
  }
  return {
    requestCost: totalRequestCost,
    responseCost: totalResponseCost,
    currency: pricingConfig['currency'] ?? 'USD',
  };
}
