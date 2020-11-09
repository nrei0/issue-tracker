import { useRef, useState } from 'react'
import { gql, useLazyQuery, useQuery } from '@apollo/client'
import Link from 'next/link'
import { SearchBar, IssueState } from '../components/search-bar'
import { withApollo } from '../lib/apollo'
import { Button } from 'semantic-ui-react'

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

type Issue = {
  id: string
  number: string
  title: string
  state: string
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
    <div>
      <SearchBar onSearch={onSearchChange} loading={loading} />
      {displayIssues.map(({ number, state, title }) => (
        <Link key={number} href={`/issue/${number}`}>
          <p>
            {number} : {state} : {title}
          </p>
        </Link>
      ))}
      {hasNextPage && (
        <Button loading={loading} onClick={onFetchMoreClick}>
          Fetch more
        </Button>
      )}
    </div>
  )
}

export default withApollo()(MainPage)
