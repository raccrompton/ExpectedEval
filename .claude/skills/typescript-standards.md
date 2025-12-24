# TypeScript & JavaScript Coding Standards

> Reference this file when working with TypeScript or JavaScript projects.

---

## Type Safety

### Required Practices

```typescript
// ✅ GOOD: Explicit types on function parameters and return values
function calculateTotal(items: CartItem[], taxRate: number): number {
    return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}

// ❌ BAD: Implicit any, no return type
function calculateTotal(items, taxRate) {
    return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}
```

### Avoid `any`

```typescript
// ✅ GOOD: Use unknown and narrow with type guards
function processData(data: unknown): string {
    if (typeof data === 'string') {
        return data.toUpperCase();
    }
    if (typeof data === 'object' && data !== null && 'message' in data) {
        return String((data as { message: unknown }).message);
    }
    return String(data);
}

// ❌ BAD: Using any
function processData(data: any): string {
    return data.message || data;
}
```

### No Type Assertions

```typescript
// ✅ GOOD: Use type guards
function isUser(obj: unknown): obj is User {
    return typeof obj === 'object'
        && obj !== null
        && 'id' in obj
        && 'name' in obj;
}

if (isUser(data)) {
    console.log(data.name); // TypeScript knows this is User
}

// ❌ BAD: Type assertion
const user = data as User;
console.log(user.name);
```

---

## Interface vs Type

```typescript
// Use interface for object shapes (extendable)
interface User {
    id: string;
    name: string;
    email: string;
}

interface AdminUser extends User {
    permissions: string[];
}

// Use type for unions, intersections, and primitives
type Status = 'pending' | 'active' | 'inactive';
type ID = string | number;
type UserWithStatus = User & { status: Status };
```

---

## Null & Undefined Handling

```typescript
// ✅ GOOD: Handle null/undefined explicitly
function getUserName(user: User | null): string {
    if (!user) {
        return 'Anonymous';
    }
    return user.name;
}

// ✅ GOOD: Optional chaining with nullish coalescing
const userName = user?.name ?? 'Anonymous';

// ❌ BAD: Non-null assertion
const userName = user!.name;
```

---

## Functions

### Single Responsibility

```typescript
// ✅ GOOD: Each function does one thing
function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sendWelcomeEmail(user: User): Promise<void> {
    // Only handles sending
}

// ❌ BAD: Function does too much
function processUser(email: string) {
    // Validates, creates user, sends email, logs analytics...
}
```

### Guard Clauses

```typescript
// ✅ GOOD: Return early for edge cases
function processOrder(order: Order | null): OrderResult {
    if (!order) {
        return { success: false, error: 'No order provided' };
    }

    if (order.items.length === 0) {
        return { success: false, error: 'Order has no items' };
    }

    if (!order.paymentMethod) {
        return { success: false, error: 'No payment method' };
    }

    // Main logic here - not deeply nested
    return processValidOrder(order);
}

// ❌ BAD: Deeply nested
function processOrder(order: Order | null): OrderResult {
    if (order) {
        if (order.items.length > 0) {
            if (order.paymentMethod) {
                // Main logic buried in nesting
            }
        }
    }
}
```

---

## Async/Await

```typescript
// ✅ GOOD: Proper error handling
async function fetchUser(id: string): Promise<User> {
    try {
        const response = await fetch(`/api/users/${id}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw error; // Re-throw for caller to handle
    }
}

