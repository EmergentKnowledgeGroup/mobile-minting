import { MintContractOptions, MintIngestorResources } from 'src/lib';
import { Collection, CollectionByAddress, HighlightMintVector } from './types';

const HIGHLIGHT_API_URL = 'https://api.highlight.xyz:8080/';
const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
};

const getHighlightCollectionDetails = async (
  resources: MintIngestorResources,
  collectionId: string,
): Promise<Collection | undefined> => {
  const data = {
    operationName: 'GetCollectionDetails',
    variables: {
      collectionId,
      withEns: true,
    },
    query: `
      query GetCollectionDetails($collectionId: String!, $withEns: Boolean) {
        getPublicCollectionDetails(collectionId: $collectionId) {
          id
          name
          description
          collectionImage
          marketplaceId
          accountId
          address
          chainId
          status
          baseUri
          onChainBaseUri
          creatorAddresses {
            address
            name
          }
          creatorEns
          creatorAccountSettings(withEns: $withEns) {
            verified
            imported
            displayAvatar
            displayName
            walletAddresses
          }
          mintVectors {
            name
            start
            end
            paused
            price
            currency
            chainId
            onchainMintVectorId
            paymentCurrency {
              address
              decimals
              symbol
              type
              mintFee
            }
          }
        }
      }
    `,
  };

  try {
    const resp = await resources.fetcher.post(HIGHLIGHT_API_URL, data, { headers });
    return resp.data.data?.getPublicCollectionDetails;
  } catch (error) {}
};

const vectorIdFromOnchainId = (onchainMintVectorId: string): string | undefined => {
  const vectorId = onchainMintVectorId.split(':').pop();
  if (!vectorId || !/^\d+$/.test(vectorId)) {
    return undefined;
  }
  return vectorId;
};

export const getHighlightPrimaryMintVector = (
  collection: Collection,
): HighlightMintVector | undefined => {
  return collection.mintVectors?.find(
    (vector) =>
      vector.chainId === 8453 &&
      !vector.paused &&
      vector.currency.toLowerCase() === NATIVE_ETH_ADDRESS &&
      !!vectorIdFromOnchainId(vector.onchainMintVectorId),
  );
};

export const getHighlightMintVectorId = (vector: HighlightMintVector): string | undefined => {
  return vectorIdFromOnchainId(vector.onchainMintVectorId);
};

export const highlightEthToWei = (amount: string | undefined): bigint => {
  if (!amount) {
    return 0n;
  }
  const [wholePart, fractionalPart = ''] = amount.split('.');
  const whole = BigInt(wholePart || '0') * 10n ** 18n;
  const fractional = BigInt((fractionalPart + '0'.repeat(18)).slice(0, 18));
  return whole + fractional;
};

export const getHighlightVectorPriceInWei = (vector: HighlightMintVector): string => {
  const mintFee = highlightEthToWei(vector.paymentCurrency?.mintFee);
  const price = highlightEthToWei(vector.price);
  return (price + mintFee).toString();
};

export const getHighlightCollectionById = async (
  resources: MintIngestorResources,
  id: string,
): Promise<Collection | undefined> => {
  return getHighlightCollectionDetails(resources, id);
};

export const getHighlightCollectionByAddress = async (
  resources: MintIngestorResources,
  contractOptions: MintContractOptions,
): Promise<CollectionByAddress | undefined> => {
  try {
    const collection = await getHighlightCollectionDetails(
      resources,
      `base:${contractOptions.contractAddress}`,
    );
    if (!collection || collection.chainId !== 8453) {
      return undefined;
    }
    const mintVector = getHighlightPrimaryMintVector(collection);
    if (!mintVector) {
      return undefined;
    }
    const creator = collection.creatorAddresses?.[0]?.address.toLowerCase() || '';

    return {
      id: collection.id,
      chainId: collection.chainId,
      name: collection.name,
      description: collection.description,
      image: collection.collectionImage,
      sampleImages: [collection.collectionImage],
      creator,
      contract: collection.address,
      primaryContract: collection.address,
      mintVector,
      creatorAccountSettings: collection.creatorAccountSettings,
    };
  } catch (error) {}
};
