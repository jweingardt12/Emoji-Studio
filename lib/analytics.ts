import { useOpenPanel } from '@/lib/safe-openpanel';

// Event types for better type safety
export enum AnalyticsEvent {
  VIEW_EMOJI = 'View Emoji',
  COPY_EMOJI = 'Copy Emoji',
  DOWNLOAD_EMOJI = 'Download Emoji',
  VIEW_USER_PROFILE = 'View User Profile',
  SEARCH_EMOJI = 'Search Emoji',
  FILTER_EMOJI = 'Filter Emoji',
  SORT_EMOJI = 'Sort Emoji',
  PAGE_NAVIGATION = 'Page Navigation',
  DOWNLOAD_ALL_CLICKED = 'Download All Emojis Clicked',
  DOWNLOAD_ALL_SUCCESS = 'Download All Emojis Success',
  DOWNLOAD_ALL_FAILED = 'Download All Emojis Failed',
  DOWNLOAD_ALL_CANCELLED = 'Download All Emojis Cancelled',
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

    // Track when a user clicks the 'Download All' button
    trackDownloadAllClicked: (count: number, query: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_CLICKED, {
        emoji_count: count,
        search_query: query,
      });
    },

    // Track when 'Download All' succeeds
    trackDownloadAllSuccess: (count: number, query: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_SUCCESS, {
        downloaded_emoji_count: count,
        search_query: query,
      });
    },

    // Track when 'Download All' fails
    trackDownloadAllFailed: (count: number, query: string, reason: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_FAILED, {
        emoji_count_at_failure: count,
        search_query_at_failure: query,
        failure_reason: reason,
      });
    },

    // Track when 'Download All' is cancelled
    trackDownloadAllCancelled: (count: number, query: string, processedCount: number) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_CANCELLED, {
        emoji_count_at_cancel: count,
        search_query_at_cancel: query,
        emojis_processed_before_cancel: processedCount,
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
