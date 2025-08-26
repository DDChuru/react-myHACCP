# Angular to React: Auth & State Management Guide

## Overview
This guide explains how we implemented Angular/RxJS patterns in React for authentication and user profile management.

## Key Concepts Comparison

### 1. Services (Angular) → Service Classes + Hooks (React)

**Angular:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User>(null);
  user$ = this.userSubject.asObservable();
}
```

**React Equivalent:**
```typescript
// services/AuthService.ts - Singleton service pattern
class AuthService {
  private currentUserProfile: UserProfileModel | null = null;
  private userProfileListeners: Set<(profile) => void> = new Set();
  
  // Like BehaviorSubject.next()
  private notifyListeners(profile: UserProfileModel | null) {
    this.userProfileListeners.forEach(listener => listener(profile));
  }
}

export default new AuthService(); // Singleton like Angular's providedIn: 'root'
```

### 2. Dependency Injection (Angular) → Context + Hooks (React)

**Angular:**
```typescript
constructor(private authService: AuthService) {}
```

**React Equivalent:**
```typescript
// Using Context Provider (like Angular's providers)
<AuthProfileProvider>
  <App />
</AuthProfileProvider>

// Using in component (like injecting service)
const { userProfile, hasRole } = useAuthProfile();
```

### 3. Observables (RxJS) → State + Effects (React)

**Angular:**
```typescript
this.authService.user$.pipe(
  switchMap(user => this.fetchProfile(user.uid))
).subscribe(profile => {
  this.profile = profile;
});
```

**React Equivalent:**
```typescript
useEffect(() => {
  if (authUser) {
    AuthService.fetchUserProfile(authUser.uid)
      .then(profile => setUserProfile(profile));
  }
}, [authUser]);
```

### 4. Signals (Angular) → State + Context (React)

**Angular Signals:**
```typescript
userSignal = signal<User>(null);
// Access anywhere
this.authService.userSignal();
```

**React Equivalent:**
```typescript
// Global state via Context
const { userProfile } = useAuthProfile();
// Available throughout component tree
```

## Implementation Architecture

### File Structure
```
services/
  AuthService.ts         # Singleton service (like Angular service)
hooks/
  useAuthProfile.tsx     # Hook + Context (like Angular module + DI)
types/
  userProfile.ts        # Models (same as Angular)
  roles.ts              # Interfaces (same as Angular)
```

### Auth Flow

1. **Login Process:**
```typescript
// React way
const { login } = useAuthProfile();
const profile = await login(email, password);

// What happens:
// 1. Firebase Auth sign in
// 2. Fetch UserProfile from Firestore
// 3. Store in AuthService (like BehaviorSubject)
// 4. Notify all listeners (like Observable.next)
// 5. Update React Context (available everywhere)
```

2. **Profile Access:**
```typescript
// Anywhere in your app
const { userProfile, hasRole, isAdmin } = useAuthProfile();

// Check roles
if (hasRole('siteAdmin')) { /* ... */ }

// Get user sites
const sites = getUserSites(); // Returns allocated sites or [] for admin
```

3. **Role-Based Access:**
```typescript
// In components
if (isAdmin()) {
  // Show all sites
} else if (userProfile?.allocatedSiteIds?.length > 0) {
  // Show only allocated sites
}
```

## Key Patterns

### 1. Singleton Service Pattern
```typescript
// AuthService.ts
class AuthService {
  private static instance: AuthService;
  
  // Methods like Angular service
  async login() {}
  async fetchUserProfile() {}
}

export default new AuthService(); // Single instance
```

### 2. Observer Pattern (like RxJS)
```typescript
// Subscribe to changes
const unsubscribe = AuthService.subscribeToProfile((profile) => {
  console.log('Profile updated:', profile);
});

// Cleanup
unsubscribe();
```

### 3. Provider Pattern (like Angular Module)
```typescript
// _layout.tsx
<AuthProfileProvider>
  <NavigationStack />
</AuthProfileProvider>
```

### 4. Guard Pattern (like Angular Guards)
```typescript
// HOC for protected routes
export const AdminOnlyComponent = withAuth(Component, 'admin');

// Or inline check
if (!hasRole('admin')) {
  return <AccessDenied />;
}
```

## Usage Examples

### 1. In Self-Inspection Module
```typescript
const { userProfile, isAdmin, getUserSites } = useAuthProfile();

// Fetch sites based on role
if (isAdmin()) {
  // Fetch all sites
  query = collection(db, `companies/${userProfile.companyId}/sites`);
} else {
  // Fetch only allocated sites
  query = where('id', 'in', userProfile.allocatedSiteIds);
}
```

### 2. Display User Info
```typescript
const { userProfile } = useAuthProfile();

<Text>Welcome, {userProfile?.fullName}</Text>
<Text>Company: {userProfile?.companyId}</Text>
```

### 3. Check Permissions
```typescript
const { hasRole, hasSiteAccess } = useAuthProfile();

// Check multiple roles
const canApprove = hasRole('documentApprover') || hasRole('admin');

// Check site access
if (!hasSiteAccess(siteId)) {
  return <Text>No access to this site</Text>;
}
```

## Benefits of This Approach

1. **Familiar to Angular Developers:**
   - Service classes for business logic
   - Singleton pattern for shared state
   - Role-based access control
   - Type safety with TypeScript

2. **React Best Practices:**
   - Uses Context for global state
   - Hooks for component logic
   - Proper cleanup in useEffect
   - Memoization for performance

3. **Scalable:**
   - Easy to add new roles
   - Simple to extend UserProfile
   - Can add more services
   - Works offline

## Migration Tips

1. **From BehaviorSubject to State:**
   - BehaviorSubject → useState + Context
   - subject.next() → setState()
   - subject.subscribe() → useEffect()

2. **From Observables to Promises:**
   - Observable chains → async/await
   - switchMap → await in sequence
   - combineLatest → Promise.all()

3. **From Services to Hooks:**
   - Injectable service → Service class + Hook
   - Constructor injection → useContext
   - ngOnInit → useEffect(() => {}, [])
   - ngOnDestroy → useEffect cleanup

## Testing Approach

```typescript
// Mock the service
jest.mock('../services/AuthService');

// Mock the hook
jest.mock('../hooks/useAuthProfile', () => ({
  useAuthProfile: () => ({
    userProfile: mockProfile,
    hasRole: jest.fn(),
    isAdmin: jest.fn(() => true),
  })
}));
```

## Summary

This implementation brings Angular's service-oriented architecture to React while maintaining React's component-based philosophy. You get:

- Type-safe user profiles
- Role-based access control
- Centralized auth state
- Familiar service patterns
- React performance benefits

The key is using Context + Hooks to replicate Angular's DI system while keeping business logic in service classes.