import {
  createAmplifyAuthAdapter,
  createStorageBrowser,
} from '@aws-amplify/ui-react-storage/browser';
import '@aws-amplify/ui-react-storage/styles.css';
import './App.css';

import config from '../amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Authenticator, Button, Flex, Heading, Text, View, Loader } from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';
Amplify.configure(config);

// Simple component for the storage browser
function AdminStorageBrowser() {
  const { StorageBrowser } = createStorageBrowser({
    config: createAmplifyAuthAdapter(),
  });
  return <StorageBrowser />;
}

// Main authenticated content component
function AuthenticatedContent(props: {
  user: any;
  signOut: any;
}) {
  const { user, signOut } = props;
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiCallInProgress, setApiCallInProgress] = useState(false);

  // Function to check if user is in admin group
  const isAdmin = () => userGroups.includes('admin');

  // Get user groups when user is authenticated
  useEffect(() => {
    const getUserGroups = async () => {
      if (!user) {
        setUserGroups([]);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setApiCallInProgress(true); // Set API call in progress
        console.log('Calling Cognito API...');
        
        // Force refresh the session to get the latest token
        const { tokens } = await fetchAuthSession({ forceRefresh: true });
        
        console.log('Cognito API call completed');
        // Ensure we're handling the groups as a string array
        const cognitoGroups = tokens?.idToken?.payload['cognito:groups'];
        const groups = Array.isArray(cognitoGroups) ? cognitoGroups : [];
        console.log('User groups:', groups);
        setUserGroups(groups as string[]);
      } catch (error) {
        console.error('Error fetching user groups:', error);
        setUserGroups([]);
      } finally {
        setIsLoading(false);
        setApiCallInProgress(false); // API call completed
      }
    };

    getUserGroups();
  }, [user]);

  // Get the username from the user object
  const username = user?.signInDetails?.loginId || 'User';
  console.log("loading", isLoading, "apiCall", apiCallInProgress);

  // Show a full-page loading indicator when API call is in progress
  if (apiCallInProgress) {
    return (
      <View padding="2rem" textAlign="center">
        <Heading level={3}>Authenticating with Cognito</Heading>
        <Text padding="1rem">Please wait while we verify your permissions...</Text>
        <Flex justifyContent="center" padding="1rem">
          <Loader />
        </Flex>
      </View>
    );
  }

  return (
    <>
      <Flex direction="row" alignItems="center" wrap="nowrap" gap="1rem">
        <Heading level={4}>{`Hello ${username}`}</Heading>
        <Button onClick={signOut}>Sign out</Button>
      </Flex>
      
      {isLoading ? (
        <View padding="1rem">
          <Text>Loading user permissions...</Text>
          <Flex justifyContent="center" padding="1rem">
            <Loader />
          </Flex>
        </View>
      ) : 
      // isAdmin() ? (
        <>
          <Text variation="success" padding="0.5rem">You have admin access</Text>
          <AdminStorageBrowser />
        </>
      // ) : (
      //   <View padding="1rem">
      //     <Text variation="warning">You don't have permission to access storage.</Text>
      //     <Text>Contact an administrator to be added to the admin group.</Text>
      //   </View>
      // )
      }
    </>
  );
}

// Main App component
function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => {
        console.log("user",user);
        return (
        <AuthenticatedContent 
          user={user} 
          signOut={signOut} 
        />
      )}
    }
    </Authenticator>
  );
}

export default App;
