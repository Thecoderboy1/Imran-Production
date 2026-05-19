import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  const isPermissionDenied = errStr.includes('permission-denied');
  const isQuotaExceeded = errStr.includes('quota') || errStr.includes('limit') || errStr.includes('RESOURCE_EXHAUSTED');
  
  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };

  if (isPermissionDenied) {
    console.warn('Firestore Permission Denied (Handled):', operationType, path);
    if (operationType === OperationType.LIST || operationType === OperationType.GET) {
      return;
    }
  }

  if (isQuotaExceeded) {
    console.error('CRITICAL: Firestore Quota Exceeded. The app will likely crash or show a blank screen if not caught.');
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
