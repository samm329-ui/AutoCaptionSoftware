# Long-Term Development Guide for Your Video Editor

## The Core Problem

You're right - fixing one-by-one is NOT sustainable. Here's what you need to know:

---

## 1. The Single Source of Truth Rule

**Every piece of data should exist in ONE place only.**

```
❌ WRONG (Two-Brain Problem)
├── StateManager has: trackItemsMap
└── Zustand also has: trackItemsMap (mirror)
    └── Now you have to keep them in sync!

✅ RIGHT (Single Source)
├── Zustand has: trackItemsMap (only)
└── All components read from Zustand only
    └── No sync needed - one source of truth
```

**When adding new features:**
- Ask: "Where does this data live?"
- Answer: Should be ONE place only
- If both StateManager AND Zustand need it → design differently

---

## 2. The Action-Response Pattern

**Never modify state directly. Always use actions.**

```typescript
// ❌ WRONG - Direct modification
trackItemsMap[id].position.x = 100;
setState({ trackItemsMap });

// ✅ RIGHT - Through action
dispatch(EDIT_OBJECT, { payload: { [id]: { position: { x: 100 } } } });
```

**When adding new features:**
- Every data change = one action
- Actions should be: `addX()`, `updateY()`, `deleteZ()`
- Components call actions, never modify directly

---

## 3. The Defensive Coding Mindset

**Assume EVERY data access can fail.**

```typescript
// ❌ UNSAFE
const name = clip.name;
const x = clip.details.position.x;
const type = item.type;

// ✅ SAFE
const name = clip?.name ?? "Untitled";
const x = clip?.details?.position?.x ?? 0;
const type = item?.type ?? "video";
```

**Rules to live by:**
1. Every object access → use optional chaining `?.`
2. Every array access → check length first
3. Every JSON.parse → wrap in try/catch
4. Every function param → validate before use
5. Every API call → handle error case

---

## 4. The Feature Module Pattern

**Group related code together.**

```
src/features/editor/
├── features/
│   ├── captions/
│   │   ├── captions-store.ts      # All captions state
│   │   ├── captions-actions.ts     # addCaption, editCaption, etc.
│   │   ├── captions-panel.tsx     # UI panel
│   │   └── captions-utils.ts     # Helper functions
│   │
│   ├── transitions/
│   │   ├── transitions-store.ts
│   │   ├── transitions-actions.ts
│   │   ├── transitions-panel.tsx
│   │   └── transitions-utils.ts
│   │
│   └── effects/
│       ├── effects-store.ts
│       ├── effects-actions.ts
│       ├── effects-panel.tsx
│       └── effects-utils.ts
```

**When creating new feature:**
1. Create folder `src/features/editor/features/[feature-name]/`
2. Create dedicated store/actions for that feature
3. Don't mix with global use-store.ts
4. Keep related code together

---

## 5. The Hook Pattern for Events

**Create custom hooks for complex interactions.**

```typescript
// ❌ SCATTERED - Logic all over components
// project-panel.tsx
onDragStart={() => setDragData(...)}
// droppable.tsx
onDrop={() => handleDrop(...)}

// ✅ CENTRALIZED - Custom hook
// hooks/use-drag-and-drop.ts
export const useDragAndDrop = () => {
  const handleDragStart = (data) => { ... }
  const handleDrop = (data) => { ... }
  const handleDragEnd = () => { ... }
  
  return { handleDragStart, handleDrop, handleDragEnd };
}

// Now use in any component
const { handleDragStart, handleDrop } = useDragAndDrop();
```

**When adding complex interaction:**
1. Create custom hook
2. Keep all logic in one place
3. Return clean API to components
4. Makes debugging easier

---

## 6. The Error Boundary Strategy

**Wrap risky code with error boundaries.**

```typescript
// In a component that might crash
const RiskyComponent = () => {
  // Wrap in try-catch
  const [error, setError] = useState(null);
  
  useEffect(() => {
    try {
      // Risky operation
      const data = JSON.parse(input);
    } catch (err) {
      setError(err);
    }
  }, [input]);
  
  if (error) return <ErrorFallback />;
  
  return <NormalComponent />;
};
```

**Where to add error boundaries:**
- `droppable.tsx` - drag/drop can fail
- `effect-controls-panel.tsx` - accessing undefined clips
- `player.tsx` - playback can error
- Any component using external data

---

## 7. The Validation Layer

**Validate data at boundaries.**

```
User Input → Validate → Action → Store → UI
              ↑↑
           HERE
```

```typescript
// Create validator
const validateClip = (clip) => {
  const errors = [];
  
  if (!clip.id) errors.push("Missing id");
  if (!clip.type) errors.push("Missing type");
  if (!clip.details) errors.push("Missing details");
  if (typeof clip.details.width !== "number") errors.push("Invalid width");
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Use before dispatch
const handleAddClip = (clip) => {
  const { isValid, errors } = validateClip(clip);
  if (!isValid) {
    console.error("Invalid clip:", errors);
    return;
  }
  
  dispatch(ADD_VIDEO, { payload: clip });
};
```

**When adding new features:**
1. Define what valid data looks like
2. Validate BEFORE creating/changing
3. Log validation errors for debugging

---

## 8. The Logging Strategy

**Log at key points for debugging.**

```typescript
// Log ALL dispatches
import { dispatch } from "@designcombo/events";

const originalDispatch = dispatch;
dispatch = (type, payload) => {
  console.log(`[DISPATCH] ${type}`, payload);
  return originalDispatch(type, payload);
};

// Log ALL state changes
const useStore = create((set, get) => ({
  setState: async (patch) => {
    console.log(`[ZUSTAND] setState`, patch);
    return set(patch);
  },
}));
```

**Why:** When errors happen, you can trace exactly what happened.

---

## 9. The Test Checklist

**Before adding any feature, verify:**

- [ ] Does data have single source of truth?
- [ ] Are there optional chains on all accesses?
- [ ] Is JSON.parse wrapped in try/catch?
- [ ] Are props validated before use?
- [ ] Is error boundary in place?
- [ ] Are there console logs for debugging?
- [ ] Does it work when data is empty?
- [ ] Does it work when data is partial?

---

## 10. When to Refactor

**Signs it's time to restructure:**

| Sign | What It Means |
|------|---------------|
| Fixing same issue in multiple files | Code is duplicated → extract to shared |
| New feature breaks old features | Coupling too tight → separate concerns |
| Can't trace where data comes from | No clear architecture → add structure |
| Adding one thing breaks three others | Fragile system → needs boundaries |
| File has 500+ lines | Too big → split into modules |

---

## Summary: The Necessary Mindset

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT PRINCIPLES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SINGLE SOURCE    → One place for each data                │
│  2. ACTION-BASED     → Never modify directly                   │
│  3. DEFENSIVE        → Always assume failure                    │
│  4. MODULAR          → Group related code                       │
│  5. HOOKS            → Centralize complex logic                │
│  6. BOUNDARIES       → Wrap risky code                          │
│  7. VALIDATE         → Check data at boundaries                │
│  8. LOG              → Debug with logs                         │
│  9. TEST             → Verify before ship                      │
│  10. REFACTOR        → Restructure when needed                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Apply these principles** to any new feature
2. **Add logging** to trace current issues
3. **Create validation layer** for common operations
4. **Consider migrating** to single-brain over time

This approach will make the codebase maintainable even as it grows more complex.