// ✅ GOOD: Parallel requests when independent
async function loadDashboard(userId: string): Promise<Dashboard> {
    const [user, settings, notifications] = await Promise.all([
        fetchUser(userId),
        fetchSettings(userId),
        fetchNotifications(userId),
    ]);

    return { user, settings, notifications };
}
```

---

## Error Handling

```typescript
// ✅ GOOD: Custom error classes
class ValidationError extends Error {
    constructor(
        message: string,
        public field: string,
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

// ✅ GOOD: Specific catch handling
try {
    await saveUser(user);
} catch (error) {
    if (error instanceof ValidationError) {
        showFieldError(error.field, error.message);
    } else if (error instanceof NetworkError) {
        showToast('Network error. Please try again.');
    } else {
        console.error('Unexpected error:', error);
        showToast('Something went wrong.');
    }
}
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `isActive` |
| Functions | camelCase | `getUserById`, `validateInput` |
| Classes | PascalCase | `UserService`, `ApiClient` |
| Interfaces | PascalCase | `UserProfile`, `ApiResponse` |
| Types | PascalCase | `Status`, `HttpMethod` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Enums | PascalCase (members too) | `Status.Active`, `HttpMethod.Get` |

### Boolean Variables & Functions

Use `is`, `has`, `can`, `should`, `will` prefixes:

```typescript
// ✅ GOOD: Clear boolean intent
const isActive = user.status === 'active';
const hasPermission = user.roles.includes('admin');
const canEdit = isOwner || hasPermission;
const shouldRefresh = lastUpdate < threshold;

function isValidEmail(email: string): boolean { }
function hasAccess(user: User, resource: Resource): boolean { }

// ❌ BAD: Unclear if boolean
const active = user.status === 'active';
const permission = user.roles.includes('admin');
function validEmail(email: string): boolean { }
```

### Function Names

Use verb prefixes that describe the action:

```typescript
// ✅ GOOD: Clear action verbs
function fetchUser(id: string): Promise<User> { }      // GET from external source
function getUser(id: string): User { }                  // Retrieve from local/cache
function createOrder(data: OrderInput): Order { }       // Create new entity
function updateProfile(id: string, data: Partial<Profile>): Profile { }
function deleteComment(id: string): void { }
function validateInput(data: unknown): boolean { }      // Check/verify
function parseResponse(raw: string): Response { }       // Transform format
function formatDate(date: Date): string { }             // Convert to display format
function calculateTotal(items: Item[]): number { }      // Compute value

// ❌ BAD: Vague or noun-like names
function user(id: string): User { }
function data(input: string): Response { }
function total(items: Item[]): number { }
```

### Event Handlers

Use `handle` prefix for handler definitions, `on` prefix for props:

```typescript
// ✅ GOOD: Handler definitions use "handle"
function handleClick(event: React.MouseEvent): void { }
function handleSubmit(data: FormData): void { }
function handleUserSelect(user: User): void { }

// ✅ GOOD: Props use "on" prefix
interface ButtonProps {
    onClick: (event: React.MouseEvent) => void;
    onSubmit: (data: FormData) => void;
    onUserSelect: (user: User) => void;
}

// ❌ BAD: Inconsistent or unclear
function clickHandler(event: React.MouseEvent): void { }
function submit(data: FormData): void { }
```

---

## Imports

```typescript
// ✅ GOOD: Organized imports
// 1. External libraries
import { useState, useEffect } from 'react';
import { z } from 'zod';

// 2. Internal modules (absolute paths)
import { UserService } from '@/services/user';
import { Button } from '@/components/ui/button';

// 3. Relative imports
import { formatDate } from './utils';
import type { User } from './types';

// ✅ GOOD: Type-only imports
import type { User, Order } from '@/types';
```

---

## Constants

```typescript
// ✅ GOOD: Named constants with meaning
const MAX_LOGIN_ATTEMPTS = 5;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const VALID_STATUS_VALUES = ['pending', 'active', 'completed'] as const;

// ❌ BAD: Magic numbers
if (attempts > 5) { }
setTimeout(callback, 1800000);
```

---

## Arrays & Objects

```typescript
// ✅ GOOD: Immutable updates
const updatedItems = [...items, newItem];
const updatedUser = { ...user, name: newName };
const filteredItems = items.filter(item => item.active);

// ✅ GOOD: Object shorthand
const user = { name, email, age };

// ✅ GOOD: Destructuring
const { id, name, email } = user;
const [first, second, ...rest] = items;
```

---

## Comments

See `.claude/skills/comment-standards.md` for comment guidelines.
