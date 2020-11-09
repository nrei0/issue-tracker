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
          avatarUrl
          login
        }
        comments(first: 10) {
          totalCount
          nodes {
            id
            author {
              avatarUrl
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

const IssuePage: React.FC = () => {
  const {
    query: { issueId },
  } = useRouter()
  const number = issueId && +issueId
  const { data, loading } = useQuery(ISSUE_QUERY, { variables: { number } })

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
            <h3>{login}</h3>
            <p>{body} </p>
          </div>
        ))}
      </div>
    </Container>
  )
}

export default withApollo()(IssuePage)
