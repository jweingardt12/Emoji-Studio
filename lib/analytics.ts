import { useOpenPanel } from '@/lib/safe-openpanel';

// Event types for better type safety
export enum AnalyticsEvent {
  VIEW_EMOJI = 'view_emoji',
  COPY_EMOJI = 'copy_emoji',
  DOWNLOAD_EMOJI = 'download_emoji',
  VIEW_USER_PROFILE = 'view_user_profile',
  SEARCH_EMOJI = 'search_emoji',
  FILTER_EMOJI = 'filter_emoji',
  SORT_EMOJI = 'sort_emoji',
  PAGE_NAVIGATION = 'page_navigation'
}

// Analytics utility hook to track events in the emoji dashboard
export function useAnalytics() {
  const op = useOpenPanel();

  return {
    // Track when a user views an emoji's details
    trackEmojiView: (emojiName: string, emojiCreator: string) => {
      op.track(AnalyticsEvent.VIEW_EMOJI, {
        emoji_name: emojiName,
        creator: emojiCreator,
      });
    },

    // Track when a user copies an emoji
    trackEmojiCopy: (emojiName: string) => {
      op.track(AnalyticsEvent.COPY_EMOJI, {
        emoji_name: emojiName,
      });
    },

    // Track when a user downloads an emoji
    trackEmojiDownload: (emojiName: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_EMOJI, {
        emoji_name: emojiName,
      });
    },

    // Track when a user views another user's profile
    trackUserProfileView: (username: string) => {
      op.track(AnalyticsEvent.VIEW_USER_PROFILE, {
        username,
      });
    },

    // Track when a user searches for emojis
    trackEmojiSearch: (searchTerm: string, resultCount: number) => {
      op.track(AnalyticsEvent.SEARCH_EMOJI, {
        search_term: searchTerm,
        result_count: resultCount,
      });
    },

    // Track when a user filters emojis
    trackEmojiFilter: (filterType: string, filterValue: string) => {
      op.track(AnalyticsEvent.FILTER_EMOJI, {
        filter_type: filterType,
        filter_value: filterValue,
      });
    },

    // Track when a user sorts emojis
    trackEmojiSort: (sortBy: string, sortDirection: 'asc' | 'desc') => {
      op.track(AnalyticsEvent.SORT_EMOJI, {
        sort_by: sortBy,
        sort_direction: sortDirection,
      });
    },
    
    // Track when a user navigates to a different page
    trackNavigation: (pageName: string, url: string) => {
      op.track(AnalyticsEvent.PAGE_NAVIGATION, {
        page: pageName,
        url: url,
      });
    },

    // Identify a user
    identifyUser: (userId: string, username: string, email?: string) => {
      op.identify({
        profileId: userId,
        firstName: username,
        email,
        properties: {
          app: 'emoji-dashboard',
        },
      });
    },
  };
}
