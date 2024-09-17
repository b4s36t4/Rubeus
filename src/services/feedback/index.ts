/**
 * Worker to save feedback against a trace id.
 * Feedback is stored in clickhouse table `feedback`.
 * This worker is called after the auth-worker, so authorisation is not required.
 */

import { globals } from './configs';
import { deleteFeedbacks, getFeedback, insertFeedback } from './clickhouse';
import { getResponse, sanitize } from './utils';
import { PORTKEY_HEADER_KEYS } from '../../middlewares/portkey/globals';

export async function handleFeedback(
  request: Request,
  env: Record<string, any>
) {
  const store: {
    organisationDetails: Record<string, any> | null;
    feedbackArray: any[];
    chLogObject: any[];
    feedbackTable: any;
  } = {
    organisationDetails: null,
    feedbackArray: [],
    chLogObject: [],
    feedbackTable: null,
  };

  //verify request method
  if (!globals.allowedRequestMethods.includes(request.method)) {
    return getResponse(
      'failure',
      405,
      'Portkey Error: Method not allowed. Error code: 01'
    );
  }
  //fetch the organisation details from headers
  try {
    const orgDetails = request.headers.get(
      PORTKEY_HEADER_KEYS.ORGANISATION_DETAILS
    );
    if (orgDetails) {
      store.organisationDetails = JSON.parse(orgDetails);
    }
    if (!store.organisationDetails || store.organisationDetails == null) {
      return getResponse(
        'failure',
        500,
        'Portkey Error: Unable to verify request. Error code: 02'
      );
    }
  } catch (e) {
    return getResponse(
      'failure',
      500,
      'Portkey Error: Unable to verify request. Error code: 022'
    );
  }

  //validate the request body
  const body: any = await request.json();
  if (!body || body == null) {
    return getResponse(
      'failure',
      400,
      'Portkey Error: Invalid Request Body. Error code: 03'
    );
  }

  //suport both object and array of objects
  if (body?.length) {
    store.feedbackArray.push(...body);
  } else {
    store.feedbackArray.push(body);
  }

  //validate the feedback array
  if (!store.feedbackArray || store.feedbackArray.length == 0) {
    return getResponse(
      'failure',
      400,
      'Portkey Error: Invalid Request Body. Error code: 031'
    );
  }

  store.feedbackTable =
    env.ANALYTICS_FEEDBACK_TABLE || 'portkey_enterprise.feedbacks';
  if (request.method === 'POST') {
    const resp = handleRequestBody(
      request.method,
      store.organisationDetails.id,
      store.feedbackArray
    );
    if (!resp.success) {
      return resp.response;
    }
    store.chLogObject = resp.logObject;
  } else {
    if (store.feedbackArray.length > 1) {
      return getResponse(
        'failure',
        400,
        'Portkey Error: Invalid Request Body. Multi Update is not supported. Error code: 031'
      );
    }
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const resp = handleRequestBody(
      request.method,
      store.organisationDetails.id,
      store.feedbackArray,
      id
    );
    if (!resp.success) {
      return resp.response;
    }
    store.chLogObject = resp.logObject;
    const feedbackResp: any = await getFeedback(
      env,
      store.feedbackTable,
      store.organisationDetails.id,
      id
    );

    if (feedbackResp.err) {
      return getResponse('failure', 500, `Something went wrong`, {});
    }

    const existingFb = feedbackResp?.data[0];
    if (!existingFb) {
      return getResponse(
        'failure',
        404,
        'Invalid Feedback Id passed. Nothing to update'
      );
    } else {
      const metaKeys = existingFb['meta.key'];
      if (metaKeys.length > 0) {
        existingFb['meta.key'] = `[${metaKeys
          .map((k: string) => `'${k}'`)
          .join(', ')}]`;
      }
      const metaValues = existingFb['meta.value'];
      if (metaValues.length > 0) {
        existingFb['meta.value'] = `[${metaValues
          .map((v: string) => `'${v}'`)
          .join(', ')}]`;
      }
    }
    store.chLogObject = [{ ...existingFb, ...resp.logObject[0] }];
    const deleteQuery = await deleteFeedbacks(
      env,
      store.feedbackTable,
      store.organisationDetails.id,
      id as string,
      store.chLogObject[0].trace_id,
      store.chLogObject[0].source
    );
    if (deleteQuery.err) {
      return getResponse('failure', 500, `Something went wrong`, {});
    }
  }

  //insert into clickhouse
  const insertQuery = await insertFeedback(
    env,
    store.feedbackTable,
    store.chLogObject
  );
  if (insertQuery.err) {
    return getResponse('failure', 500, `Something went wrong`, {});
  }

  return getResponse(
    'success',
    200,
    `Feedback successfully ${request.method === 'POST' ? 'saved' : 'updated'}`,
    { feedback_ids: store.chLogObject.map((fb) => fb.id) }
  );
}

function handleRequestBody(
  method: string,
  organisationId: string,
  feedbacks: any[],
  id?: any
) {
  const logObject = [];
  for (const fb of feedbacks) {
    //check for requried keys from globals.requiredRequestBodyKeys
    const keysToValidate =
      method === 'POST'
        ? globals.requiredRequestBodyKeysPost
        : globals.requiredRequestBodyKeysPut;
    for (const eachKey of keysToValidate) {
      if (!{}.propertyIsEnumerable.call(fb, eachKey)) {
        return {
          success: false,
          response: getResponse(
            'failure',
            400,
            'Portkey Error: Invalid Request Body. Error code: 032'
          ),
          logObject,
        };
      }
    }

    //check for valid value range
    if (fb.value < globals.minValue || fb.value > globals.maxValue) {
      return {
        success: false,
        response: getResponse(
          'failure',
          400,
          'Portkey Error: Invalid Request Body. Error code: 033'
        ),
        logObject,
      };
    }

    //check for valid weight range if present & valid, else set default weight
    if ({}.propertyIsEnumerable.call(fb, 'weight')) {
      if (fb.weight < globals.minWeight || fb.weight > globals.maxWeight) {
        fb.weight = globals.defaultWeight;
      }
    } else {
      fb.weight = globals.defaultWeight;
    }

    const eachFeedbackMetadata = fb.metadata || null;
    let sanitizedMetadata: Record<string, any> | undefined = {};
    if (eachFeedbackMetadata) {
      for (const [key, value] of Object.entries(eachFeedbackMetadata)) {
        sanitizedMetadata[sanitize(key)] = sanitize(value as string);
      }
    } else if (method === 'PUT') {
      sanitizedMetadata = undefined;
    }

    //append to chLogObject
    logObject.push({
      id: id || crypto.randomUUID(),
      ...(fb.trace_id ? { trace_id: fb.trace_id } : {}),
      organisation_id: organisationId,
      value: Number(fb.value),
      weight: Number(fb.weight),
      source: globals.defaultSource,
      _created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ...(sanitizedMetadata
        ? {
            'meta.key': `[${Object.keys(sanitizedMetadata)
              .map((k) => `'${k}'`)
              .join(', ')}]`,
            'meta.value': `[${Object.values(sanitizedMetadata)
              .map((v) => `'${v}'`)
              .join(', ')}]`,
          }
        : {}),
    });
  }
  return { success: true, response: null, logObject };
}
