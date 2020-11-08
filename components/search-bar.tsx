import { useCallback, useEffect, useState, useRef } from 'react'
import debounce from 'lodash.debounce'
import { Form } from 'semantic-ui-react'

export type IssueState = 'closed' | 'open'

type DropdownItemOptions = {
  key: string
  text: string
  value: IssueState
}

type SearchBarProps = {
  // `loading` determines API loading state.
  loading?: boolean
  // `onSearch` triggers on form submit.
  onSearch?: (searchText: string, issueState: IssueState) => void
}

const _ = () => void 0

// Issue state dropdown options.
const openedState: DropdownItemOptions = { key: 'open', text: 'open', value: 'open' }
const closedState: DropdownItemOptions = { key: 'closed', text: 'closed', value: 'closed' }
const options: DropdownItemOptions[] = [openedState, closedState]

export const SearchBar: React.FC<SearchBarProps> = (props) => {
  const { onSearch = _, loading = false } = props
  const [searchText, setSearchText] = useState('')
  const [issueState, setIssueState] = useState(openedState.value)
  const didMount = useRef(false)

  // Keep reference to static debounced search handler.
  const { current: onDebounceSearch } = useRef(debounce(onSearch, 350))

  // `submitForm` is debounced search handler based on last `searchText` & `issueState` form's data.
  const submitForm = useCallback(
    () => onDebounceSearch(searchText, issueState),
    // Only `searchText` and `issueState` are dynamic variables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchText, issueState]
  )

  // Automatically submit the form after first rendering whatever any change in form's data happens.
  useEffect(
    () => {
      if (didMount.current) {
        submitForm()
      } else {
        didMount.current = true
      }
    },
    // Only `searchText` and `issueState` are dynamic variables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchText, issueState]
  )

  return (
    <Form onSubmit={submitForm}>
      <Form.Group>
        <Form.Input
          loading={loading}
          width={3}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search..."
        />
        <Form.Select
          width={1}
          value={issueState}
          onChange={(_, { value }) =>
            setIssueState(value as IssueState /* IssueState === string */)
          }
          placeholder="State"
          options={options}
        />
      </Form.Group>
    </Form>
  )
}
