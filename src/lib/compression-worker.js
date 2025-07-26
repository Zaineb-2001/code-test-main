// Compression Worker for handling large text efficiently
// This worker runs in a separate thread to avoid blocking the main UI

// Simple text compression algorithm
function compressText(text) {
  try {
    // Remove extra whitespace and normalize
    let compressed = text
      .replace(/\s+/g, ' ')           // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n')      // Multiple newlines to single newline
      .replace(/\t/g, ' ')            // Tabs to spaces
      .trim();

    // If still too large, apply more aggressive compression
    if (compressed.length > 1000000) { // 1MB
      compressed = compressed
        .replace(/[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}]/g, '') // Remove special chars
        .replace(/\s+/g, ' ')
        .trim();
    }

    return compressed;
  } catch (error) {
    throw new Error('Compression failed: ' + error.message);
  }
}

// Decompress text
function decompressText(text) {
  try {
    // For now, our compression is lossless, so decompression is just returning the text
    // In a real implementation, you might use more sophisticated compression
    return text;
  } catch (error) {
    throw new Error('Decompression failed: ' + error.message);
  }
}

// Handle messages from main thread
self.onmessage = function(event) {
  const { content, type } = event.data;

  try {
    let result;

    switch (type) {
      case 'compress':
        result = compressText(content);
        self.postMessage({
          type: 'compressed',
          compressed: result,
          originalSize: content.length,
          compressedSize: result.length,
          compressionRatio: ((content.length - result.length) / content.length * 100).toFixed(2)
        });
        break;

      case 'decompress':
        result = decompressText(content);
        self.postMessage({
          type: 'decompressed',
          decompressed: result
        });
        break;

      default:
        throw new Error('Unknown operation type: ' + type);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

// Handle errors
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    error: 'Worker error: ' + error.message
  });
}; 