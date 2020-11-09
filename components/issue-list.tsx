import Link from 'next/link'
import { List } from 'semantic-ui-react'
import { IssueState } from '../lib/common-types'

export type IssueListItemProps = {
  number: string
  state: IssueState
  title: string
}

export type IssueListProps = {
  className?: string
  issues: IssueListItemProps[]
}

const Issue: React.FC<IssueListItemProps> = (props) => {
  const { number, state, title } = props
  return (
    <Link href={`/issue/${number}`}>
      <List.Item as="a">
        <List.Content>
          <List.Header as="h6">
            {number} : {state}
          </List.Header>
          {title}
        </List.Content>
      </List.Item>
    </Link>
  )
}

export const IssueList: React.FC<IssueListProps> = (props) => (
  <div className={props.className}>
    <List divided relaxed>
      {props.issues.map((issueProps) => (
        <Issue key={issueProps.number} {...issueProps} />
      ))}
    </List>
  </div>
)
