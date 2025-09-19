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

    // Find all step divs using regex
    const stepDivRegex = /<div[^>]*border:\s*1px\s+solid\s+#ddd[^>]*>([\s\S]*?)<\/div>/gi;
    let stepMatch;

    while ((stepMatch = stepDivRegex.exec(htmlContent)) !== null) {
      const stepContent = stepMatch[1];
      if (!stepContent) continue;

      // Extract step number
      const stepNumberMatch = stepContent.match(/<h4[^>]*>Step\s+(\d+)<\/h4>/i);
      if (!stepNumberMatch?.[1]) continue;

      const stepNumber = parseInt(stepNumberMatch[1]);

      // Extract URL
      const urlMatch = stepContent.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
      const currentUrl = urlMatch?.[1] || '';

      // Extract timestamp
      const timestampMatch = stepContent.match(/<strong[^>]*>Timestamp:<\/strong>\s*([^<\n]+)/i);
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
