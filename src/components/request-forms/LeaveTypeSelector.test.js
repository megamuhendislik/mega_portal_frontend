import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('mazeret izni bakiyesinde kayan nokta artığını kullanıcıya göstermez', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { default: LeaveTypeSelector } = await vite.ssrLoadModule(
      '/src/components/request-forms/LeaveTypeSelector.jsx',
    );
    const html = renderToStaticMarkup(
      React.createElement(LeaveTypeSelector, {
        onSelect() {},
        leaveBalance: {
          net_balance: 8,
          advance_limit: 0,
          advance_used: 0,
          advance_remaining: 0,
        },
        excuseBalance: {
          hours_entitled: 18,
          hours_used: 12.47,
          hours_remaining: 5.530000000000001,
        },
        birthdayBalance: {
          eligible: true,
          already_used: false,
        },
      }),
    );

    assert.match(html, /Kalan: 5sa 32dk/);
    assert.doesNotMatch(html, /5\.530000000000001/);
  } finally {
    await vite.close();
  }
});
