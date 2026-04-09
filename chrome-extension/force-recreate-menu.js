// Force recreate context menu
// Run this in the Service Worker console

console.log('Removing all context menus...');
chrome.contextMenus.removeAll(() => {
  console.log('All menus removed');
  
  console.log('Creating new context menu...');
  chrome.contextMenus.create({
    id: 'createSlackEmoji',
    title: 'Create Slack emoji',
    contexts: ['image', 'video', 'audio'],
    documentUrlPatterns: ['<all_urls>']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
    } else {
      console.log('✅ Context menu created successfully!');
      console.log('Try right-clicking on an image now');
    }
  });
});

// Also check if we have data
chrome.storage.local.get(['slackData'], (result) => {
  const hasData = result.slackData && Object.keys(result.slackData).length > 0;
  console.log('Has Slack data:', hasData);
  if (hasData) {
    const workspace = Object.keys(result.slackData)[0];
    const emojiCount = result.slackData[workspace]?.emojis?.length || 0;
    console.log(`Workspace: ${workspace}, Emojis: ${emojiCount}`);
  }
});