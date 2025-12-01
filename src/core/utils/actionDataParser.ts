export interface ActionStep {
  stepNumber: number;
  currentUrl: string;
  timestamp: string;
  imageData?: string;
  actionData?: string;
}

export interface ActionData {
  actId: string;
  prompt: string;
  steps: ActionStep[];
  sessionId?: string | null;
}

export function parseActionHtml(htmlContent: string): ActionData | null {
  try {
    // Extract Act ID
    const actIdMatch = htmlContent.match(/<h3[^>]*>Act ID:\s*([^<]+)<\/h3>/i);
    const actId = actIdMatch?.[1]?.trim() || '';

    // Extract Prompt
    const promptMatch = htmlContent.match(/<h3[^>]*>Prompt:\s*([^<]+)<\/h3>/i);
    const prompt = promptMatch?.[1]?.trim() || '';

    // Extract Steps
    const steps: ActionStep[] = [];

    // Support both HTML formats: newer SDK versions use class="run-step-container",
    // older versions use inline style border: 1px solid #ddd
    // New format has nested structure: run-step-container > step-header + step-body > run-step-body
    const newFormatRegex =
      /<div\s+class="run-step-container"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    const oldFormatRegex = /<div[^>]*border:\s*1px\s+solid\s+#ddd[^>]*>([\s\S]*?)<\/div>/gi;

    const newMatches = [...htmlContent.matchAll(newFormatRegex)];
    const oldMatches = [...htmlContent.matchAll(oldFormatRegex)];
    const allMatches = newMatches.length > 0 ? newMatches : oldMatches;

    for (const stepMatch of allMatches) {
      const stepContent = stepMatch[1];
      if (!stepContent) continue;

      // Extract step number - support both h4 and span formats
      let stepNumberMatch = stepContent.match(/<h4[^>]*>Step\s+(\d+)<\/h4>/i);
      if (!stepNumberMatch) {
        stepNumberMatch = stepContent.match(
          /<span[^>]*class="step-title"[^>]*>Step\s+(\d+)<\/span>/i
        );
      }
      if (!stepNumberMatch?.[1]) continue;

      const stepNumber = parseInt(stepNumberMatch[1]);

      // Extract URL
      const urlMatch = stepContent.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
      const currentUrl = urlMatch?.[1] || '';

      // Extract timestamp - support both strong and div formats
      let timestampMatch = stepContent.match(/<strong[^>]*>Timestamp:<\/strong>\s*([^<\n]+)/i);
      if (!timestampMatch) {
        timestampMatch = stepContent.match(
          /<div[^>]*>Timestamp<\/div>\s*<div[^>]*>([^<]+)<\/div>/i
        );
      }
      const timestamp = timestampMatch?.[1]?.trim() || '';

      // Extract image data
      const imageMatch = stepContent.match(/<img[^>]*src="(data:image[^"]*)"[^>]*>/i);
      const imageData = imageMatch?.[1] || undefined;

      // Extract action data from <pre> tag
      const preMatch = stepContent.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      const actionData = preMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || undefined;

      steps.push({
        stepNumber,
        currentUrl,
        timestamp,
        imageData,
        actionData,
      });
    }

    return {
      actId,
      prompt,
      steps,
    };
  } catch (_error) {
    return null;
  }
}
