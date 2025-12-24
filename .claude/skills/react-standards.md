# React Standards

> Reference this file when working with React projects.

---

## Component Structure

Organize components in this order:

```tsx
// 1. Imports (external, then internal, then relative)
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from './utils';
import type { User } from './types';

// 2. Types/Interfaces
interface UserCardProps {
    user: User;
    onSelect: (user: User) => void;
    isHighlighted?: boolean;
}

// 3. Component definition
export function UserCard({ user, onSelect, isHighlighted = false }: UserCardProps) {
    // 4. Hooks (all hooks at the top, before any logic)
    const [isExpanded, setIsExpanded] = useState(false);
    const theme = useTheme();

    // 5. Derived state / computed values
    const fullName = `${user.firstName} ${user.lastName}`;
    const isActive = user.status === 'active';

    // 6. Event handlers
    function handleClick(): void {
        onSelect(user);
    }

    function handleToggle(): void {
        setIsExpanded(prev => !prev);
    }

    // 7. Effects (after handlers)
    useEffect(() => {
        console.log('User changed:', user.id);
    }, [user.id]);

    // 8. Early returns (loading, error, empty states)
    if (!user) {
        return null;
    }

    // 9. Render
    return (
        <div onClick={handleClick}>
            {fullName}
        </div>
    );
}
```

---

## Hooks Rules

### Always Call Hooks at Top Level

```tsx
// ✅ GOOD: Hooks at top level, unconditionally
function UserProfile({ userId }: { userId: string }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const theme = useTheme();

    // ... rest of component
}

// ❌ BAD: Conditional hooks
function UserProfile({ userId }: { userId: string | null }) {
    if (!userId) {
        return <div>No user</div>;
    }

    // This breaks the rules of hooks!
    const [user, setUser] = useState<User | null>(null);
}

// ✅ GOOD: Handle condition after hooks
function UserProfile({ userId }: { userId: string | null }) {
    const [user, setUser] = useState<User | null>(null);

    if (!userId) {
        return <div>No user</div>;
    }

    // ... rest of component
}
```

### No Hooks in Loops or Conditions

```tsx
// ❌ BAD: Hook inside condition
function Component({ shouldFetch }: { shouldFetch: boolean }) {
    if (shouldFetch) {
        const data = useFetch('/api/data'); // Never do this
    }
}

// ✅ GOOD: Condition inside hook or after
function Component({ shouldFetch }: { shouldFetch: boolean }) {
    const data = useFetch(shouldFetch ? '/api/data' : null);
    // or
    const data = useFetch('/api/data', { enabled: shouldFetch });
}
```

---

## Event Handler Typing

```tsx
// ✅ GOOD: Properly typed event handlers
function Form() {
    function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        // ...
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
        console.log(event.target.value);
    }

    function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
        // ...
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
        if (event.key === 'Enter') {
            // ...
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <input onChange={handleChange} onKeyDown={handleKeyDown} />
            <button onClick={handleClick}>Submit</button>
        </form>
    );
}
```

### Common Event Types

| Event | Type |
|-------|------|
| Form submit | `React.FormEvent<HTMLFormElement>` |
| Input change | `React.ChangeEvent<HTMLInputElement>` |
| Button click | `React.MouseEvent<HTMLButtonElement>` |
| Key press | `React.KeyboardEvent<HTMLInputElement>` |
| Focus/Blur | `React.FocusEvent<HTMLInputElement>` |
| Drag events | `React.DragEvent<HTMLDivElement>` |

---

## Conditional Rendering

### Beware of Falsy Values

```tsx
// ❌ BAD: Renders "0" when count is 0
function ItemCount({ count }: { count: number }) {
    return <div>{count && <span>{count} items</span>}</div>;
}

// ✅ GOOD: Explicit boolean check
function ItemCount({ count }: { count: number }) {
    return <div>{count > 0 && <span>{count} items</span>}</div>;
}

// ✅ GOOD: Ternary for clarity
function ItemCount({ count }: { count: number }) {
    return <div>{count > 0 ? <span>{count} items</span> : null}</div>;
}
```

### Empty String Pitfall

```tsx
// ❌ BAD: Renders empty string ""
function Greeting({ name }: { name: string }) {
    return <div>{name && <span>Hello, {name}</span>}</div>;
}

// ✅ GOOD: Explicit check
function Greeting({ name }: { name: string }) {
    return <div>{name.length > 0 && <span>Hello, {name}</span>}</div>;
}
```

### Prefer Early Returns

```tsx
// ✅ GOOD: Early returns for special states
function UserCard({ user, isLoading, error }: Props) {
    if (isLoading) {
        return <Skeleton />;
    }

    if (error) {
        return <ErrorMessage error={error} />;
    }

    if (!user) {
        return null;
    }

    return (
        <div>
            <h2>{user.name}</h2>
            {/* Complex render logic here */}
        </div>
    );
}
```

---

## Props

### Destructuring

