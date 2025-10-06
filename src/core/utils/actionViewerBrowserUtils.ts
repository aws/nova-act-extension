// Browser-specific utilities for ActionViewer component
// This file contains utilities that can be used in the browser environment

// Interface for bounding box coordinates
export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'click' | 'type' | 'scroll';
  text?: string;
}

/**
 * Helper function to decode HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const textarea: HTMLTextAreaElement = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Helper function to extract bounding boxes from action data
 */
export function extractBoundingBoxes(actionData: string): BoundingBox[] {
  const boxes: BoundingBox[] = [];

  // Regex patterns for different agent actions
  const clickPattern = /agentClick\(\s*"[^"]*<box>(\d+),(\d+),(\d+),(\d+)<\/box>[^"]*"\s*\)/g;
  const typePattern =
    /agentType\(\s*"([^"]*)",\s*"[^"]*<box>(\d+),(\d+),(\d+),(\d+)<\/box>[^"]*"\s*(?:,\s*\{[^}]*\})?\s*\)/g;
  const scrollPattern =
    /agentScroll\(\s*"([^"]*)",\s*"[^"]*<box>(\d+),(\d+),(\d+),(\d+)<\/box>[^"]*"\s*\)/g;

  // Extract click actions - coordinates are in y,x,y,x format
  let match;
  while ((match = clickPattern.exec(actionData)) !== null) {
    if (match[1] && match[2] && match[3] && match[4]) {
      boxes.push({
        x1: parseInt(match[2], 10), // x1 is second value
        y1: parseInt(match[1], 10), // y1 is first value
        x2: parseInt(match[4], 10), // x2 is fourth value
        y2: parseInt(match[3], 10), // y2 is third value
        type: 'click',
      });
    }
  }

  // Extract type actions - coordinates are in y,x,y,x format
  while ((match = typePattern.exec(actionData)) !== null) {
    if (match[1] && match[2] && match[3] && match[4] && match[5]) {
      boxes.push({
        x1: parseInt(match[3], 10), // x1 is third value (after text)
        y1: parseInt(match[2], 10), // y1 is second value (after text)
        x2: parseInt(match[5], 10), // x2 is fifth value (after text)
        y2: parseInt(match[4], 10), // y2 is fourth value (after text)
        type: 'type',
        text: match[1],
      });
    }
  }

  // Extract scroll actions - coordinates are in y,x,y,x format
  while ((match = scrollPattern.exec(actionData)) !== null) {
    if (match[1] && match[2] && match[3] && match[4] && match[5]) {
      boxes.push({
        x1: parseInt(match[3], 10), // x1 is third value (after direction)
        y1: parseInt(match[2], 10), // y1 is second value (after direction)
        x2: parseInt(match[5], 10), // x2 is fifth value (after direction)
        y2: parseInt(match[4], 10), // y2 is fourth value (after direction)
        type: 'scroll',
        text: match[1], // direction
      });
    }
  }

  return boxes;
}

/**
 * Configuration for bounding box styling
 */
export interface BoundingBoxStyle {
  strokeColor: string;
  fillColor: string;
  lineWidth: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  textPadding: number;
}

/**
 * Default styling configuration for bounding boxes
 */
export const DEFAULT_BOUNDING_BOX_STYLE: BoundingBoxStyle = {
  strokeColor: '#ff3434ff',
  fillColor: 'rgba(139, 92, 246, 0.1)',
  lineWidth: 4,
  fontSize: 14,
  fontFamily: 'Arial',
  textColor: '#ff3434ff',
  textPadding: 5,
};

/**
 * Process image to add bounding boxes directly onto it using Canvas API
 * This eliminates the need for complex DOM positioning and scaling calculations
 */
export function addBoundingBoxesToImage(
  imageData: string,
  boxes: BoundingBox[],
  style: BoundingBoxStyle = DEFAULT_BOUNDING_BOX_STYLE
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!boxes || boxes.length === 0) {
      resolve(imageData);
      return;
    }

    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Draw bounding boxes
        boxes.forEach((box) => {
          const width = box.x2 - box.x1;
          const height = box.y2 - box.y1;

          // Validate coordinates
          if (width <= 0 || height <= 0 || box.x1 < 0 || box.y1 < 0) {
            return; // Skip invalid boxes
          }

          // Set styles
          ctx.strokeStyle = style.strokeColor;
          ctx.fillStyle = style.fillColor;
          ctx.lineWidth = style.lineWidth;

          // Fill the rectangle with transparent color
          ctx.fillRect(box.x1, box.y1, width, height);

          // Draw the border
          ctx.strokeRect(box.x1, box.y1, width, height);

          // Add text label if available
          if (box.text && box.text.trim()) {
            ctx.fillStyle = style.textColor;
            ctx.font = `${style.fontSize}px ${style.fontFamily}`;

            // Position text above the box, or inside if there's not enough space
            const textY =
              box.y1 > style.fontSize + style.textPadding
                ? box.y1 - style.textPadding
                : box.y1 + style.fontSize + style.textPadding;

            ctx.fillText(box.text, box.x1 + style.textPadding, textY);
          }
        });

        // Convert back to base64
        const processedImageData = canvas.toDataURL('image/jpeg', 0.9);
        resolve(processedImageData);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageData;
  });
}
