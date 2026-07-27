import type { PropsWithChildren } from 'react';

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="apple-itunes-app" content="app-id=6789723522" />
        <meta
          name="description"
          content="Open shared travel plans, dates, and itineraries in onTrack."
        />
        <style
          dangerouslySetInnerHTML={{
            __html:
              'html, body, #root { height: 100%; min-height: 100%; margin: 0; } #root { display: flex; } body { min-height: 100vh; min-height: 100dvh; background: #FBFAF7; }',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