```tsx
// ✅ GOOD: Destructure in parameters for simple props
function Button({ label, onClick, disabled = false }: ButtonProps) {
    return (
        <button onClick={onClick} disabled={disabled}>
            {label}
        </button>
    );
}

// ✅ GOOD: Destructure in body for complex logic
function UserForm(props: UserFormProps) {
    const { user, onSubmit, onCancel, initialValues, validationRules } = props;

    // Use individual props in complex logic
    const mergedValues = { ...initialValues, ...user };
    // ...
}
```

### Default Props

```tsx
// ✅ GOOD: Default values in destructuring
interface ButtonProps {
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
}

function Button({
    variant = 'primary',
    size = 'md',
    disabled = false,
}: ButtonProps) {
    // ...
}
```

### Props Spreading (Use Sparingly)

```tsx
// ✅ GOOD: Spread remaining props to underlying element
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
}

function Button({ variant = 'primary', ...props }: ButtonProps) {
    return <button className={`btn-${variant}`} {...props} />;
}

// ❌ BAD: Blindly spreading unknown props
function Button(props: any) {
    return <button {...props} />;
}
```

---

## Keys

### Always Use Stable, Unique Keys

```tsx
// ✅ GOOD: Unique ID as key
{users.map(user => (
    <UserCard key={user.id} user={user} />
))}

// ✅ GOOD: Composite key when needed
{items.map(item => (
    <Row key={`${item.category}-${item.id}`} item={item} />
))}

// ❌ BAD: Index as key (causes issues with reordering)
{users.map((user, index) => (
    <UserCard key={index} user={user} />
))}

// ❌ BAD: Random key (causes unnecessary re-renders)
{users.map(user => (
    <UserCard key={Math.random()} user={user} />
))}
```

### When Index Keys Are Acceptable

- List is static (never reordered or filtered)
- Items have no stable IDs
- List is never reordered

---

## State Management

### Lift State Only When Necessary

```tsx
// ✅ GOOD: Local state when only one component needs it
function SearchInput() {
    const [query, setQuery] = useState('');
    return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// ✅ GOOD: Lifted state when siblings need to share
function SearchPage() {
    const [query, setQuery] = useState('');

    return (
        <>
            <SearchInput value={query} onChange={setQuery} />
            <SearchResults query={query} />
        </>
    );
}
```

### Derive State Instead of Syncing

```tsx
// ❌ BAD: Syncing state with useEffect
function FilteredList({ items, filter }: Props) {
    const [filteredItems, setFilteredItems] = useState(items);

    useEffect(() => {
        setFilteredItems(items.filter(item => item.type === filter));
    }, [items, filter]);

    return <List items={filteredItems} />;
}

// ✅ GOOD: Derive during render
function FilteredList({ items, filter }: Props) {
    const filteredItems = items.filter(item => item.type === filter);
    return <List items={filteredItems} />;
}

// ✅ GOOD: Memoize if expensive
function FilteredList({ items, filter }: Props) {
    const filteredItems = useMemo(
        () => items.filter(item => item.type === filter),
        [items, filter]
    );
    return <List items={filteredItems} />;
}
```

---

## Performance

### Avoid Creating Objects/Functions in Render

```tsx
// ❌ BAD: New object every render
<Component style={{ marginTop: 10 }} />

// ✅ GOOD: Stable reference
const styles = { marginTop: 10 };
<Component style={styles} />

// ❌ BAD: New function every render (if child uses React.memo)
<Button onClick={() => handleClick(id)} />

// ✅ GOOD: useCallback for stable reference
const handleButtonClick = useCallback(() => {
    handleClick(id);
}, [id]);
<Button onClick={handleButtonClick} />
```

### Use `React.memo` Sparingly

```tsx
// ✅ GOOD: Memo for expensive renders with stable props
const ExpensiveChart = React.memo(function ExpensiveChart({ data }: Props) {
    // Complex rendering logic
    return <svg>...</svg>;
});

// ❌ BAD: Memo on everything (adds overhead)
const SimpleLabel = React.memo(function SimpleLabel({ text }: Props) {
    return <span>{text}</span>;
});
```

---

## Component Composition

### Prefer Composition Over Props

```tsx
// ❌ BAD: Too many conditional props
<Card
    title="User"
    showAvatar={true}
    avatarSrc={user.avatar}
    showBadge={user.isPremium}
    badgeText="Premium"
    footer={<Button>Edit</Button>}
/>

// ✅ GOOD: Composition with children/slots
<Card>
    <Card.Header>
        <Avatar src={user.avatar} />
        <h2>User</h2>
        {user.isPremium && <Badge>Premium</Badge>}
    </Card.Header>
    <Card.Body>
        {/* content */}
    </Card.Body>
    <Card.Footer>
        <Button>Edit</Button>
    </Card.Footer>
</Card>
```

### Use Children for Flexibility

```tsx
// ✅ GOOD: Flexible container component
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

// Usage
<Modal isOpen={isOpen} onClose={close}>
    <h2>Title</h2>
    <p>Any content here</p>
    <Button onClick={close}>Close</Button>
</Modal>
```
