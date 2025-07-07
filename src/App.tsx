import {
  // createAmplifyAuthAdapter,
  createStorageBrowser,
} from '@aws-amplify/ui-react-storage/browser';
import '@aws-amplify/ui-react-storage/styles.css';
import './App.css';

import config from '../amplify_outputs.json';
import bucketsConfig from '../buckets.json';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Authenticator, Button, Flex, Heading, Text, View, ThemeProvider, createTheme } from '@aws-amplify/ui-react';
// import { useEffect, useState } from 'react';
// Define allowed domains
const ALLOWED_DOMAINS = ["xops.sh", "alphav.io"];
Amplify.configure(config);

// Define bucket type
type BucketConfig = {
  bucket: string;
  region: string;
  prefix: string;
  id: string;
  type: 'BUCKET' | 'PREFIX';
  permissions: Array<'delete' | 'get' | 'list' | 'write'>;
};

// Convert buckets.json data into a Record for easier lookup
const allBuckets: Record<string, BucketConfig> = bucketsConfig.buckets.reduce((acc, bucket) => {
  acc[bucket.bucket] = {
    ...bucket,
    type: 'BUCKET' as const,
    permissions: bucket.permissions as Array<'delete' | 'get' | 'list' | 'write'>
  };
  return acc;
}, {} as Record<string, BucketConfig>);

// Create group to bucket mapping from buckets.json
const groupBucketMapping = bucketsConfig.buckets.reduce((acc, bucket) => {
  bucket.accesablegroups.forEach(group => {
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(bucket.bucket);
  });
  return acc;
}, {} as Record<string, string[]>);

// Simple component for the storage browser
function AdminStorageBrowser() {
  const { StorageBrowser } = createStorageBrowser({
    config: {
      // Default AWS `region` and `accountId` of the S3 buckets.
      region: 'eu-north-1',
      accountId: '522820335540',
      listLocations: async (input = {}) => {
        console.log("input", input);
        const { tokens } = await fetchAuthSession({ forceRefresh: true });
        const cognitoGroups = tokens?.idToken?.payload['cognito:groups'];
        const groups = Array.isArray(cognitoGroups) ? cognitoGroups : [];
        
        // Get unique accessible buckets based on user's groups
        const accessibleBuckets = new Set<string>();
        groups.forEach(group => {
          const buckets = groupBucketMapping[group as keyof typeof groupBucketMapping] || [];
          buckets.forEach(bucket => accessibleBuckets.add(bucket));
        });

        // Convert bucket names to bucket configurations
        const items = Array.from(accessibleBuckets)
          .map(bucketName => allBuckets[bucketName as keyof typeof allBuckets])
          .filter(Boolean);

        console.log('User groups:', groups);
        console.log('Accessible buckets:', items.map(item => item.bucket));

        return {
          items,
          nextToken: ""
        }
      },
      getLocationCredentials: async ({ scope, permissions }) => {
        console.log("scope", scope, "permissions", permissions);
        
        // Get credentials from environment variables
          const { credentials } = await fetchAuthSession();
          if (!credentials?.accessKeyId || !credentials?.secretAccessKey || !credentials?.sessionToken) {
            throw new Error('Invalid credentials received');
          }
          return {
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken || '', // Ensure non-undefined string
              expiration: credentials.expiration || new Date(Date.now() + 3600 * 1000)
            }
          };
        },
        registerAuthListener: () => {

          // console.log("onAuthChange", );
          // call `onAuthChange` to notify the `StorageBrowser` that an end user has signed out
        }
    },
  });
  return <StorageBrowser />;
}

// Main authenticated content component
function AuthenticatedContent(props: {
  user: any;
  signOut: any;
}) {
  const { user, signOut } = props;
  
  // Get the username from the user object
  const username = user?.signInDetails?.loginId || 'User';

  console.log("user", user);

  return (
    <>
      <Flex direction="row" alignItems="center" wrap="nowrap" gap="1rem">
        <Heading level={4}>{`Hello ${username}`}</Heading>
        <Button onClick={signOut}>Sign out</Button>
      </Flex>
        <>
          <Text variation="success" padding="0.5rem">You have admin access</Text>
          <AdminStorageBrowser />
        </>
    </>
  );
}

// Custom components for Authenticator with enhanced styling
const components = {
  Header() {
    return (
      <Flex direction="column" alignItems="center" gap="0.5rem" padding="1.5rem 0 1rem">
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

const services = { 
async validateCustomSignUp(formData:any) {
  const domain = formData?.email?.split('@').pop();
  if (ALLOWED_DOMAINS.length > 0 && domain && !ALLOWED_DOMAINS.includes(domain)) {
    return {
      email: `Only email addresses from ${ALLOWED_DOMAINS.join(' or ')} are allowed.`,
    };
  }
},
};

// Main App component
function App() {
  return (
    <ThemeProvider theme={theme}>
        <Authenticator 
          components={components}
          formFields={formFields}
          variation="default"
          services={services}
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
