# White Card Contrast Issue - Quick Fix Guide

## Problem Summary
Critical UI issue where cards and text appear as white-on-white (unreadable) in React Native Paper (Material Design 3) applications, making content completely invisible to users.

## Quick Diagnosis
If you see white/unreadable cards, check these in order:
1. **Card/Surface backgrounds** - Missing `backgroundColor: theme.colors.surface`
2. **Text colors** - Missing `color: theme.colors.onSurface` or `onSurfaceVariant`
3. **Opacity styling** - Using opacity instead of proper theme colors
4. **Hardcoded colors** - `#fff` or `white` in StyleSheets

## The Solution Pattern

### 1. Always Explicitly Set Card Background Colors

```tsx
// ❌ WRONG - Relies on defaults that may be white
<Card style={styles.card}>
  <Card.Content>
    <Text>Invisible text</Text>
  </Card.Content>
</Card>

// ✅ CORRECT - Explicit theme color
<Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
  <Card.Content>
    <Text style={{ color: theme.colors.onSurface }}>Visible text</Text>
  </Card.Content>
</Card>
```

### 2. Always Set Text Colors Using Theme

```tsx
// ❌ WRONG - No color specified (defaults to white sometimes)
<Text variant="titleMedium">Select Area</Text>

// ❌ WRONG - Using opacity for color variation (still white)
<Text style={{ opacity: 0.7 }}>Description</Text>

// ✅ CORRECT - Explicit theme colors
<Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
  Select Area
</Text>
<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
  Description
</Text>
```

### 3. Remove Hardcoded Colors from StyleSheets

```tsx
// ❌ WRONG - Hardcoded white background
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    color: 'white',
  }
});

// ✅ CORRECT - No hardcoded colors in styles
const styles = StyleSheet.create({
  header: {
    padding: 20,
    // No backgroundColor here
  },
  text: {
    // No color here
  }
});

// Apply theme colors in component
<Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
  <Text style={[styles.text, { color: theme.colors.onSurface }]}>
    Properly themed text
  </Text>
</Surface>
```

### 4. High-Contrast Elements (Severity Badges, Status Indicators)

```tsx
// ✅ Use bold colors with white text for critical information
<Chip 
  style={{ 
    backgroundColor: severity === 'Critical' ? '#dc2626' : '#f59e0b'
  }}
  textStyle={{ 
    color: '#ffffff',  // White text on colored background
    fontWeight: 'bold'
  }}
>
  {severity}
</Chip>
```

## Complete Fix Example

### Before (Broken - White on White)
```tsx
const IssueCard = () => (
  <Card style={styles.issueCard}>
    <Card.Content>
      <Text variant="titleMedium">Issue Title</Text>
      <Text style={{ opacity: 0.7 }}>Area: Kitchen</Text>
      <Text>Severity: High</Text>
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  issueCard: {
    marginBottom: 10,
    backgroundColor: '#fff',
  }
});
```

### After (Fixed - Proper Contrast)
```tsx
const IssueCard = () => {
  const theme = useTheme();
  
  return (
    <Card style={[styles.issueCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text 
          variant="titleMedium" 
          style={{ color: theme.colors.onSurface }}
        >
          Issue Title
        </Text>
        <Text 
          variant="bodySmall" 
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Area: Kitchen
        </Text>
        <Text style={{ color: theme.colors.onSurface }}>
          Severity: High
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  issueCard: {
    marginBottom: 10,
    // No hardcoded backgroundColor
  }
});
```

## React Native Paper Theme Colors Quick Reference

| Color Property | Use Case | Example |
|---|---|---|
| `theme.colors.surface` | Card/Surface backgrounds | Card, Surface, Modal backgrounds |
| `theme.colors.onSurface` | Primary text on surfaces | Titles, main content |
| `theme.colors.onSurfaceVariant` | Secondary/muted text | Descriptions, labels, hints |
| `theme.colors.surfaceVariant` | Alternate surface color | Nested cards, sections |
| `theme.colors.primary` | Primary brand color | Buttons, links, active states |
| `theme.colors.onPrimary` | Text on primary color | Button text |
| `theme.colors.error` | Error states | Error messages, validation |
| `theme.colors.warning` | Warning states | Alerts, cautions |

## Common Patterns

### Form Card Pattern
```tsx
<Card style={{ backgroundColor: theme.colors.surface }}>
  <Card.Content>
    <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
      Form Title
    </Text>
    <TextInput
      label="Field Label"
      mode="outlined"
      // TextInput handles its own theming
    />
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
      Helper text
    </Text>
  </Card.Content>
</Card>
```

### List Item Pattern
```tsx
<List.Item
  title="Item Title"
  description="Item description"
  titleStyle={{ color: theme.colors.onSurface }}
  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
  style={{ backgroundColor: theme.colors.surface }}
  left={props => <List.Icon {...props} color={theme.colors.primary} icon="folder" />}
/>
```

### Modal Pattern
```tsx
<Portal>
  <Modal visible={visible} onDismiss={onDismiss}>
    <Surface style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
        Modal Title
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        Modal content
      </Text>
    </Surface>
  </Modal>
</Portal>
```

## Affected Screens in myHACCPapp

These screens were fixed using this pattern:
- **Self-inspection conduct screen** - Summary cards, issue cards
- **Add-issue screen** - All form cards
- **SignatureCapture component** - Modal and canvas area
- **Documents screen** - Document cards and lists
- **Internal audit screens** - Audit cards and forms

## Prevention Checklist

Before committing any UI changes:
- [ ] All Cards/Surfaces have explicit `backgroundColor: theme.colors.surface`
- [ ] All Text components have explicit color properties
- [ ] No opacity-based text styling (replace with `onSurfaceVariant`)
- [ ] No hardcoded colors in StyleSheets (except for specific brand/severity colors)
- [ ] Test in both light and dark modes
- [ ] Check accessibility with screen readers

## Quick Copy-Paste Fixes

### Fix a Card
```tsx
// Add to component
const theme = useTheme();

// Update Card
<Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
```

### Fix Text
```tsx
// Primary text
<Text style={{ color: theme.colors.onSurface }}>Primary</Text>

// Secondary text
<Text style={{ color: theme.colors.onSurfaceVariant }}>Secondary</Text>
```

### Fix a Surface
```tsx
<Surface style={[styles.surface, { backgroundColor: theme.colors.surface }]}>
```

## Testing for Contrast Issues

1. **Visual Test**: Switch between light/dark modes
2. **Debug Test**: Temporarily set `backgroundColor: 'red'` to see if content is visible
3. **Theme Test**: Log `theme.colors` to verify theme is loaded
4. **Accessibility Test**: Use device accessibility settings to test high contrast mode

## Related Issues

This pattern also fixes:
- Dark mode compatibility issues
- Theme switching problems
- Accessibility contrast failures
- Brand theming inconsistencies

## When to Break These Rules

Only use hardcoded colors for:
- Severity indicators (Critical = red, Warning = orange)
- Status badges (Success = green, Error = red)
- Brand-specific elements that must remain constant
- Data visualization (charts, graphs)

Always ensure sufficient contrast (WCAG AA standard: 4.5:1 for normal text, 3:1 for large text).

---

**Last Updated**: Documentation created after fixing white card issues across multiple screens
**Applies To**: React Native Paper v5.x with Material Design 3
**Project**: myHACCPapp - HACCP Management System