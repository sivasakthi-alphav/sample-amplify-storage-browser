import {
  createAmplifyAuthAdapter,
  createStorageBrowser,
} from '@aws-amplify/ui-react-storage/browser';
import '@aws-amplify/ui-react-storage/styles.css';
import './App.css';

import config from '../amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Authenticator, Button, Flex, Heading, Text, View, Loader, ThemeProvider, createTheme } from '@aws-amplify/ui-react';
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

  console.log("isAdmin", isAdmin);
  
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
  console.log("userGroups",userGroups)
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

// Custom components for Authenticator with enhanced styling
const components = {
  Header() {
    return (
      <Flex direction="column" alignItems="center" gap="0.5rem" padding="1.5rem 0 1rem">
        {/* <View backgroundColor="brand.primary.80" padding="1rem" borderRadius="50%" width="60px" height="60px" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text fontSize="2rem" color="white">S3</Text>
        </View> */}
        <Heading level={3} fontWeight="500" style={{ color: '#1a365d', margin: '0.5rem 0' }}>
          S3 Storage Browser
        </Heading>
        <Text color="neutral.80" fontSize="0.9rem" style={{ color: '#4a5568' }}>
          Secure access to your cloud storage
        </Text>
      </Flex>
    );
  },
  Footer() {
    return (
      <View textAlign="center" padding="1.5rem 0 1rem" style={{ borderTop: '1px solid #e0e0e0' }}>
        <Text color="neutral.60" fontSize="0.8rem">
          &copy; {new Date().getFullYear()} - S3 Storage Browser - All rights reserved
        </Text>
      </View>
    );
  },
  SignIn: {
    Header() {
      return (
        <Flex direction="column" gap="0.5rem" padding="0 0 0rem">
          <Heading level={4} fontWeight="500" style={{ color: '#1a365d', marginBottom: '8px' }}>
            Sign in to your account
          </Heading>
          <Text color="neutral.80" fontSize="0.9rem" style={{ color: '#4a5568' }}>
            Access your storage buckets securely
          </Text>
        </Flex>
      );
    },
    Footer() {
      return (
        <View textAlign="center" padding="1rem 0 0">
          <Text color="neutral.80" fontSize="0.9rem">
            Don't have an account?{' '}
            <Text 
              as="span" 
              color="brand.primary.80" 
              fontWeight="500" 
              fontSize="0.9rem"
              style={{ 
                color: '#0073e6', 
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Create one now
            </Text>
          </Text>
        </View>
      );
    },
  },
  SignUp: {
    Header() {
      return (
        <Flex direction="column" gap="0.5rem" padding="0 0 0rem">
          <Heading level={4} fontWeight="500" style={{ color: '#1a365d', marginBottom: '8px' }}>
            Create a New Account
          </Heading>
          <Text color="neutral.80" fontSize="0.9rem" style={{ color: '#4a5568' }}>
            Join to access your storage securely
          </Text>
        </Flex>
      );
    },
    Footer() {
      return (
        <View textAlign="center" padding="1rem 0 0">
          <Text color="neutral.80" fontSize="0.9rem">
            Already have an account?{' '}
            <Text as="span" color="brand.primary.80" fontWeight="500" fontSize="0.9rem">
              Sign in instead
            </Text>
          </Text>
        </View>
      );
    },
  },
};

// Custom form fields
const formFields = {
  signIn: {
    username: {
      placeholder: 'Enter your email',
      label: 'Email',
      isRequired: true,
    },
    password: {
      label: 'Password',
      placeholder: 'Enter your password',
      isRequired: true,
    },
  },
  signUp: {
    email: {
      label: 'Email',
      placeholder: 'Enter your email address',
      isRequired: true,
      order: 1,
    },
    password: {
      label: 'Create Password',
      placeholder: 'Create a secure password',
      isRequired: true,
      order: 2,
    },
    confirm_password: {
      label: 'Confirm Password',
      placeholder: 'Please confirm your password',
      isRequired: true,
      order: 3,
    },
  },
};

// Custom theme for the Authenticator with simplified properties
const theme = createTheme({
  name: 'custom-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: '#e6f2ff' },
          20: { value: '#b3d9ff' },
          40: { value: '#80bfff' },
          60: { value: '#4da6ff' },
          80: { value: '#1a8cff' },
          90: { value: '#0073e6' },
          100: { value: '#0066cc' },
        }
      },
      font: {
        primary: { value: '#333333' },
        secondary: { value: '#555555' },
      },
      background: {
        primary: { value: '#ffffff' },
        secondary: { value: '#f7f9fa' },
      },
    },
    fontSizes: {
      small: { value: '0.8rem' },
      medium: { value: '1rem' },
      large: { value: '1.2rem' },
    },
    space: {
      small: { value: '0.5rem' },
      medium: { value: '1rem' },
      large: { value: '1.5rem' },
    },
    radii: {
      small: { value: '4px' },
      medium: { value: '8px' },
      large: { value: '12px' },
    },
    borderWidths: {
      small: { value: '1px' },
      medium: { value: '2px' },
      large: { value: '3px' },
    },
    components: {
      button: {
        primary: {
          backgroundColor: { value: '{colors.brand.primary.90.value}' },
          color: { value: 'white' },
        },
      },
    },
  },
});



// Main App component
function App() {
  return (
    <ThemeProvider theme={theme}>
        <Authenticator 
          components={components}
          formFields={formFields}
          variation="default"
          socialProviders={[/*'google', 'facebook', 'amazon'*/]}
        >
          {({ signOut, user }) => {
            console.log("user", user);
            return (
              <AuthenticatedContent 
                user={user} 
                signOut={signOut} 
              />
            );
          }}
        </Authenticator>
    </ThemeProvider>
  );
}

export default App;
