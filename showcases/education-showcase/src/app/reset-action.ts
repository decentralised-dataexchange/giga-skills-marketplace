'use server';

import { revalidatePath } from 'next/cache';

import { resetDemoData } from '@/lib/reset';

/** The landing-page demo reset. */
export async function resetDemo(): Promise<void> {
  await resetDemoData();
  revalidatePath('/');
}
