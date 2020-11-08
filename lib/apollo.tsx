import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client'
import { ApolloProvider } from '@apollo/react-hooks'
import { NextComponentType, NextPage, NextPageContext } from 'next'
import Head from 'next/head'
import hoistNonReactStatics from 'hoist-non-react-statics'
import { isSsr } from './ssr-detector'

// API settings.
const apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT
const apiAccessToken = process.env.NEXT_PUBLIC_API_ACCESS_TOKEN

// Singleton CSR Apollo Client (BFF has unique Apollo client per request).
let csrApolloClient: ApolloClient<NormalizedCacheObject>

const createApolloClient = (
  bffState?: NormalizedCacheObject
): ApolloClient<NormalizedCacheObject> =>
  new ApolloClient({
    headers: {
      Authorization: `Bearer ${apiAccessToken}`,
    },
    ssrMode: isSsr(),
    uri: apiEndpoint,
    cache: new InMemoryCache().restore(bffState || {}),
  })

const initApolloClient = (
  bffState?: NormalizedCacheObject
): ApolloClient<NormalizedCacheObject> => {
  // BFF should use unique Apollo client to avoid using same state for multiple customers.
  if (isSsr()) {
    return createApolloClient(bffState)
  }

  // Apollo client for CSR should be singleton for utilising caching strategy.
  if (!csrApolloClient) {
    csrApolloClient = createApolloClient(bffState)
  }

  return csrApolloClient
}

type NextPageApolloIP = {
  apolloState?: NormalizedCacheObject
}

type NextPageApolloProps = {
  apolloClient?: ApolloClient<NormalizedCacheObject>
  apolloState?: NormalizedCacheObject
}

type NextPageApolloCtx = NextPageContext & {
  apolloClient?: ApolloClient<NormalizedCacheObject>
}

type NextPageApolloComponentType = NextComponentType<
  NextPageApolloCtx,
  NextPageApolloIP,
  NextPageApolloProps
>

interface WithApollo {
  (options?: { ssr?: boolean }): (PageComponent: NextPage) => NextPageApolloComponentType
}

// `withApollo` is HoC wraps React component for further API calls.
export const withApollo: WithApollo = ({ ssr = true } = {}) => (PageComponent) => {
  const WithApollo: NextPageApolloComponentType = ({ apolloClient, apolloState, ...props }) => {
    return (
      <ApolloProvider client={apolloClient || initApolloClient(apolloState)}>
        <PageComponent {...props} />
      </ApolloProvider>
    )
  }

  if (process.env.NODE_ENV !== 'production') {
    // Display correctly in devtools.
    const displayName = PageComponent.displayName || PageComponent.name || 'Component'
    WithApollo.displayName = `withApollo(${displayName})`
  }

  if (ssr || PageComponent.getInitialProps) {
    WithApollo.getInitialProps = async (ctx) => {
      const { AppTree } = ctx

      const apolloClient = (ctx.apolloClient = initApolloClient())

      let pageProps = {}

      if (PageComponent.getInitialProps) {
        pageProps = await PageComponent.getInitialProps(ctx)
      }

      // Server-side only.
      if (isSsr()) {
        if (ctx.res && ctx.res.writableEnded) {
          return pageProps
        }

        // SSR enabled only.
        if (ssr) {
          try {
            // Run all GraphQL queries.
            const { getDataFromTree } = await import('@apollo/react-ssr')
            await getDataFromTree(
              <AppTree
                pageProps={{
                  ...pageProps,
                  apolloClient,
                }}
              />
            )
          } catch (e) {
            // Prevent Apollo Client GraphQL errors from crashing SSR.
            // Handle them in components via the data.error prop:
            // https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-query-data-error
            console.error('Error while running `getDataFromTree`', e)
          }

          // `getDataFromTree` does not call `componentWillUnmount`.
          // Head side effect therefore need to be cleared manually.
          Head.rewind()
        }
      }

      const apolloState = apolloClient.cache.extract()

      return {
        ...pageProps,
        apolloState,
      }
    }
  }

  return hoistNonReactStatics(WithApollo, PageComponent)
}
