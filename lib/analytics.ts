import { useOpenPanel } from '@openpanel/nextjs';
import { useEmojiData } from '@/lib/hooks/use-emoji-data';

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
  FEEDBACK_CLICKED = 'Feedback Link Clicked',
  FEEDBACK_MODAL_OPENED = 'Feedback Modal Opened',
  FEEDBACK_MODAL_CLOSED = 'Feedback Modal Closed',
  FEEDBACK_SUBMITTED = 'Feedback Submitted',
  FEEDBACK_SUBMISSION_FAILED = 'Feedback Submission Failed',
  REACTIONS_SCAN_STARTED = 'Reactions Scan Started',
  REACTIONS_SCAN_COMPLETED = 'Reactions Scan Completed',
  REACTIONS_FILTER_CHANGED = 'Reactions Filter Changed',
  REACTIONS_DATE_RANGE_CHANGED = 'Reactions Date Range Changed',
  REACTIONS_SHARE_CARD_DOWNLOADED = 'Reactions Share Card Downloaded',
  REACTIONS_SHARE_CARD_COPIED = 'Reactions Share Card Copied',
}

// Analytics utility hook to track events in the emoji dashboard
export function useAnalytics() {
  const op = useOpenPanel();
  const { workspace } = useEmojiData();

  return {
    // Track when a user views an emoji's details
    trackEmojiView: (emojiName: string, emojiCreator: string) => {
      op.track(AnalyticsEvent.VIEW_EMOJI, {
        emoji_name: emojiName,
        creator: emojiCreator,
        workspace,
      });
    },

    // Track when a user copies an emoji
    trackEmojiCopy: (emojiName: string) => {
      op.track(AnalyticsEvent.COPY_EMOJI, {
        emoji_name: emojiName,
        workspace,
      });
    },

    // Track when a user downloads an emoji
    trackEmojiDownload: (emojiName: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_EMOJI, {
        emoji_name: emojiName,
        workspace,
      });
    },

    // Track when a user views another user's profile
    trackUserProfileView: (username: string) => {
      op.track(AnalyticsEvent.VIEW_USER_PROFILE, {
        username,
        workspace,
      });
    },

    // Track when a user searches for emojis
    trackEmojiSearch: (searchTerm: string, resultCount: number) => {
      op.track(AnalyticsEvent.SEARCH_EMOJI, {
        search_term: searchTerm,
        result_count: resultCount,
        workspace,
      });
    },

    // Track when a user filters emojis
    trackEmojiFilter: (filterType: string, filterValue: string) => {
      op.track(AnalyticsEvent.FILTER_EMOJI, {
        filter_type: filterType,
        filter_value: filterValue,
        workspace,
      });
    },

    // Track when a user sorts emojis
    trackEmojiSort: (sortBy: string, sortDirection: 'asc' | 'desc') => {
      op.track(AnalyticsEvent.SORT_EMOJI, {
        sort_by: sortBy,
        sort_direction: sortDirection,
        workspace,
      });
    },

    // Track when a user navigates to a different page
    trackNavigation: (pageName: string, url: string) => {
      op.track(AnalyticsEvent.PAGE_NAVIGATION, {
        page: pageName,
        url: url,
        workspace,
      });
    },

    // Track when a user clicks the 'Download All' button
    trackDownloadAllClicked: (count: number, query: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_CLICKED, {
        emoji_count: count,
        search_query: query,
        workspace,
      });
    },

    // Track when 'Download All' succeeds
    trackDownloadAllSuccess: (count: number, query: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_SUCCESS, {
        downloaded_emoji_count: count,
        search_query: query,
        workspace,
      });
    },

    // Track when 'Download All' fails
    trackDownloadAllFailed: (count: number, query: string, reason: string) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_FAILED, {
        emoji_count_at_failure: count,
        search_query_at_failure: query,
        failure_reason: reason,
        workspace,
      });
    },

    // Track when 'Download All' is cancelled
    trackDownloadAllCancelled: (count: number, query: string, processedCount: number) => {
      op.track(AnalyticsEvent.DOWNLOAD_ALL_CANCELLED, {
        emoji_count_at_cancel: count,
        search_query_at_cancel: query,
        emojis_processed_before_cancel: processedCount,
        workspace,
      });
    },

    // Track when feedback link is clicked
    trackFeedbackClicked: () => {
      op.track(AnalyticsEvent.FEEDBACK_CLICKED, {
        workspace,
      });
    },

    // Track when feedback modal is opened
    trackFeedbackModalOpened: () => {
      op.track(AnalyticsEvent.FEEDBACK_MODAL_OPENED, {
        workspace,
      });
    },

    // Track when feedback modal is closed
    trackFeedbackModalClosed: (submitted: boolean) => {
      op.track(AnalyticsEvent.FEEDBACK_MODAL_CLOSED, {
        feedback_submitted: submitted,
        workspace,
      });
    },

    // Track when feedback is submitted
    trackFeedbackSubmitted: (feedbackType: 'bug' | 'feature', hasWorkspace: boolean, currentPage: string) => {
      op.track(AnalyticsEvent.FEEDBACK_SUBMITTED, {
        feedback_type: feedbackType,
        has_workspace_connected: hasWorkspace,
        submitted_from_page: currentPage,
        workspace,
      });
    },

    // Track when feedback submission fails
    trackFeedbackSubmissionFailed: (error: string) => {
      op.track(AnalyticsEvent.FEEDBACK_SUBMISSION_FAILED, {
        error_message: error,
        workspace,
      });
    },

    trackReactionsScanStarted: (channelCount: number, dateRange: string) => {
      op.track(AnalyticsEvent.REACTIONS_SCAN_STARTED, {
        channel_count: channelCount,
        date_range: dateRange,
        workspace,
      });
    },

    trackReactionsScanCompleted: (channelCount: number, reactionsFound: number, dateRange: string) => {
      op.track(AnalyticsEvent.REACTIONS_SCAN_COMPLETED, {
        channel_count: channelCount,
        reactions_found: reactionsFound,
        date_range: dateRange,
        workspace,
      });
    },

    trackReactionsFilterChanged: (filter: string) => {
      op.track(AnalyticsEvent.REACTIONS_FILTER_CHANGED, {
        filter,
        workspace,
      });
    },

    trackReactionsDateRangeChanged: (dateRange: string) => {
      op.track(AnalyticsEvent.REACTIONS_DATE_RANGE_CHANGED, {
        date_range: dateRange,
        workspace,
      });
    },

    trackReactionsShareCardDownloaded: () => {
      op.track(AnalyticsEvent.REACTIONS_SHARE_CARD_DOWNLOADED, { workspace });
    },

    trackReactionsShareCardCopied: () => {
      op.track(AnalyticsEvent.REACTIONS_SHARE_CARD_COPIED, { workspace });
    },

    // Identify a user - also caches to localStorage for session restore
    identifyUser: (userId: string, username: string, email?: string) => {
      // Cache for session restore
      if (typeof window !== "undefined") {
        localStorage.setItem("mobileUserId", userId)
        localStorage.setItem("userDisplayName", username)
      }

      op.identify({
        profileId: userId,
        firstName: username,
        email,
        properties: {
          app: 'emoji-dashboard',
          workspace,
        },
      });
    },
  };
}
