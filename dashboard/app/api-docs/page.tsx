import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'API Docs — AicoreMed',
  description:
    'Documentación interactiva de la API pública de AicoreMed. Autenticación vía API Key.',
};

/**
 * Página de documentación interactiva de la API pública.
 * @returns {React.ReactElement} La documentación Scalar de la API.
 */
export default function ApiDocsPage(): React.ReactElement {
  return (
    <>
      <Script
        id="scalar-api-reference"
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.28.13"
        strategy="afterInteractive"
      />
      <div id="api-reference" className="min-h-screen" />
      <Script
        id="scalar-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function wait() {
              if (window.Scalar && window.Scalar.ApiReference) {
                Scalar.ApiReference('#api-reference', {
                  theme: 'kepler',
                  layout: 'modern',
                  spec: { url: '/api/openapi.json' },
                  defaultHttpClient: { targetKey: 'node', clientKey: 'axios' },
                  metaData: { title: 'AicoreMed API v1' },
                });
              } else {
                setTimeout(wait, 50);
              }
            })();
          `,
        }}
      />
    </>
  );
}
