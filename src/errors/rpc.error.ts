export class RpcError extends Error {
  readonly context;

  constructor(message, stack?, context?) {
    super(message);
    this.name = 'RpcError';
    this.stack = stack;

    this.context = context;
  }
}
