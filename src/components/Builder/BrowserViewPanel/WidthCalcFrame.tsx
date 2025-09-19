import { useEffect, useState } from 'react';

import logger from '../../webviewLogger';

export const WidthCalcFrame = ({ devToolsUrl }: { devToolsUrl: string }) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    try {
      if (!devToolsUrl || !devToolsUrl.length) return;
      const endIndex = devToolsUrl.indexOf('/inspector.html?ws=');
      const base = devToolsUrl.substring(0, endIndex);

      fetch(devToolsUrl)
        .then((response) => response.body)
        .then(async (readableStream) => {
          if (!readableStream) return;
          const reader = readableStream.getReader();
          try {
            let site = '';

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              site += new TextDecoder().decode(value);
            }

            site = site.replace(
              `content="object-src 'none'; script-src 'self' https://chrome-devtools-frontend.appspot.com"`,
              `content="object-src 'none'; script-src 'unsafe-inline' 'self' https://chrome-devtools-frontend.appspot.com"`
            );
            site = site.replace(
              `<script type="module" src="./entrypoints/inspector/inspector.js"></script>`,
              `<script type="module" src="${base}/entrypoints/inspector/inspector.js"></script>`
            );
            site = site.replace(`<link href="./application_tokens.css" rel="stylesheet">`, ``);
            site = site.replace(`<link href="./design_system_tokens.css" rel="stylesheet">`, ``);

            site += `<script>
                      async function findElementInLoop(query, loopCount) {
                        console.log("[nova-act-extension] Searching for element to calculate browser width");
                        for (let i = 0; i < loopCount; i++) {
                          const element = document.querySelector(query); 
                          if (element) {
                            console.log("[nova-act-extension] Element found", query);
                            return element; // Return the element once found
                          } else {
                            await new Promise(resolve => setTimeout(resolve, 100));
                          }
                        }
                        console.log("[nova-act-extension] Element not found after iterations");
                        return null; // Return null if element is not found after all loops
                      }

                      let width = 300;
                      findElementInLoop('div.widget.vbox.screencast', 100).then(s => {
                        console.log("[nova-act-extension] Found screencast")
                        findElementInLoop('div.widget.vbox[slot="sidebar"]', 200).then(el => {
                          if (el) {
                            console.log("[nova-act-extension] Found sidebar")
                            width = el.offsetWidth;
                          }
                          var event = new CustomEvent('myWidthUpdate', { detail: { width } })
                          window.parent.document.dispatchEvent(event)
                        }).catch(err => {
                          console.warn("[nova-act-extension] Failed to find element with error:", err);
                          var event = new CustomEvent('myWidthUpdate', { detail: { width } })
                          window.parent.document.dispatchEvent(event)
                        });
                      }).catch(err => {
                        console.warn("[nova-act-extension] Failed to find element with error:", err);
                        var event = new CustomEvent('myWidthUpdate', { detail: { width } })
                        window.parent.document.dispatchEvent(event)
                      });
              </script>`;
            setHtml(site);
          } finally {
            reader.releaseLock(); // Release the reader lock
          }
        });
    } catch (error) {
      logger.debug(`Failed to render the ChromeDevTools iFrame\n${error}`);
    }
  }, [devToolsUrl]);

  if (!html.length || !devToolsUrl) <></>;

  return (
    <iframe
      className="devtools-iframe"
      style={{ opacity: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
      srcDoc={html}
    />
  );
};
