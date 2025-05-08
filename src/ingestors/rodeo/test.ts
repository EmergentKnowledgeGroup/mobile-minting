import { getRodeoMintByURL } from './offchain-metadata';
import { MintIngestorResources } from '../../lib/types/mint-ingestor';

async function testRodeoIngestor() {
  // Example Rodeo URL - you can replace this with any valid Rodeo URL
  const testUrl = 'https://rodeo.club/post/0x98E9116a26E1cf014770122b2f5b7EE4Cad067bA/1';
  
  // Create a simple fetch-like client
  const fetcher = {
    post: async (url: string, data: any, config: any) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(data),
      });
      return { data: await response.json() };
    },
  };
  
  const resources: MintIngestorResources = {
    fetcher,
    alchemy: {} as any, // Mock alchemy for testing
  };

  try {
    console.log('Testing Rodeo ingestor with URL:', testUrl);
    const result = await getRodeoMintByURL(resources, testUrl);
    console.log('Success! Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRodeoIngestor(); 