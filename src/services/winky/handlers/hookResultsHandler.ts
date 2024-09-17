import { contructInsertQuery, logToClickhouse } from '../libs/clickhouse';
import { HookResultsRequestBodySchema } from '../validatorSchema/hookResultsLogSchema';

import { handleLoggingToStore } from '..';
import { logger } from '../../../apm';
import {
  HookResultsBaseLogObject,
  HookResultsLogObject,
  HookResultsRawLogObject,
  LogOptions,
  LogStoreApmOptions,
} from '../../../middlewares/portkey/types';

export async function hookResultsLogHandler(
  env: Record<string, string>,
  requestBody: Record<string, any>
) {
  try {
    try {
      HookResultsRequestBodySchema.parse(requestBody);
    } catch (err: any) {
      logger.error({
        message: 'HOOK_RESULTS_LOG_VALIDATION_ERROR',
        error: err.errors,
      });
      return new Response('Invalid request', { status: 400 });
    }

    // Base clickhouse log object with fixed fields
    const baseChLogObject: HookResultsBaseLogObject = {
      organisation_id: {
        type: 'string',
        value: requestBody.organisation_id,
        isNullable: false,
      },
      workspace_slug: {
        type: 'string',
        value: requestBody.workspace_slug,
        isNullable: false,
      },
      generation_id: {
        type: 'string',
        value: requestBody.generation_id,
        isNullable: false,
      },
      trace_id: {
        type: 'string',
        value: requestBody.trace_id,
        isNullable: false,
      },
      internal_trace_id: {
        type: 'string',
        value: requestBody.internal_trace_id,
        isNullable: false,
      },
    };

    const chInsertObjectArray: HookResultsLogObject[] = [];
    const logObjectArray: HookResultsRawLogObject[] = [];

    requestBody.results.forEach((result: any) => {
      // Clickhouse log object with hook specific fields
      const chLogObject: HookResultsLogObject = {
        ...baseChLogObject,
        id: {
          type: 'string',
          value: crypto.randomUUID(),
          isNullable: false,
        },
        hook_id: {
          type: 'string',
          value: result.id,
          isNullable: false,
        },
        guardrail_version_id: {
          type: 'string',
          value: result.guardrail_version_id || '',
          isNullable: false,
        },
        hook_event_type: {
          type: 'string',
          value: result.event_type,
          isNullable: false,
        },
        hook_category: {
          type: 'string',
          value: result.type,
          isNullable: false,
        },
        execution_time: {
          type: 'int',
          value: result.execution_time,
          isNullable: false,
        },
        created_at: {
          type: 'string',
          value: new Date(result.created_at)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' '),
          isNullable: false,
        },
        total_checks_passed: {
          type: 'int',
          value: 0,
          isNullable: false,
        },
        total_checks_failed: {
          type: 'int',
          value: 0,
          isNullable: false,
        },
        total_checks_errored: {
          type: 'int',
          value: 0,
          isNullable: false,
        },
        verdict: {
          type: 'int',
          value: result.verdict,
          isNullable: false,
        },
        async: {
          type: 'int',
          value: result.async,
          isNullable: false,
        },
        deny: {
          type: 'int',
          value: result.deny,
          isNullable: false,
        },
        is_raw_log_available: {
          type: 'int',
          value: false,
          isNullable: false,
        },
        'checks.check_id': {
          type: 'array',
          value: '',
          isNullable: false,
        },
        'checks.execution_time': {
          type: 'array',
          value: '',
          isNullable: false,
        },
        'checks.created_at': {
          type: 'array',
          value: '',
          isNullable: false,
        },
        'checks.verdict': {
          type: 'array',
          value: '',
          isNullable: false,
        },
        'checks.error': {
          type: 'array',
          value: '',
          isNullable: false,
        },
      };

      const logObject: HookResultsRawLogObject = {
        _id: chLogObject.id.value,
        hook_id: chLogObject.hook_id.value,
        organisation_id: chLogObject.organisation_id.value,
        created_at: chLogObject.created_at.value,
        checks: [],
      };

      result.checks.forEach((check: any, index: number) => {
        if (check.data || check.error) {
          logObject.checks.push({
            check_id: check.id,
            data: check.data || null,
            error: check.error || null,
          });

          chLogObject.is_raw_log_available.value = true;
        }

        if (check.verdict && !check.error)
          chLogObject.total_checks_passed.value++;
        if (!check.verdict && !check.error)
          chLogObject.total_checks_failed.value++;
        if (check.error) chLogObject.total_checks_errored.value++;

        chLogObject['checks.check_id'].value +=
          (index > 0 ? ', ' : '') + `'${check.id}'`;
        chLogObject['checks.execution_time'].value +=
          (index > 0 ? ', ' : '') + `${check.execution_time}`;
        chLogObject['checks.created_at'].value +=
          (index > 0 ? ', ' : '') +
          `'${new Date(check.created_at)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ')}'`;
        chLogObject['checks.verdict'].value +=
          (index > 0 ? ', ' : '') + `${check.verdict}`;
        const checkError = check.error ? true : false;
        chLogObject['checks.error'].value +=
          (index > 0 ? ', ' : '') + `${checkError}`;
      });

      chLogObject['checks.check_id'].value =
        `[${chLogObject['checks.check_id'].value}]`;

      chLogObject['checks.created_at'].value =
        `[${chLogObject['checks.created_at'].value}]`;

      chLogObject['checks.execution_time'].value =
        `[${chLogObject['checks.execution_time'].value}]`;

      chLogObject['checks.verdict'].value =
        `[${chLogObject['checks.verdict'].value}]`;

      chLogObject['checks.error'].value =
        `[${chLogObject['checks.error'].value}]`;

      chInsertObjectArray.push(chLogObject);
      if (logObject.checks.length > 0) {
        logObjectArray.push(logObject);
      }
    });

    const chQuery = contructInsertQuery(
      chInsertObjectArray,
      env.ANALYTICS_GENERATION_HOOKS_TABLE
    );

    logToClickhouse(env, chQuery);

    if (logObjectArray.length > 0) {
      const retentionPeriod =
        requestBody.organisation_details?.settings?.system_log_retention || 30;
      const logObjectUploadPromiseArray: Promise<void>[] = [];
      logObjectArray.forEach((logObject) => {
        const logOptions: LogOptions = {
          filePath: `${retentionPeriod}/${requestBody.organisation_id}/hooks/${logObject._id}.json`,
          mongoCollectionName: env.MONGO_GENERATION_HOOKS_COLLECTION_NAME,
        };
        const logStoreApmOptions: LogStoreApmOptions = {
          logId: logObject._id,
          type: 'generation_hooks',
          organisationId: requestBody.organisation_id,
        };

        logObjectUploadPromiseArray.push(
          handleLoggingToStore(env, logObject, logOptions, logStoreApmOptions)
        );
      });

      Promise.all(logObjectUploadPromiseArray);
    }

    return new Response('ok', { status: 200 });
  } catch (err: any) {
    logger.error({
      message: 'HOOK_RESULTS_LOG_ERROR',
      error: err.message,
    });
    return new Response('Internal server error', { status: 500 });
  }
}
