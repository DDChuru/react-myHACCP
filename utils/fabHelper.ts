import { Platform } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Helper function to calculate proper FAB positioning that respects safe areas
 * @param insets - Safe area insets from useSafeAreaInsets()
 * @param baseBottom - Base bottom padding (default 16)
 * @returns Object with bottom position for FAB
 */
export const getFABPosition = (insets: EdgeInsets, baseBottom: number = 16) => {
  // Ensure FAB is always at least baseBottom pixels from the safe area
  // Add extra padding on Android to account for navigation bar
  const extraPadding = Platform.OS === 'android' ? 8 : 0;
  return {
    bottom: Math.max(insets.bottom + baseBottom, baseBottom) + extraPadding
  };
};

/**
 * Helper function to calculate list content padding when FAB is present
 * @param insets - Safe area insets from useSafeAreaInsets()
 * @param fabHeight - Height to reserve for FAB (default 100)
 * @returns Padding bottom value for list content
 */
export const getListPaddingForFAB = (insets: EdgeInsets, fabHeight: number = 100) => {
  // Add padding for FAB height plus safe area
  return insets.bottom + fabHeight;
};