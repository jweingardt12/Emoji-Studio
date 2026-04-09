import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const since = searchParams.get('since'); // Timestamp in seconds
    const workspace = searchParams.get('workspace');
    
    if (!since) {
      return NextResponse.json(
        { error: 'Missing "since" parameter' },
        { status: 400 }
      );
    }
    
    const sinceTimestamp = parseInt(since);
    if (isNaN(sinceTimestamp)) {
      return NextResponse.json(
        { error: 'Invalid "since" parameter' },
        { status: 400 }
      );
    }
    
    // Get emoji data from localStorage or your data source
    // This is a simplified example - you'd need to adapt this to your actual data storage
    const response = await fetch(`${request.nextUrl.origin}/api/slack-emojis`, {
      headers: request.headers,
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch emoji data' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    
    if (!data.emojis) {
      return NextResponse.json({
        newEmojis: [],
        count: 0,
        since: sinceTimestamp
      });
    }
    
    // Filter emojis created after the specified timestamp
    const newEmojis = Object.entries(data.emojis)
      .filter(([name, emoji]: [string, any]) => {
        return emoji.created && emoji.created > sinceTimestamp;
      })
      .map(([name, emoji]: [string, any]) => ({
        name,
        ...emoji
      }))
      .sort((a: any, b: any) => (b.created || 0) - (a.created || 0));
    
    // Group by date for better organization
    const emojisByDate: Record<string, any[]> = {};
    newEmojis.forEach(emoji => {
      const date = new Date(emoji.created * 1000).toLocaleDateString();
      if (!emojisByDate[date]) {
        emojisByDate[date] = [];
      }
      emojisByDate[date].push(emoji);
    });
    
    return NextResponse.json({
      newEmojis,
      emojisByDate,
      count: newEmojis.length,
      since: sinceTimestamp,
      workspace: workspace || data.workspace,
      lastUpdated: Date.now() / 1000
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}