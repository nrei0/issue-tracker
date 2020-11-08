import { useRef } from 'react'
import { gql, useLazyQuery, useQuery } from '@apollo/client'
import Link from 'next/link'
import { SearchBar, IssueState } from '../components/search-bar'
import { withApollo } from '../lib/apollo'

const SEARCH_QUERY = gql`
  query($query: String!) {
    search(type: ISSUE, query: $query, last: 25) {
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

type Issue = {
  number: string
  title: string
  state: string
}

const MainPage: React.FC = () => {
  const issuesLazyFetched = useRef(false)
  const { data: preloadedData } = useQuery(SEARCH_QUERY, {
    variables: { query: `repo:facebook/react is:issue in:title in:body state:open` },
  })
  const [getIssues, { data: loadedData, loading }] = useLazyQuery(SEARCH_QUERY, {
    fetchPolicy: 'cache-and-network',
  })

  const data = (!issuesLazyFetched.current && preloadedData) || loadedData
  const issues: Issue[] = data?.search?.nodes || []

  const onSearchChange = (text: string, state: IssueState): void => {
    const query = `repo:facebook/react is:issue in:title in:body state:${state} ${text}`
    getIssues({ variables: { query } })

    // Do not use preloaded content anymore.
    issuesLazyFetched.current = true
  }

  return (
    <div>
      <SearchBar onSearch={onSearchChange} loading={loading} />
      {issues.map(({ number, state, title }) => (
        <Link key={number} href={`/issue/${number}`}>
          <p>
            {number} : {state} : {title}
          </p>
        </Link>
      ))}
    </div>
  )
}

export default withApollo()(MainPage)
