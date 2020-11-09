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

const limit = 25

type Issue = IssueListItemProps & {
  id: string
}

const MainPage: React.FC = () => {
  const stateRef = useRef('open')
  const textRef = useRef('')
  const [displayIssues, setDisplayIssues] = useState<Issue[]>([])
  const { data: preloadedData } = useQuery(SEARCH_QUERY, {
    variables: {
      query: `repo:facebook/react is:issue in:title in:body state:open`,
      limit,
    },
    onCompleted: (data) => {
      const issues: Issue[] = data?.search?.nodes || []
      setDisplayIssues([...displayIssues, ...issues])
    },
  })
  const [getIssues, { data: loadedData, loading, called }] = useLazyQuery(SEARCH_QUERY, {
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      const issues: Issue[] = data?.search?.nodes || []
      setDisplayIssues([...displayIssues, ...issues])
    },
  })

  const data = called ? loadedData : preloadedData
  const { hasNextPage = false, endCursor } = data?.search?.pageInfo || {}

  const onSearchChange = (text: string, state: IssueState): void => {
    // Start search from scratch.
    setDisplayIssues([])

    // Escape characters.
    // https://docs.github.com/en/free-pro-team@latest/github/searching-for-information-on-github/searching-code#considerations-for-code-search
    // . , : ; / \ ` ' " = * ! ? # $ & + ^ | ~ < > ( ) { } [ ]
    const escapedText = text.replace(/[.,:;/\\`'"=*!?#$&+^|~<>(){}[\]]/g, ' ') // keep 日本語 safe instead of lazy latin limitation ;)
    const query = `repo:facebook/react is:issue in:title in:body state:${state} ${escapedText}`
    getIssues({ variables: { query, limit, after: endCursor } })

    // Keep text and state for further usage.
    textRef.current = escapedText
    stateRef.current = state
  }

  const onFetchMoreClick = (): void => {
    if (hasNextPage) {
      const query = `repo:facebook/react is:issue in:title in:body state:${stateRef.current} ${textRef.current}`
      getIssues({ variables: { query, limit, after: endCursor } })
    }
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
