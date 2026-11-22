import { alert } from '@nativescript/core';

export function checkGPU() {
  let message: string;

  try {
    const scheduler = (globalThis as any).BGTaskScheduler;
    const resources = scheduler?.supportedResources;

    message = typeof resources === 'number'
      ? `Background GPU: ${(resources & 1) !== 0}`
      : 'API недоступен в этой версии Preview или iOS';
  } catch (error) {
    message = String(error);
  }

  alert({ title: 'GPU', message, okButtonText: 'OK' });
}
