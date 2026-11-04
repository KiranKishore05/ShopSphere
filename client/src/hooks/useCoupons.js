import { useMutation } from '@tanstack/react-query';
import { applyCoupon as applyCouponApi } from '../services/couponService';

export const useApplyCoupon = () => {
  return useMutation({
    mutationFn: ({ code, subtotal }) => applyCouponApi({ code, subtotal })
  });
};
