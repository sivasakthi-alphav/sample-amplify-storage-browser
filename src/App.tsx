import {
  createAmplifyAuthAdapter,
  createStorageBrowser,
} from '@aws-amplify/ui-react-storage/browser';
import '@aws-amplify/ui-react-storage/styles.css';
import './App.css';

import config from '../amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import { Authenticator, Button, Flex, Heading } from '@aws-amplify/ui-react';
Amplify.configure(config);

const { StorageBrowser } = createStorageBrowser({
  config: createAmplifyAuthAdapter(),
});

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => {
console.log(user);
        return (
          <>
          <Flex direction="row" alignItems="center" wrap="nowrap" gap="1rem">
            <Heading level={4}>{`Hello ${user?.signInDetails?.loginId}`}</Heading>
            <Button onClick={signOut}>Sign out</Button>
          </Flex>
          <StorageBrowser />
        </>
      )}
    }
    </Authenticator>
  );
}

export default App;
