import fs from 'node:fs';
import path from 'node:path';

interface AppConfig {
  expo?: {
    android?: {
      intentFilters?: {
        data?: { host?: string; pathPrefix?: string; scheme?: string }[];
      }[];
    };
    ios?: {
      associatedDomains?: string[];
    };
  };
}

interface AppleAppSiteAssociation {
  applinks?: {
    details?: {
      components?: { '/': string }[];
    }[];
  };
}

const SHARE_PATH_PREFIXES = ['/i/', '/j/', '/f/', '/c/', '/l/', '/v/'] as const;
const SHARE_AASA_PATHS = ['/i/*', '/j/*', '/f/*', '/c/*', '/l/*', '/v/*'] as const;

describe('travel invitation links', () => {
  const root = path.resolve(__dirname, '../../../..');

  it('registers the hosted invitation domain and share paths on iOS', () => {
    const app = JSON.parse(
      fs.readFileSync(path.join(root, 'app.json'), 'utf8'),
    ) as AppConfig;
    const association = JSON.parse(
      fs.readFileSync(
        path.join(root, 'public/.well-known/apple-app-site-association'),
        'utf8',
      ),
    ) as AppleAppSiteAssociation;

    expect(app.expo?.ios?.associatedDomains).toContain(
      'applinks:ontrack--links.expo.app',
    );
    const paths =
      association.applinks?.details?.flatMap((detail) =>
        detail.components?.map((component) => component['/']) ?? [],
      ) ?? [];
    for (const sharePath of SHARE_AASA_PATHS) {
      expect(paths).toContain(sharePath);
    }
  });

  it('registers the hosted short-link paths on Android', () => {
    const app = JSON.parse(
      fs.readFileSync(path.join(root, 'app.json'), 'utf8'),
    ) as AppConfig;
    const data = app.expo?.android?.intentFilters?.flatMap(
      (filter) => filter.data ?? [],
    );

    for (const pathPrefix of SHARE_PATH_PREFIXES) {
      expect(data).toContainEqual({
        scheme: 'https',
        host: 'ontrack--links.expo.app',
        pathPrefix,
      });
    }
  });
});
