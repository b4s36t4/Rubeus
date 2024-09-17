import { logger } from '../../../apm';
import { uploadToLogStore } from '../../../services/winky';
import { HookResultLogObject, WinkyLogObject } from '../types';

export async function forwardToWinky(env: any, winkyLogObject: WinkyLogObject) {
  try {
    await uploadToLogStore(winkyLogObject, 'generations', true, env);
  } catch (error: any) {
    logger.error({
      message: `forwardToWinky error: ${error.message}`,
    });
  }
}

export async function forwardHookResultsToWinky(
  env: any,
  logObject: HookResultLogObject
) {
  try {
    await uploadToLogStore(logObject, 'hookResults', true, env);
  } catch (error: any) {
    logger.error({
      message: `forwardHookResultsToWinky error: ${error.message}`,
    });
  }
}
