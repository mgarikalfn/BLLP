# Topic Test API - Quick Reference

## API Endpoint

```
GET /topics/:topicId/test?size=10
```

**Authentication:** Required (JWT token)

**Query Parameters:**
- `size` (optional): Number of questions (default: 10)

---

## Backend Controller

**File:** `src/modules/content/topic.controller.ts`

**Function:** `getTopicTest(req, res)`

**What it does:**
1. Extracts `topicId` from URL params
2. Gets sample size from query (default 10)
3. Queries MongoDB for questions where:
   - `topicId` matches
   - `intendedFor` is "TEST" or "BOTH"
4. Returns random sample of questions

**Response:**
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "count": 10,
  "questions": [
    {
      "_id": "...",
      "type": "MATCHING",
      "content": { ... }
    },
    {
      "_id": "...",
      "type": "CLOZE",
      "content": { ... }
    }
  ]
}
```

---

## Frontend API

**File:** `BLLP-frontend/api/topicTest.api.ts`

**Function:** `getTopicTest(topicId, size?)`

**What it does:**
1. Tries endpoint: `/topics/:topicId/test`
2. Falls back to: `/api/topics/:topicId/test`
3. Normalizes response format
4. Returns `TopicTestResponse`

**Usage:**
```typescript
const response = await getTopicTest("507f1f77bcf86cd799439011", 10);
```

---

## React Hook

**File:** `BLLP-frontend/hooks/useTopicTest.ts`

**Function:** `useTopicTest(topicId, size?)`

**What it does:**
- Wraps API call with React Query
- Caches for 5 minutes
- Provides loading/error/data states

**Usage:**
```typescript
const { data, isLoading, error } = useTopicTest(topicId);

if (isLoading) return <Spinner />;
if (error) return <Error />;

const questions = data?.questions || [];
```

---

## Question Types Sent

### MATCHING
```json
{
  "type": "MATCHING",
  "content": {
    "prompt": { "am": "...", "ao": "..." },
    "pairs": [
      { "left": "word1", "right": "word2" },
      { "left": "word3", "right": "word4" }
    ]
  }
}
```

### CLOZE
```json
{
  "type": "CLOZE",
  "content": {
    "textWithBlank": { "am": "_______ ነኝ።", "ao": "_______ dha." },
    "options": [
      { "am": "ደህና", "ao": "Nagaa" },
      { "am": "ሰላም", "ao": "Nagaa" }
    ],
    "correctIndex": 0
  }
}
```

---

## Data Flow

```
Frontend Component
    ↓
useTopicTest(topicId)
    ↓
getTopicTest(topicId)
    ↓
GET /topics/:topicId/test
    ↓
Backend Controller: getTopicTest()
    ↓
MongoDB Query:
  - Match topicId
  - Match intendedFor: ["TEST", "BOTH"]
  - Random sample (size: 10)
    ↓
Return TopicTestResponse
    ↓
Frontend: Normalize & Cache
    ↓
Component: Render Questions
```

---

## Key Points

✅ **Questions Included:**
- `intendedFor: "TEST"` - Test-only questions
- `intendedFor: "BOTH"` - Lesson + Test questions

❌ **Questions Excluded:**
- `intendedFor: "LESSON"` - Lesson-only questions
- `intendedFor: "TOPIC"` - Topic review questions

✅ **Caching:**
- 5-minute cache in React Query
- Reduces unnecessary API calls
- Cache key: `["topicTest", topicId, size]`

✅ **Error Handling:**
- 400: Invalid topic ID
- 404: Endpoint not found (tries fallback)
- 500: Server error

---

## Example Usage

### In Component

```typescript
import { useTopicTest } from "@/hooks/useTopicTest";

export default function TopicTestPage() {
  const { data, isLoading, error } = useTopicTest(topicId);

  if (isLoading) return <Loader />;
  if (error) return <Error message={error.message} />;

  const questions = data?.questions || [];

  return (
    <div>
      {questions.map((q) => (
        q.type === "MATCHING" ? (
          <MatchingQuestion key={q._id} question={q} />
        ) : (
          <ClozeQuestion key={q._id} question={q} />
        )
      ))}
    </div>
  );
}
```

### Direct API Call

```typescript
import { getTopicTest } from "@/api/topicTest.api";

const response = await getTopicTest("507f1f77bcf86cd799439011", 15);
console.log(response.count);      // 15
console.log(response.questions);  // Array of questions
```

---

## Response Structure

```typescript
interface TopicTestResponse {
  topicId: string;           // Topic being tested
  count: number;             // Number of questions
  questions: TopicTestQuestion[];
}

interface TopicTestQuestion {
  _id: string;
  topicId: string;
  type: "MATCHING" | "CLOZE";
  content: MatchingQuestionContent | TopicTestClozeContent;
  intendedFor?: "LESSON" | "TOPIC" | "BOTH" | "TEST";
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Files Involved

| File | Role |
|------|------|
| `src/modules/content/topic.controller.ts` | Backend logic |
| `src/modules/content/topic.routes.ts` | Route definition |
| `BLLP-frontend/api/topicTest.api.ts` | API wrapper |
| `BLLP-frontend/hooks/useTopicTest.ts` | React hook |
| `BLLP-frontend/app/(app)/test/[topicId]/page.tsx` | Component |

---

## Summary

**How it works:**
1. Frontend requests questions for a topic
2. Backend queries MongoDB for matching questions
3. Backend returns random sample (default 10)
4. Frontend caches response for 5 minutes
5. Component renders questions based on type

**Key endpoint:** `GET /topics/:topicId/test`

**Response:** `{ topicId, count, questions: [...] }`

**Question types:** MATCHING, CLOZE
