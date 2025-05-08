import { MintContractOptions, MintIngestionErrorName, MintIngestorError, MintIngestorResources } from '../../lib';

/**
 * @param resources MintIngestorResources
 * @param url string ie 'https://rodeo.club/post/0x98E9116a26E1cf014770122b2f5b7EE4Cad067bA/1?utm_source=twitter&utm_medium=tweet&utm_campaign=hot_ones'
 * @returns  { chainId: number, contractAddress: string, image: string , name: string}
 * @throws MintIngestorError
 */
export const getRodeoMintByURL = async (
  resources: MintIngestorResources,
  url: string,
): Promise<{
  chainId: number;
  contractAddress: string;
  image: string;
  name: string;
  mintAddress: string;
  description: string;
  tokenId: string;
}> => {
  const urlParts = new URL(url);
  const contractAddress = urlParts.pathname.split('/')[2];
  const tokenId = urlParts.pathname.split('/')[3];
  if (!contractAddress || contractAddress.length !== 42) {
    throw new MintIngestorError(MintIngestionErrorName.CouldNotResolveMint, 'Mint not found');
  }
  if (!tokenId || tokenId.length === 0) {
    throw new MintIngestorError(MintIngestionErrorName.CouldNotResolveMint, 'Token not found');
  }
  return await getRodeoMintByAddressAndChain(resources, 8453, contractAddress, tokenId);
};

export const getRodeoMintByAddressAndChain = async (
  resources: MintIngestorResources,
  chainId: number,
  contractAddress: string,
  tokenId: string,
) => {
  let response;
  try {
    const url = 'https://api.rodeo.club/graphql';

    const headers = {
      Accept: '*/*',
    };

    const data = {
      query: `
        query ShopPage($tokenFilter: TokenInput!) {
          token(by: {token: $tokenFilter}, filters: {existenceStatus: ANY}) {
            chainId
            contractAddress
            name
            description
            mintedCount
            uniqueMintersCount
            commentCount
            tokenId
            saleConfiguration {
              ... on TokenTimedSaleConfiguration {
                startTime
                endTime
                saleTermsId
              }
            }
            creator {
              user {
                displayName
                imageUrl
              }
              wallet {
                address
              }
            }
            media {
              ... on ImageMedia {
                url
                width
                height
                blurHash
                imageMimeType: mimeType
              }
              ... on VideoMedia {
                url
                previewUrl
                width
                height
                videoMimeType: mimeType
              }
            }
          }
        }
      `,
      variables: {
        tokenFilter: {
          chainId,
          contractAddress,
          tokenId: parseInt(tokenId),
        }
      },
      operationName: 'ShopPage',
    };

    response = await resources.fetcher.post(url, data, { headers });
  } catch (error) {
    console.error('Rodeo API error:', error);
    throw new MintIngestorError(MintIngestionErrorName.CouldNotResolveMint, 'Could not query mint from Rodeo API');
  }
  const responseData = response.data;
  if (!responseData || !responseData.data || !responseData.data.token) {
    console.error('Rodeo API response:', responseData);
    throw new MintIngestorError(MintIngestionErrorName.CouldNotResolveMint, 'Project not found');
  }

  const token = responseData.data.token;
  return {
    chainId: token.chainId,
    contractAddress: token.contractAddress,
    image: token.media?.url || '',
    name: token.name,
    mintAddress: '0x132363a3bbf47E06CF642dd18E9173E364546C99',
    description: token.description || '',
    public_sale_start_at: token.saleConfiguration?.startTime,
    public_sale_end_at: token.saleConfiguration?.endTime,
    tokenId: token.tokenId.toString(),
    sale_terms_id: token.saleConfiguration?.saleTermsId,
    user: {
      name: token.creator?.user?.displayName || 'Unknown',
      image: token.creator?.user?.imageUrl || '',
      address: token.creator?.wallet?.address || '',
    },
  };
};

export const rodeoSupports = async (
  contract: MintContractOptions,
  resources: MintIngestorResources,
): Promise<boolean> => {
  const { chainId, contractAddress, tokenId } = contract;
  try {
    const exists = await getRodeoMintByAddressAndChain(resources, chainId, contractAddress, tokenId as string);
    return !!exists;
  } catch (error) {
    return false;
  }
};
