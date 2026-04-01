'use client';

import { ReactNode } from 'react';
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {                                                                                                                                                                         
    Cognito: {                                                                                                                                                                    
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,                                                                                                                  
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID!,                                                                                                           
      identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID!,
      allowGuestAccess: true,                                                                                                          
    },                                                                                                                                                                            
  },                                                                                                                                                                              
});     

export default function AmplifyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
