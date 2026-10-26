import mongoose from 'mongoose';

/**
 * Register a model, and keep it in step with the schema in development.
 *
 * Every model here used to end with `models.X || model('X', schema)`. That
 * guard is needed — registering the same name twice throws, and Next imports
 * these files many times — but it also means the **first** schema the process
 * ever saw is the one it keeps using. Mongoose caches models on its own
 * singleton, which lives in `node_modules` and survives Next's hot reload, so
 * editing a schema in development changes nothing until the dev server is
 * restarted. And because schemas are strict, a write to a path the cached
 * model does not know about is not an error: the field is silently dropped.
 *
 * That cost a real joining payment on 26 Oct 2026. `paidAmount` and
 * `walletCredit` had just been added to Subscription; the route computed them,
 * the request succeeded, and the stored document held the ৳90 fee with no
 * trace of the ৳1,840 the customer had actually sent. Approving it would have
 * credited nothing.
 *
 * So in development the cached model is dropped and rebuilt from the file on
 * every reload. In production the process is built once and nothing is ever
 * stale, so this is the plain `models.X ||` guard again.
 */
export function defineModel<T, M extends mongoose.Model<T> = mongoose.Model<T>>(
  name: string,
  schema: mongoose.Schema<T, M>
): M {
  if (process.env.NODE_ENV !== 'production' && mongoose.models[name]) {
    // Model names are resolved at query time, so a `ref` pointing at this name
    // from another schema keeps working across the swap.
    mongoose.deleteModel(name);
  }
  return (mongoose.models[name] as M) ?? mongoose.model<T, M>(name, schema);
}
