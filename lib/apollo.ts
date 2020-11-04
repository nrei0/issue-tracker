// @nrei tbd: wrapper for pages / init state for memory cache / error handling for client.

import { ApolloClient, InMemoryCache, NormalizedCacheObject, gql } from '@apollo/client'
import { isSsr } from './ssr-detector'

// github graphql connection configuration.
const githubGraphQLEndpoint = 'https://api.github.com/graphql'
const accessToken = process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN

export const createApolloClient = (): ApolloClient<NormalizedCacheObject> =>
  new ApolloClient({
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    ssrMode: isSsr(),
    uri: githubGraphQLEndpoint,
    cache: new InMemoryCache(),
  })

// @nrei example.
createApolloClient()
  .query({
    query: gql`
      {
        search(
          type: ISSUE
          query: "repo:facebook/react is:issue in:title in:body state:closed test"
          last: 25
        ) {
          issueCount
          nodes {
            ... on Issue {
              title
              state
              number
            }
          }
        }
      }
    `,
  })
  .then((result) => console.log(result))
