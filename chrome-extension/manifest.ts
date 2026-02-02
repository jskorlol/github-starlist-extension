import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: 'GitHub Starlist Extension',
  browser_specific_settings: {
    gecko: {
      id: '7d2b2f2e-7b9d-4d13-9a22-5c4a9c8b9a1f',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: 'Shows GitHub Stars list labels next to the Starred button',
  host_permissions: ['*://github.com/*'],
  permissions: [],
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  icons: {
    '128': 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['*://github.com/*'],
      js: ['content/all.iife.js'],
    },
    {
      matches: ['*://github.com/*'],
      css: ['content.css'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png'],
      matches: ['*://github.com/*'],
    },
  ],
} satisfies ManifestType;

export default manifest;
