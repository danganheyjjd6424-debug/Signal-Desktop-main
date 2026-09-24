// Copyright 2017 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { app } from 'electron';

import { start } from './base_config.node.ts';
import config from './config.main.ts';
import * as Errors from '../ts/types/errors.std.ts';
import OS from '../ts/util/os/osMain.node.ts';

let userData: string | undefined;

// ============================================================
// MultiChat Desk - Signal multi-profile support
//
// Usage:
// Signal.exe --multichat-profile=001
// Signal.exe --multichat-profile=002
//
// Each profile gets its own completely separate userData folder.
// ============================================================

const MULTICHAT_PROFILE_PREFIX = '--multichat-profile=';

const multiChatProfileArgument = process.argv.find(arg =>
  arg.startsWith(MULTICHAT_PROFILE_PREFIX)
);

if (multiChatProfileArgument !== undefined) {
  const multiChatProfile = multiChatProfileArgument
    .slice(MULTICHAT_PROFILE_PREFIX.length)
    .trim();

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(multiChatProfile)) {
    throw new Error(
      `Invalid --multichat-profile value: ${multiChatProfile}`
    );
  }

  userData = join(
    app.getPath('appData'),
    'MultiChat-Signal',
    multiChatProfile
  );

  // oxlint-disable-next-line no-console
  console.log(
    `[MultiChat] profile=${multiChatProfile}, userData=${userData}`
  );
}

// ============================================================
// Original Signal userData handling
// ============================================================

// Only use Signal's normal storage configuration when
// --multichat-profile was NOT supplied.
if (userData === undefined) {
  // Use separate data directory for benchmarks & development
  if (config.has('storagePath')) {
    userData = String(config.get('storagePath'));
  } else if (config.has('storageProfile')) {
    userData = join(
      app.getPath('appData'),
      // oxlint-disable-next-line typescript/restrict-template-expressions
      `Signal-${config.get('storageProfile')}`
    );
  } else if (OS.isAppImage()) {
    userData = join(
      app.getPath('appData'),
      `${app.getName()} AppImage`
    );
  }
}

if (userData !== undefined) {
  try {
    mkdirSync(userData, { recursive: true });
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.error(
      'Failed to create userData',
      Errors.toLogFormat(error)
    );
  }

  app.setPath('userData', userData);
}

// Use console.log because logger isn't fully initialized yet
// oxlint-disable-next-line no-console
console.log(`userData: ${app.getPath('userData')}`);

const userDataPath = app.getPath('userData');
const targetPath = join(userDataPath, 'config.json');

export const userConfig = start({
  name: 'user',
  targetPath,
  throwOnFilesystemErrors: true,
});

export const get = userConfig.get.bind(userConfig);
export const remove = userConfig.remove.bind(userConfig);
export const set = userConfig.set.bind(userConfig);