import { useAuth } from '@clerk/clerk-expo';
import { PropsWithChildren, useState } from 'react';

import { SignInScreen } from './sign-in-screen';
import { SignUpScreen } from './sign-up-screen';

export function AuthGate({ children }: PropsWithChildren): JSX.Element {
  const { isSignedIn, isLoaded } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  if (!isLoaded) {
    return <></>;
  }

  if (!isSignedIn) {
    if (mode === 'sign-up') {
      return <SignUpScreen onSwitchToSignIn={() => setMode('sign-in')} />;
    }
    return <SignInScreen onSwitchToSignUp={() => setMode('sign-up')} />;
  }

  return <>{children}</>;
}
