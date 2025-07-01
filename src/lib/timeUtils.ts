// Utility functions for time slot management and validation

export const BUSINESS_HOURS = {
  START: '08:00',
  END: '20:00',
  START_HOUR: 8,
  END_HOUR: 20
} as const;

export const BOOKING_LIMITS = {
  MAX_HOURS: 12,
  MIN_HOURS: 1,
  CUTOFF_HOUR: 17 // 5 PM - no new bookings after this time
} as const;

/**
 * Check if current time is past the booking cutoff (5 PM) for a specific date
 * Only blocks bookings for the current date, future dates are always allowed
 */
export const isBookingCutoffReached = (selectedDate?: string): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If no date provided, check global cutoff (for backward compatibility)
  if (!selectedDate) {
    return currentHour >= BOOKING_LIMITS.CUTOFF_HOUR;
  }
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // If selected date is in the future, always allow booking
  if (selectedDate > today) {
    return false;
  }
  
  // If selected date is today and current time is past 5 PM, block booking
  if (selectedDate === today && currentHour >= BOOKING_LIMITS.CUTOFF_HOUR) {
    return true;
  }
  
  // If selected date is in the past, block booking
  if (selectedDate < today) {
    return true;
  }
  
  // Otherwise allow booking
  return false;
};

/**
 * Get a user-friendly message for booking cutoff
 */
export const getBookingCutoffMessage = (selectedDate?: string): string => {
  if (!selectedDate) {
    return "Bookings are not accepted after 5:00 PM. Please try again tomorrow.";
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  if (selectedDate === today) {
    return "Bookings for today are not accepted after 5:00 PM. You can still book for future dates.";
  }
  
  if (selectedDate < today) {
    return "Cannot book for past dates. Please select a future date.";
  }
  
  return "Bookings are not accepted after 5:00 PM. Please try again tomorrow.";
};

/**
 * Check if a time is within business hours
 */
export const isWithinBusinessHours = (time: string): boolean => {
  return time >= BUSINESS_HOURS.START && time <= BUSINESS_HOURS.END;
};

/**
 * Check if booking duration is valid
 */
export const isValidBookingDuration = (hours: number): boolean => {
  return hours >= BOOKING_LIMITS.MIN_HOURS && hours <= BOOKING_LIMITS.MAX_HOURS;
};

/**
 * Format time string to Indian format (12-hour with AM/PM)
 */
export const formatTimeToIndian = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Get business hours in display format
 */
export const getBusinessHoursDisplay = (): string => {
  return `${formatTimeToIndian(BUSINESS_HOURS.START)} - ${formatTimeToIndian(BUSINESS_HOURS.END)}`;
};

/**
 * Convert time string to minutes since midnight
 */
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};
