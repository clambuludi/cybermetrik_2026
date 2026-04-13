import { createContextId } from '@builder.io/qwik';

import { type SessionPayload } from '~/utils/auth';

export interface UserContextType {
    user: SessionPayload | null;
}

export const UserContext = createContextId<UserContextType>('user-context');
