import { logger } from '../../../apm';
import clickhouseClient from '../../../data-stores/clickhouse';

export const contructInsertQuery = (
  logObjects: Record<string, any>[],
  tableName: string
) => {
  const queryPrefix = `INSERT INTO ${tableName} (`;
  const queryMiddle = `) VALUES `;
  const querySuffix = `;`;

  // Assuming logObjects is an array of logObject
  let fields: string[] = [];
  const valuesArray = [];
  for (const logObject of logObjects) {
    const values = [];
    const intFields = [];
    for (const key in logObject) {
      if (
        !logObject[key].isNullable &&
        (logObject[key].value === null || logObject[key].value === undefined)
      ) {
        if (logObject[key].type === 'string') logObject[key].value = '';
        if (logObject[key].type === 'int' || logObject[key].type === 'float')
          logObject[key].value = 0;
      }
      if (logObject[key].value !== null && logObject[key].value !== undefined) {
        intFields.push(key);
        if (logObject[key].type === 'string') {
          values.push(`'${logObject[key].value}'`);
        } else {
          values.push(logObject[key].value);
        }
      }
    }
    if (!fields.length) {
      fields = intFields;
    }
    valuesArray.push(`(${values.join(',')})`);
  }
  const valuesString = valuesArray.join(',');
  const query = `${queryPrefix}${fields}${queryMiddle}${valuesString}${querySuffix}`;
  return query;
};

export const logToClickhouse = async (
  env: Record<string, any>,
  query: string
) => {
  try {
    await clickhouseClient.command({
      query,
    });
  } catch (err: any) {
    logger.error({
      message: err.message,
    });
    return false;
  }
  return true;
};
