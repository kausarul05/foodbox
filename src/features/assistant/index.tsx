/**
 * The feature's only entry point. `(site)/layout.tsx` renders this and nothing
 * else knows the feature exists — see README.md for how to remove it.
 *
 * The flag is checked here rather than inside the widget so that when it is
 * off, the whole chat is a `return null` the bundler can drop: a build without
 * NEXT_PUBLIC_ASSISTANT ships no assistant code and no extra markup.
 */

import { ASSISTANT_ENABLED } from './config';
import AssistantWidget from './AssistantWidget';

export default function Assistant() {
  if (!ASSISTANT_ENABLED) return null;
  return <AssistantWidget />;
}
