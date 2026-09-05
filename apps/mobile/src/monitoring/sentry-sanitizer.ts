import type { ErrorEvent, StackFrame } from '@sentry/react-native';

const SAFE_CONTEXT_FIELDS: Record<string, readonly string[]> = {
  app: ['app_build', 'app_identifier', 'app_name', 'app_version', 'build_type'],
  device: [
    'arch',
    'battery_level',
    'charging',
    'family',
    'free_memory',
    'memory_size',
    'model',
    'model_id',
    'orientation',
    'screen_density',
    'screen_dpi',
    'screen_height_pixels',
    'screen_width_pixels',
    'simulator',
  ],
  os: ['build', 'kernel_version', 'name', 'rooted', 'version'],
  runtime: ['name', 'version'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeStackFrame(frame: StackFrame): StackFrame {
  return {
    addr_mode: frame.addr_mode,
    colno: frame.colno,
    debug_id: frame.debug_id,
    filename: frame.filename,
    function: frame.function,
    in_app: frame.in_app,
    instruction_addr: frame.instruction_addr,
    lineno: frame.lineno,
    module: frame.module,
    platform: frame.platform,
  };
}

function safeContexts(contexts: ErrorEvent['contexts']): ErrorEvent['contexts'] {
  if (!contexts) return undefined;

  const sanitized: NonNullable<ErrorEvent['contexts']> = {};
  for (const [contextName, fields] of Object.entries(SAFE_CONTEXT_FIELDS)) {
    const source = contexts[contextName];
    if (!isRecord(source)) continue;

    const context: Record<string, unknown> = {};
    for (const field of fields) {
      if (source[field] !== undefined) context[field] = source[field];
    }
    if (Object.keys(context).length > 0) sanitized[contextName] = context;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Keep crash grouping and symbolication data while dropping all application
 * values that could contain ballot or voter content.
 */
export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  return {
    contexts: safeContexts(event.contexts),
    debug_meta: event.debug_meta,
    dist: event.dist,
    environment: event.environment,
    event_id: event.event_id,
    exception: event.exception
      ? {
          values: event.exception.values?.map((exception) => ({
            mechanism: exception.mechanism
              ? {
                  handled: exception.mechanism.handled,
                  type: exception.mechanism.type,
                }
              : undefined,
            stacktrace: exception.stacktrace
              ? { frames: exception.stacktrace.frames?.map(safeStackFrame) }
              : undefined,
            type: exception.type,
            value: 'Redacted application error',
          })),
        }
      : undefined,
    level: event.level,
    modules: event.modules,
    platform: event.platform,
    release: event.release,
    sdk: event.sdk,
    timestamp: event.timestamp,
    type: undefined,
  };
}
