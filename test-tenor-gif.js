// Test script to fetch and process Tenor GIF
import { GifFrameExtractor } from './lib/utils/gif-frame-extractor.js'

async function testTenorGif() {
  const tenorUrl = 'https://media1.tenor.com/m/3l4Ky00EA8IAAAAd/liam-neeson-i-will-find-you.gif'
  
  console.log('Fetching Tenor GIF...')
  
  try {
    // Fetch the GIF
    const response = await fetch(tenorUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }
    
    const blob = await response.blob()
    const file = new File([blob], 'tenor-test.gif', { type: 'image/gif' })
    
    console.log(`GIF fetched: ${(file.size / 1024).toFixed(1)}KB`)
    
    // Extract frames
    console.log('Extracting frames...')
    const frames = await GifFrameExtractor.extractFrames(file, (progress, message) => {
      console.log(`Progress: ${progress}% - ${message || ''}`)
    })
    
    console.log(`\nExtraction complete!`)
    console.log(`Total frames extracted: ${frames.length}`)
    console.log(`Frame dimensions: ${frames[0]?.data.width}x${frames[0]?.data.height}`)
    console.log(`Frame delays:`, frames.map(f => f.delay))
    
    // Check frame quality
    console.log('\nChecking frame quality...')
    for (let i = 0; i < Math.min(5, frames.length); i++) {
      const frame = frames[i]
      let nonTransparent = 0
      let totalPixels = frame.data.width * frame.data.height
      
      for (let j = 3; j < frame.data.data.length; j += 4) {
        if (frame.data.data[j] > 0) nonTransparent++
      }
      
      console.log(`Frame ${i}: ${((nonTransparent / totalPixels) * 100).toFixed(1)}% non-transparent pixels`)
    }
    
    // Create a test HTML to visualize frames
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Tenor GIF Frame Test</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .frame { display: inline-block; margin: 10px; text-align: center; }
    canvas { border: 1px solid #ccc; }
  </style>
</head>
<body>
  <h1>Extracted Frames from Tenor GIF</h1>
  <p>Total frames: ${frames.length}</p>
  <div id="frames"></div>
  <script>
    const frames = ${JSON.stringify(frames.map(f => ({
      width: f.data.width,
      height: f.data.height,
      delay: f.delay,
      data: Array.from(f.data.data)
    })))};
    
    const container = document.getElementById('frames');
    frames.forEach((frame, i) => {
      const div = document.createElement('div');
      div.className = 'frame';
      
      const canvas = document.createElement('canvas');
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d');
      
      const imageData = ctx.createImageData(frame.width, frame.height);
      imageData.data.set(new Uint8ClampedArray(frame.data));
      ctx.putImageData(imageData, 0, 0);
      
      const label = document.createElement('div');
      label.textContent = \`Frame \${i + 1} (\${frame.delay}ms)\`;
      
      div.appendChild(canvas);
      div.appendChild(label);
      container.appendChild(div);
    });
  </script>
</body>
</html>`
    
    // Write test HTML
    const fs = await import('fs/promises')
    await fs.writeFile('test-tenor-frames.html', html)
    console.log('\nTest HTML written to test-tenor-frames.html')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run test if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testTenorGif()
}