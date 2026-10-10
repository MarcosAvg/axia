// Ejecuta una RPC de Supabase y lanza el error si lo hay.

export async function run(
  promise: { error: unknown } | PromiseLike<{ error: unknown }>,
): Promise<void> {
  const { error } = await promise
  if (error) throw error
}
