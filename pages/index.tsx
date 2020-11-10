import { useRef, useState } from 'react'
import { gql, useLazyQuery, useQuery } from '@apollo/client'
import { SearchBar } from '../components/search-bar'
import { IssueList, IssueListItemProps } from '../components/issue-list'
import { withApollo } from '../lib/apollo'
import { IssueState } from '../lib/common-types'
import { Button, Container, Header } from 'semantic-ui-react'
import styles from './index.module.scss'

const SEARCH_QUERY = gql`
  query($query: String!, $after: String, $limit: Int!) {
    search(type: ISSUE, query: $query, after: $after, first: $limit) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Issue {
          id
          title
          state
          number
        }
      }
    }
  }
`

type Issue = IssueListItemProps & {
  id: string
}

type SearchQueryResult = {
  search?: {
    pageInfo?: {
      hasNextPage: boolean
      endCursor: string
    }
    nodes?: Issue[]
  }
}

// Number of issues per query call.
const limit = 25

const getSearchQuery = (text: string, state: string): string =>
  `repo:facebook/react is:issue in:title in:body state:${state} ${text}`

const MainPage: React.FC = () => {
  const stateRef = useRef('open')
  const textRef = useRef('')
  const [displayIssues, setDisplayIssues] = useState<Issue[]>([])

  const onCompleted = (data: SearchQueryResult): void => {
    const issues = data?.search?.nodes || []
    setDisplayIssues([...displayIssues, ...issues])
  }

  // BFF preloaded search query (used to fetch last known issues).
  const { data: preloadedData } = useQuery<SearchQueryResult>(SEARCH_QUERY, {
    variables: {
      query: getSearchQuery('', 'open'),
      limit,
    },
    onCompleted,
  })

  // Lazy search query.
  const [getIssues, { data: loadedData, loading, called }] = useLazyQuery(SEARCH_QUERY, {
    fetchPolicy: 'cache-and-network',
    onCompleted,
  })

  // Use initial or search lazy loaded data.
  const data = called ? loadedData : preloadedData

  // Pagination.
  const { hasNextPage = false, endCursor } = data?.search?.pageInfo || {}

  // `onSearchChange` triggers always when `state` or `text` of search bar changes.
  const onSearchChange = (text: string, state: IssueState): void => {
    // Start new search round.
    setDisplayIssues([])

    // Escape characters.
    // https://docs.github.com/en/free-pro-team@latest/github/searching-for-information-on-github/searching-code#considerations-for-code-search
    // . , : ; / \ ` ' " = * ! ? # $ & + ^ | ~ < > ( ) { } [ ]
    const escapedText = text.replace(/[.,:;/\\`'"=*!?#$&+^|~<>(){}[\]]/g, ' ') // keep 日本語 safe instead of lazy latin limitation ;)
    getIssues({ variables: { query: getSearchQuery(escapedText, state), limit, after: endCursor } })

    // Keep text and state for further usage in pagination (fetch more button).
    textRef.current = escapedText
    stateRef.current = state
  }

  const onFetchMoreClick = (): void => {
    getIssues({
      variables: {
        query: getSearchQuery(textRef.current, stateRef.current),
        limit,
        after: endCursor,
      },
    })
  }

  return (
    <Container text className={styles.page}>
      <Header as="h1">React issue tracker</Header>
      <p>Type your issue and choose between open / closed states.</p>
      <SearchBar onSearch={onSearchChange} loading={loading} />
      <IssueList className={styles['issue-list']} issues={displayIssues} />
      {hasNextPage && (
        <Button primary loading={loading} onClick={onFetchMoreClick}>
          Fetch more
        </Button>
      )}
    </Container>
  )
}

export default withApollo()(MainPage)
