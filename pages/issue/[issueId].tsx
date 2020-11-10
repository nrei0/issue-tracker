import { gql, useQuery } from '@apollo/client'
import { useRouter } from 'next/router'
import { Container, Header } from 'semantic-ui-react'
import { withApollo } from '../../lib/apollo'
import styles from './[issueId].module.scss'

const ISSUE_QUERY = gql`
  query($number: Int!) {
    repository(name: "react", owner: "facebook") {
      id
      issue(number: $number) {
        id
        title
        body
        number
        author {
          login
        }
        comments(first: 10) {
          nodes {
            id
            author {
              login
            }
            body
          }
        }
      }
    }
  }
`

type Comment = {
  author: {
    login: string
  }
  body: string
  id: string
}

type IssueDetails = {
  id: string
  title: string
  body: string
  number: string
  author: {
    login: string
  }
  comments: {
    nodes: Comment[]
  }
}

type IssueQueryResult = {
  repository?: {
    id: string
    issue: IssueDetails
  }
}

const IssuePage: React.FC = () => {
  const {
    query: { issueId },
  } = useRouter()
  const number = issueId && +issueId
  const { data, loading } = useQuery<IssueQueryResult>(ISSUE_QUERY, { variables: { number } })

  if (loading) return null

  // tdb @nrei unsafe. No error handling in a case if issue was not found.
  const { author: { login = '' } = {}, body, title, comments: commentsData } =
    data?.repository?.issue || {}
  const comments: Comment[] = commentsData?.nodes || []

  return (
    <Container text className={styles.page}>
      <Header as="h1">{title}</Header>
      <Header as="h3">{login}</Header>
      <p>{body}</p>
      <div>
        {comments.map(({ author: { login }, body, id }) => (
          <div key={id}>
            <br />
            <p>
              <Header as="h3">{login}</Header>
              {body}
            </p>
          </div>
        ))}
      </div>
    </Container>
  )
}

export default withApollo()(IssuePage)
