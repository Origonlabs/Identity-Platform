import { api, docs } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { attachFile } from 'fumadocs-openapi/server';
import { Box, Code, Puzzle, Users, type IconComponent } from '@opendex/stack-ui';
import { createElement } from 'react';

const iconMap = new Map<string, IconComponent>([
  ['object', Box],
  ['type', Code],
  ['hook', Puzzle],
  ['users', Users],
]);

// Helper function to create icon resolver
function createIconResolver() {
  return function icon(iconName?: string) {
    if (!iconName) {
      return;
    }

    const Icon = iconMap.get(iconName);
    if (Icon) {
      return createElement(Icon);
    }

    return;
  };
}

// Main docs source for /docs routes - includes all root sections
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  pageTree: {
    attachFile,
  },
  icon: createIconResolver(),
});

// API source for /api routes
export const apiSource = loader({
  baseUrl: '/api',
  source: api.toFumadocsSource(),
  pageTree: {
    attachFile,
  },
  icon: createIconResolver(),
});
